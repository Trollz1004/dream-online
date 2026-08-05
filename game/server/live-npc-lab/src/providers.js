const PROVIDER_NAMES = Object.freeze({
  mock: "mock",
  openai: "openai",
  "1min-ai": "1min-ai",
  "ollama-local": "ollama-local"
});

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
  [PROVIDER_NAMES["1min-ai"], disabledProvider(PROVIDER_NAMES["1min-ai"])],
  [PROVIDER_NAMES["ollama-local"], disabledProvider(PROVIDER_NAMES["ollama-local"])]
]);

export function listProviders() {
  return [...providers.values()].map(({ name, enabled }) => ({ name, enabled }));
}

export function getProvider(name = PROVIDER_NAMES.mock) {
  const normalized = String(name).trim().toLowerCase();
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
