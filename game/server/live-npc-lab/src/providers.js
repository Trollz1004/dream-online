const PROVIDER_NAMES = Object.freeze({
  mock: "mock",
  openai: "openai",
  "1min-ai": "1min-ai",
  "ollama-local": "ollama-local",
  hermes: "hermes"
});

const APPROVED_ACTION_TYPES = new Set([
  "suggest_hint",
  "suggest_marker",
  "suggest_event_pause",
  "suggest_quest_note"
]);

function disabledProvider(name) {
  return Object.freeze({
    name,
    enabled: false,
    async generateDialogue() {
      throw Object.assign(new Error(`${name} provider is not configured`), {
        code: "PROVIDER_DISABLED",
        provider: name
      });
    }
  });
}

function providerError(message, code, detail = {}) {
  return Object.assign(new Error(message), { code, ...detail });
}

function providerTimeoutError() {
  return providerError("provider_timeout", "PROVIDER_TIMEOUT");
}

function safeRecentMemory(recentMemory) {
  if (!Array.isArray(recentMemory)) return [];

  return recentMemory
    .slice(-10)
    .map((entry) => String(entry).slice(0, 400));
}

function webhookPayload(context) {
  return {
    npcId: String(context?.npcId || "").slice(0, 80),
    playerId: String(context?.playerId || "").slice(0, 80),
    zone: String(context?.worldState?.zone || "unknown").slice(0, 120),
    recentMemory: safeRecentMemory(context?.recentMemory),
    prompt: String(context?.message || "").slice(0, 2000)
  };
}

function filterProposedActions(proposedActions) {
  if (!Array.isArray(proposedActions)) return [];

  return proposedActions.filter((action) => (
    action
    && typeof action === "object"
    && APPROVED_ACTION_TYPES.has(action.type)
  ));
}

export function createHermesWebhookProvider({
  url,
  timeoutMs = 2500,
  fetch = globalThis.fetch
} = {}) {
  const endpoint = String(url || "").trim();
  if (!endpoint) return disabledProvider(PROVIDER_NAMES.hermes);

  return Object.freeze({
    name: PROVIDER_NAMES.hermes,
    enabled: true,
    async generateDialogue({ context }) {
      if (typeof fetch !== "function") {
        throw providerError("Hermes webhook fetch is unavailable", "PROVIDER_UNAVAILABLE");
      }

      const controller = new AbortController();
      let timedOut = false;
      let timer;
      try {
        const response = await Promise.race([
          Promise.resolve(fetch(endpoint, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(webhookPayload(context)),
            signal: controller.signal
          })),
          new Promise((_, reject) => {
            timer = setTimeout(() => {
              timedOut = true;
              controller.abort();
              reject(providerTimeoutError());
            }, timeoutMs);
          })
        ]);

        if (!response?.ok) {
          throw providerError("Hermes webhook returned an error", "PROVIDER_HTTP_ERROR", {
            statusCode: Number(response?.status)
          });
        }

        let candidate;
        try {
          candidate = await response.json();
        } catch {
          throw providerError("Hermes webhook returned invalid JSON", "PROVIDER_INVALID_RESPONSE");
        }

        if (!candidate || typeof candidate !== "object" || typeof candidate.reply !== "string") {
          throw providerError("Hermes webhook returned an invalid dialogue response", "PROVIDER_INVALID_RESPONSE");
        }

        return {
          reply: candidate.reply.trim().slice(0, 400),
          proposedActions: filterProposedActions(candidate.proposedActions)
        };
      } catch (error) {
        if (timedOut || error?.name === "AbortError") {
          throw providerTimeoutError();
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }
  });
}

function configuredHermesProvider() {
  const cloudEnabled = process.env.DREAM_ENABLE_CLOUD_AI === "1";
  const url = String(process.env.NPC_HERMES_WEBHOOK_URL || "").trim();

  if (!cloudEnabled || !url) return disabledProvider(PROVIDER_NAMES.hermes);
  return createHermesWebhookProvider({ url });
}

export function createOneMinAiProvider({
  apiKey,
  url = "https://api.1min.ai/api/v1/oneai/chat",
  model = "gemini-2.5-flash",
  timeoutMs = 2500,
  fetch = globalThis.fetch
} = {}) {
  const token = String(apiKey || "").trim();
  const endpoint = String(url || "").trim();
  const modelId = String(model || "gemini-2.5-flash").trim();
  if (!token || !endpoint) return disabledProvider(PROVIDER_NAMES["1min-ai"]);

  return Object.freeze({
    name: PROVIDER_NAMES["1min-ai"],
    enabled: true,
    model: modelId,
    async generateDialogue({ context }) {
      if (typeof fetch !== "function") {
        throw providerError("1min-ai fetch is unavailable", "PROVIDER_UNAVAILABLE");
      }

      const payload = webhookPayload(context);
      const npcPrompt = [
        `[DREAM ONLINE Live NPC Dialogue]`,
        `NPC: ${payload.npcId} | Zone: ${payload.zone} | Player: ${payload.playerId}`,
        payload.recentMemory.length ? `Recent Memory: ${payload.recentMemory.join(" | ")}` : "",
        `Player says: ${payload.prompt}`,
        `Respond in-character in 1-2 short sentences (max 350 chars).`
      ].filter(Boolean).join("\n");

      const controller = new AbortController();
      let timedOut = false;
      let timer;
      try {
        const response = await Promise.race([
          Promise.resolve(fetch(endpoint, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "Authorization": `Bearer ${token}`,
              "API-KEY": token
            },
            body: JSON.stringify({
              type: "chat",
              model: modelId,
              promptObject: {
                prompt: npcPrompt,
                settings: {},
                attachments: {}
              }
            }),
            signal: controller.signal
          })),
          new Promise((_, reject) => {
            timer = setTimeout(() => {
              timedOut = true;
              controller.abort();
              reject(providerTimeoutError());
            }, timeoutMs);
          })
        ]);

        if (!response?.ok) {
          throw providerError("1min-ai returned an HTTP error", "PROVIDER_HTTP_ERROR", {
            statusCode: Number(response?.status)
          });
        }

        let candidate;
        try {
          candidate = await response.json();
        } catch {
          throw providerError("1min-ai returned invalid JSON", "PROVIDER_INVALID_RESPONSE");
        }

        const rawReply =
          candidate?.reply ??
          candidate?.aiRecord?.aiRecordDetail?.resultObject?.[0] ??
          candidate?.resultObject?.[0] ??
          candidate?.data?.reply ??
          candidate?.choices?.[0]?.message?.content;

        if (typeof rawReply !== "string" || !rawReply.trim()) {
          throw providerError("1min-ai returned an empty dialogue response", "PROVIDER_INVALID_RESPONSE");
        }

        return {
          reply: rawReply.trim().slice(0, 400),
          proposedActions: filterProposedActions(candidate?.proposedActions)
        };
      } catch (error) {
        if (timedOut || error?.name === "AbortError") {
          throw providerTimeoutError();
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }
  });
}

function configuredOneMinAiProvider() {
  const cloudEnabled = process.env.DREAM_ENABLE_CLOUD_AI === "1";
  const apiKey = String(
    process.env.ONEMINAI_API_KEY || process.env.ONEMIN_API_KEY || ""
  ).trim();
  const url = String(
    process.env.NPC_1MINAI_API_URL || "https://api.1min.ai/api/v1/oneai/chat"
  ).trim();
  const model = String(
    process.env.NPC_1MINAI_MODEL || "gemini-2.5-flash"
  ).trim();

  if (!cloudEnabled || !apiKey) return disabledProvider(PROVIDER_NAMES["1min-ai"]);
  return createOneMinAiProvider({ apiKey, url, model });
}

const providers = new Map([
  [PROVIDER_NAMES.mock, Object.freeze({
    name: PROVIDER_NAMES.mock,
    enabled: true,
    async generateDialogue(request) {
      const zone = String(request?.context?.worldState?.zone || "this area").slice(0, 120);
      return {
        reply: `Local guide is tracking ${zone}. Continue with the next visible step.`,
        proposedActions: [{
          type: "suggest_hint",
          label: "Continue the local first-playable step."
        }]
      };
    }
  })],
  [PROVIDER_NAMES.openai, disabledProvider(PROVIDER_NAMES.openai)],
  [PROVIDER_NAMES["ollama-local"], disabledProvider(PROVIDER_NAMES["ollama-local"])]
]);

export function listProviders() {
  return [
    providers.get(PROVIDER_NAMES.mock),
    providers.get(PROVIDER_NAMES.openai),
    configuredOneMinAiProvider(),
    providers.get(PROVIDER_NAMES["ollama-local"]),
    configuredHermesProvider()
  ].map(({ name, enabled }) => ({ name, enabled }));
}

export function getProvider(name = PROVIDER_NAMES.mock) {
  const normalized = String(name).trim().toLowerCase();
  if (normalized === PROVIDER_NAMES.hermes) {
    return configuredHermesProvider();
  }
  if (normalized === PROVIDER_NAMES["1min-ai"]) {
    return configuredOneMinAiProvider();
  }

  const provider = providers.get(normalized);

  if (!provider) {
    throw Object.assign(new Error(`Unknown provider: ${normalized}`), {
      code: "UNKNOWN_PROVIDER",
      provider: normalized
    });
  }

  return provider;
}

export function createProviderCall(name) {
  const provider = getProvider(name);
  return (context, route) => provider.generateDialogue({ context, route });
}

export { PROVIDER_NAMES };
