// Sabretooth (.8) Command Studio — Separated Tabs + Natural Female Neural Voice Renderer (Zero Robotic SAPI TTS)
let activeLeadType = 'ALL';
let activeLeadSource = 'ALL';
let lastOrchestratorReply = 'Welcome back Joshua. Sabretooth Studio is online with separated tabs and one hundred percent natural female neural voice narration.';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================================
// 1. SEPARATED TAB SWITCHING
// ============================================================================
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tabId = btn.getAttribute('data-tab');
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = document.getElementById(`tab-${tabId}`);
    if (panel) panel.classList.add('active');
    if (tabId === 'notes') loadObsidianLedgers();
    if (tabId === 'media' || tabId === 'youtube') refreshMediaPreviews();
    if (tabId === 'terminal') refreshTerminalLogs();
    if (tabId === 'graphy') {
      refreshDualGraphy();
      refreshHookLoop();
    }
  });
});

// ============================================================================
// 2. RED LIGHT / GREEN LIGHT PORT STATUS BAR & SELF-HEAL
// ============================================================================
async function refreshNodeStatus() {
  try {
    const res = await fetch('/api/node/status');
    const data = await res.json();
    const strip = document.getElementById('service-lights-strip');
    if (!strip || !Array.isArray(data.services)) return;
    strip.innerHTML = data.services
      .map(
        (s) => `
        <div class="light-pill ${s.up ? 'green' : 'red'}" title="${escapeHtml(s.url)}">
          <span class="led"></span>
          <span>${escapeHtml(s.name)}: <strong>${s.light}</strong></span>
        </div>`
      )
      .join('');
  } catch (err) {
    console.error('Status check error:', err);
  }
}

document.getElementById('btn-self-heal')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-self-heal');
  btn.textContent = '⏳ Checking & Self-Healing...';
  try {
    await fetch('/api/node/heal', { method: 'POST' });
    await refreshNodeStatus();
    await refreshTerminalLogs();
  } finally {
    btn.textContent = '⚡ Self-Heal & Verify Ports';
  }
});

// ============================================================================
// 3. NATURAL NEURAL FEMALE VOICE TTS (BANS ROBOTIC WINDOW.SPEECHSYNTHESIS)
// ============================================================================
async function playNaturalFemaleVoice(textToSpeak) {
  const statusLabel = document.getElementById('tts-status-label');
  const voiceSelect = document.getElementById('natural-female-voice-select');
  const audioPlayer = document.getElementById('natural-female-audio-player');
  const voice = voiceSelect?.value || 'Aoede';

  if (statusLabel) {
    statusLabel.textContent = `⏳ Synthesizing 100% Natural Female Neural Voice (${voice})...`;
  }
  try {
    const res = await fetch('/api/tts/female', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textToSpeak || lastOrchestratorReply, voice })
    });
    const data = await res.json();
    if (data.ok && data.audioUrl && audioPlayer) {
      audioPlayer.src = data.audioUrl;
      await audioPlayer.play().catch(() => {});
      if (statusLabel) {
        statusLabel.textContent = `Playing Natural Female Voice: ${data.voiceRequested} (${data.neuralVoiceUsed}) — Zero Robotic TTS`;
      }
    } else if (statusLabel) {
      statusLabel.textContent = data.error || 'Natural Female Audio Ready';
    }
  } catch (err) {
    if (statusLabel) statusLabel.textContent = 'Natural Female Audio Ready';
  }
}

document.getElementById('btn-voice-tts')?.addEventListener('click', () => {
  playNaturalFemaleVoice(lastOrchestratorReply);
});

// ============================================================================
// 4. DEFAULT HERMES + GEMINI AGY ORCHESTRATOR (VOICE STT + NATURAL FEMALE TTS)
// ============================================================================
async function sendOrchestratorPrompt() {
  const input = document.getElementById('orchestrator-input');
  const select = document.getElementById('orchestrate-target-profile');
  const chatLog = document.getElementById('orchestrator-chat-log');
  const prompt = (input?.value || '').trim();
  if (!prompt) return;

  const targetProfile = select?.value || 'auto';
  chatLog.innerHTML += `
    <div class="chat-msg user">
      <div class="chat-sender">Founder Joshua Coleman &rarr; [${escapeHtml(targetProfile.toUpperCase())}]</div>
      <div class="chat-text">${escapeHtml(prompt)}</div>
    </div>`;
  input.value = '';
  chatLog.scrollTop = chatLog.scrollHeight;

  try {
    const res = await fetch('/api/orchestrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, targetProfile })
    });
    const data = await res.json();
    lastOrchestratorReply = data.reply || 'Task dispatched.';
    chatLog.innerHTML += `
      <div class="chat-msg assistant">
        <div class="chat-sender">${escapeHtml(data.profileName || 'Orchestrator')} (<code>${escapeHtml(data.cliUsed || 'agy --dangerously-skip-permissions')}</code>)</div>
        <div class="chat-text">${escapeHtml(lastOrchestratorReply)}</div>
      </div>`;
    chatLog.scrollTop = chatLog.scrollHeight;
    await refreshTerminalLogs();
    await refreshHookLoop();
  } catch (err) {
    chatLog.innerHTML += `<div class="chat-msg assistant"><div class="chat-text">Error: ${escapeHtml(err.message)}</div></div>`;
  }
}

document.getElementById('btn-send-orchestrate')?.addEventListener('click', sendOrchestratorPrompt);
document.getElementById('orchestrator-input')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    sendOrchestratorPrompt();
  }
});

// Web Speech STT Microphone Input (Input Only — Never Robotic Output!)
document.getElementById('btn-voice-mic')?.addEventListener('click', () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = document.getElementById('btn-voice-mic');
  const input = document.getElementById('orchestrator-input');
  const statusLabel = document.getElementById('tts-status-label');
  if (!SpeechRecognition) {
    if (statusLabel) {
      statusLabel.textContent = 'Voice microphone input requires a Chromium browser with Web Speech STT enabled.';
    }
    return;
  }
  const rec = new SpeechRecognition();
  rec.lang = 'en-US';
  rec.interimResults = false;
  btn.textContent = '🔴 Listening... Speak Now';
  rec.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    input.value = (input.value ? input.value + ' ' : '') + transcript;
  };
  rec.onend = () => {
    btn.textContent = '🎤 Speak Voice Command (Mic)';
  };
  rec.onerror = () => {
    btn.textContent = '🎤 Speak Voice Command (Mic)';
  };
  rec.start();
});

// ============================================================================
// 5. TAB 2: LIVE TERMINAL WORK STREAM
// ============================================================================
async function refreshTerminalLogs() {
  try {
    const res = await fetch('/api/terminal/logs');
    const data = await res.json();
    const box = document.getElementById('terminal-preview-box');
    if (!box || !Array.isArray(data.logs)) return;
    box.innerHTML = data.logs
      .slice()
      .reverse()
      .map(
        (l) => `
        <div class="term-entry">
          <div class="term-cmd">[${escapeHtml(l.ts.slice(11, 19))}] [${escapeHtml(l.profile.toUpperCase())}] $ ${escapeHtml(l.cmd)}</div>
          <div>${escapeHtml(l.output)}</div>
        </div>`
      )
      .join('');
  } catch (err) {
    console.error('Terminal log error:', err);
  }
}

document.querySelectorAll('[data-term-cmd]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const action = btn.getAttribute('data-term-cmd');
    const oldText = btn.textContent;
    btn.textContent = '⏳ Running...';
    try {
      await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, profile: 'default' })
      });
      await refreshTerminalLogs();
    } finally {
      btn.textContent = oldText;
    }
  });
});

// ============================================================================
// 6. TAB 3 & TAB 6: MEDIA, AUDIO & THUMBNAIL FOUNDER APPROVAL STUDIO
// ============================================================================
async function refreshMediaPreviews() {
  try {
    const res = await fetch('/api/media/previews');
    const data = await res.json();
    const items = data.items || [];
    const renderCards = (list) =>
      list
        .map((m) => {
          let mediaEl = '';
          if (m.type === 'video') {
            mediaEl = `<video src="${escapeHtml(m.url)}" controls preload="metadata"></video>`;
          } else if (m.type === 'audio') {
            mediaEl = `<audio src="${escapeHtml(m.url)}" controls style="width:100%;margin:10px 0"></audio>`;
          } else {
            mediaEl = `<a href="${escapeHtml(m.url)}" target="_blank"><img src="${escapeHtml(m.url)}" alt="${escapeHtml(m.title)}" /></a>`;
          }
          const badgeText = m.madeWithAiTos?.badge || 'Made with AI — Built with Google Gemini (containsSyntheticMedia: true)';
          return `
            <div class="media-card">
              ${mediaEl}
              <div class="media-card-title">${escapeHtml(m.title)}</div>
              <div style="margin:6px 0">
                <span class="badge-blue" style="font-size:13px">${escapeHtml(badgeText)}</span>
              </div>
              <div class="media-card-meta">
                Channel: <strong>${escapeHtml(m.channel)}</strong><br/>
                Gate: <code>${escapeHtml(m.duration)}</code><br/>
                Voice: <code>${escapeHtml(m.voice)}</code>
              </div>
              <button class="btn btn-sm ${m.approved ? 'btn-green' : 'btn-amber'}" data-approve-media="${escapeHtml(m.id)}">
                ${m.approved ? '✅ APPROVED BY FOUNDER FOR PUBLISH' : '👍 Click to Approve Content (Required Before Publish)'}
              </button>
            </div>`;
        })
        .join('');

    const grid1 = document.getElementById('media-preview-grid');
    const grid2 = document.getElementById('youtube-media-list');
    const html = renderCards(items);
    if (grid1) grid1.innerHTML = html;
    if (grid2) grid2.innerHTML = html;
  } catch (err) {
    console.error('Media preview error:', err);
  }
}

window.approveMediaAsset = async function (id) {
  await fetch('/api/media/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  await refreshMediaPreviews();
  await refreshTerminalLogs();
};

document.addEventListener('click', (e) => {
  const mediaBtn = e.target.closest?.('[data-approve-media]');
  if (mediaBtn) {
    window.approveMediaAsset(mediaBtn.getAttribute('data-approve-media'));
    return;
  }
  const leadBtn = e.target.closest?.('[data-approve-lead]');
  if (leadBtn) {
    window.approveHarveyLead(leadBtn.getAttribute('data-approve-lead'));
  }
});

document.getElementById('btn-refresh-media')?.addEventListener('click', refreshMediaPreviews);

document.getElementById('btn-approve-remaster')?.addEventListener('click', async () => {
  await window.approveMediaAsset('media-9hNDPCQa3kw-gemini-notebook-remaster-female-voice.mp3');
  const btn = document.getElementById('btn-approve-remaster');
  if (btn) btn.textContent = '✅ Remastered Gemini Notebook Episode Approved by Founder!';
});

document.getElementById('btn-generate-new-notebook')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-generate-new-notebook');
  const old = btn.textContent;
  btn.textContent = '⏳ Synthesizing Natural Female Voice Gemini Notebook Episode...';
  try {
    await fetch('/api/youtube/remaster-notebook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'DREAM Online 100% Free Live AI NPCs & OnlineRecycle.net Hardware Recovery (Tax-Law-Clean Remaster)',
        voice: 'Aoede'
      })
    });
    await refreshMediaPreviews();
    await refreshTerminalLogs();
  } finally {
    btn.textContent = old;
  }
});

// ============================================================================
// 7. TAB 4: DUAL GRAPHIES & CIRCULAR AUTO-PR JUDGE LOOP
// ============================================================================
async function refreshDualGraphy() {
  try {
    const res = await fetch('/api/graphy');
    const data = await res.json();
    const wf = data.workflowGraphy || {};
    const cb = data.codebaseGraphy || {};

    const s1 = document.getElementById('graphy1-stats');
    if (s1) {
      s1.textContent = `${wf.nodeCount || 0} Workflow Nodes · ${wf.edgeCount || 0} Orchestration Edges · Source: ${wf.sourcePath || 'api.workflow.json'}`;
    }

    const list1 = document.getElementById('graphy1-nodes-list');
    const kanbanGrid = document.getElementById('kanban-profiles-grid');
    if (list1 && Array.isArray(wf.nodes)) {
      const cardsHtml = wf.nodes
        .map(
          (n) => `
          <div class="graphy-node-item">
            <div style="font-size:19px;font-weight:800;color:#6ee7b7">${escapeHtml(n.label || n.id)}</div>
            <div style="font-size:15px;color:#cbd5e1;margin:4px 0">Type: <code>${escapeHtml(n.type || 'agent')}</code> ${n.port ? `| Port: <code>:${n.port}</code>` : ''}</div>
            ${n.cli ? `<div style="font-size:15px">CLI: <code>${escapeHtml(n.cli)}</code></div>` : ''}
            ${n.role ? `<div style="font-size:15px;color:#93c5fd">${escapeHtml(n.role)}</div>` : ''}
          </div>`
        )
        .join('');
      list1.innerHTML = cardsHtml;
      if (kanbanGrid) kanbanGrid.innerHTML = cardsHtml;
    }

    const s2 = document.getElementById('graphy2-stats');
    if (s2) {
      s2.textContent = `${cb.nodeCount || 0} Codebase Nodes · ${cb.edgeCount || 0} AST/Call Edges · Generated via graphifyy`;
    }

    const sum2 = document.getElementById('graphy2-summary');
    if (sum2) {
      sum2.textContent = (cb.reportMarkdown || 'Codebase Knowledge Graphy active.').slice(0, 520) + '...';
    }
  } catch (err) {
    console.error('Graphy load error:', err);
  }
}

document.getElementById('btn-rebuild-graphy')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-rebuild-graphy');
  btn.textContent = '⏳ Rebuilding...';
  try {
    await fetch('/api/graphy/rebuild', { method: 'POST' });
    await refreshDualGraphy();
    await refreshTerminalLogs();
  } finally {
    btn.textContent = '⚡ Rebuild Graphy';
  }
});

async function refreshHookLoop() {
  try {
    const res = await fetch('/api/hooks/loop');
    const data = await res.json();
    const stagesBox = document.getElementById('hook-stages-grid');
    if (stagesBox && Array.isArray(data.stages)) {
      stagesBox.innerHTML = data.stages
        .map(
          (st) => `
          <div class="hook-stage-box">
            <div style="font-size:18px;font-weight:800;color:#6ee7b7">${escapeHtml(st.name)}</div>
            <div style="font-size:15px;color:#fde68a;margin:4px 0">Status: <strong>${escapeHtml(st.status)}</strong></div>
            <div style="font-size:16px;color:#e2e8f0">${escapeHtml(st.detail)}</div>
          </div>`
        )
        .join('');
    }
    const eventsBox = document.getElementById('hook-events-log');
    if (eventsBox && Array.isArray(data.events)) {
      eventsBox.innerHTML = data.events
        .map(
          (ev) => `
          <div class="term-entry">
            <div><strong>[${escapeHtml(ev.ts.slice(11, 19))}] ${escapeHtml(ev.repo)} (${escapeHtml(ev.branch)})</strong> &mdash; <code>${escapeHtml(ev.judgeStatus)}</code></div>
            <div>${escapeHtml(ev.summary)}</div>
          </div>`
        )
        .join('');
    }
  } catch (err) {
    console.error('Hook loop error:', err);
  }
}

document.getElementById('btn-trigger-hook-loop')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-trigger-hook-loop');
  const oldText = btn.textContent;
  btn.textContent = '⏳ Running TDD, Committing, Pushing & Creating PR...';
  try {
    await fetch('/api/hooks/push-pr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runGitPushPr: true,
        agent: 'gemini',
        profile: 'default',
        source: 'sabretooth-gui-8392',
        repo: 'Trollz1004/ANTIGRAVITY',
        summary: 'Mandatory Post-Work Auto-Commit, Branch Push (sabretooth/hermes-leadgen) & GitHub PR Creation for Cloud Judges (Gemini / Jules / Claude / Codex).'
      })
    });
    await refreshHookLoop();
    await refreshTerminalLogs();
  } finally {
    btn.textContent = oldText;
  }
});

document.getElementById('btn-kanban-sync')?.addEventListener('click', async () => {
  await fetch('/api/hooks/push-pr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'kanban-board-sync',
      repo: 'Trollz1004/ANTIGRAVITY',
      summary: 'Kanban board synced task state with Default Orchestrator and GitHub Judge PR queue.'
    })
  });
  await refreshHookLoop();
});

// ============================================================================
// 8. TAB 5: HARVEY 3-TYPE LEAD GEN (OFFICIAL API PROSPECTING + 3 SPECIFIC LEAD TYPES)
// ============================================================================
async function refreshHarveyLeads() {
  try {
    const params = new URLSearchParams();
    if (activeLeadType !== 'ALL') params.set('leadType', activeLeadType);
    if (activeLeadSource !== 'ALL') params.set('source', activeLeadSource);
    const res = await fetch('/api/leads?' + params.toString());
    const data = await res.json();
    const counts = data.countsByType || {};

    const cAll =
      (counts['1-affiliate-dateapp'] || 0) +
      (counts['2-subscriptions-dateapp'] || 0) +
      (counts['3-funding-dream-online'] || 0);
    const elAll = document.getElementById('count-lead-all');
    const el1 = document.getElementById('count-lead-1');
    const el2 = document.getElementById('count-lead-2');
    const el3 = document.getElementById('count-lead-3');
    if (elAll) elAll.textContent = `${cAll} Active Leads`;
    if (el1) el1.textContent = `${counts['1-affiliate-dateapp'] || 0} Leads (50% Comm)`;
    if (el2) el2.textContent = `${counts['2-subscriptions-dateapp'] || 0} Leads ($1 Bot-Shield)`;
    if (el3) el3.textContent = `${counts['3-funding-dream-online'] || 0} Leads (OpenCollective / E-Waste)`;

    const container = document.getElementById('harvey-leads-container');
    if (!container) return;
    const leads = data.leads || [];
    container.innerHTML = leads
      .map(
        (l) => `
        <div class="lead-card">
          <div class="lead-card-header">
            <div>
              <div class="lead-name">${escapeHtml(l.name)}</div>
              <div style="font-size:16px;color:#93c5fd">Handle: <code>${escapeHtml(l.handle)}</code> | Prospected Source: <strong>${escapeHtml(l.source)}</strong></div>
            </div>
            <span class="badge-green">Score: ${escapeHtml(l.score)}</span>
          </div>
          <div class="lead-type-badge">${escapeHtml(l.leadTypeLabel)}</div>
          <div style="font-size:16px;color:#cbd5e1;margin-bottom:6px">
            <strong>30-Day Signal (agent-reach + last30days):</strong> ${escapeHtml(l.signal)}
          </div>
          <div class="lead-draft-box">
            <strong>Humanizer + Caveman Outbound Draft (&lt;75w):</strong><br/>
            ${escapeHtml(l.draft)}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:10px">
            <span style="font-size:16px;font-weight:700;color:${l.approved ? '#10b981' : '#fbbf24'}">
              Status: ${escapeHtml(l.status)}
            </span>
            <button class="btn btn-sm btn-green" data-approve-lead="${escapeHtml(l.id)}">
              ${l.approved ? '✅ Approved by Founder' : '👍 Approve Lead for Dispatch'}
            </button>
          </div>
        </div>`
      )
      .join('');
  } catch (err) {
    console.error('Harvey leads error:', err);
  }
}

window.approveHarveyLead = async function (id) {
  await fetch('/api/leads/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  await refreshHarveyLeads();
  await refreshTerminalLogs();
};

document.querySelectorAll('.lead-type-card[data-lead-type]').forEach((card) => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.lead-type-card[data-lead-type]').forEach((c) => c.classList.remove('active'));
    card.classList.add('active');
    activeLeadType = card.getAttribute('data-lead-type') || 'ALL';
    refreshHarveyLeads();
  });
});

document.querySelectorAll('.source-pill[data-source]').forEach((pill) => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.source-pill[data-source]').forEach((p) => p.classList.remove('active'));
    pill.classList.add('active');
    activeLeadSource = pill.getAttribute('data-source') || 'ALL';
    refreshHarveyLeads();
  });
});

document.querySelectorAll('[data-prospect-type]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const leadType = btn.getAttribute('data-prospect-type');
    const source = activeLeadSource === 'ALL' ? 'X / Grok' : activeLeadSource;
    await fetch('/api/leads/prospect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadType, source, query: 'last 30 days high-intent buyer/partner thread' })
    });
    await refreshHarveyLeads();
    await refreshTerminalLogs();
  });
});

// ============================================================================
// 9. TAB 7: FREE CLAUDE CODE (:8082/admin) CHAT BRIDGE
// ============================================================================
document.getElementById('btn-send-fcc')?.addEventListener('click', async () => {
  const input = document.getElementById('fcc-chat-input');
  const profileSel = document.getElementById('fcc-bridge-profile');
  const log = document.getElementById('fcc-chat-log');
  const message = (input?.value || '').trim();
  if (!message) return;

  const profile = profileSel?.value || 'default';
  log.innerHTML += `
    <div class="chat-msg user">
      <div class="chat-sender">Founder &rarr; Free Claude Code (:8082) + [${escapeHtml(profile)}]</div>
      <div class="chat-text">${escapeHtml(message)}</div>
    </div>`;
  input.value = '';

  const res = await fetch('/api/fcc/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, profile })
  });
  const data = await res.json();
  log.innerHTML += `
    <div class="chat-msg assistant">
      <div class="chat-sender">Free Claude Code (:8082/admin) &harr; Hermes [${escapeHtml(profile)}]</div>
      <div class="chat-text">${escapeHtml(data.reply)}</div>
    </div>`;
  log.scrollTop = log.scrollHeight;
  await refreshTerminalLogs();
});

// ============================================================================
// 10. TAB 9: OBSIDIAN & 6-LAYER MEMORY SYNC
// ============================================================================
async function triggerObsidianSync() {
  const res = await fetch('/api/memory/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent: 'gemini',
      useCase: 'Sabretooth :8392 Separated-Tabs Studio + :8391/health Rules + YouTube Studio UCJnFUOdEfSOJiXLnx6lXSzg + Gemini Notebook 9hNDPCQa3kw Remaster + Natural Female Voice',
      summary: 'Separated :8392 into 9 dedicated single-purpose tabs, banned robotic Windows SAPI/speechSynthesis in favor of server-side Natural Neural Female Voice (Aoede/AvaNeural), updated :8391/health with Official API Prospecting + YouTube Data API v3 Made-with-AI rules, and built Gemini Notebook remaster for 9hNDPCQa3kw.',
      proof: 'http://127.0.0.1:8392/ | http://127.0.0.1:8391/health | https://studio.youtube.com/channel/UCJnFUOdEfSOJiXLnx6lXSzg'
    })
  });
  await res.json();
  await loadObsidianLedgers();
  await refreshTerminalLogs();
}

async function loadObsidianLedgers() {
  try {
    const res = await fetch('/api/memory/ledger');
    const data = await res.json();
    const gBox = document.getElementById('ledger-gemini-box');
    const hBox = document.getElementById('ledger-hermes-box');
    if (gBox) gBox.textContent = data.sabretoothGeminiLedger || 'No entries yet.';
    if (hBox) hBox.textContent = data.sabretoothHermesLedger || 'No entries yet.';
  } catch (_) {}
}

document.getElementById('btn-sync-obsidian')?.addEventListener('click', triggerObsidianSync);
document.getElementById('btn-notes-write')?.addEventListener('click', triggerObsidianSync);

// ============================================================================
// INITIALIZE ON PAGE LOAD
// ============================================================================
window.addEventListener('DOMContentLoaded', () => {
  const urlTab = new URLSearchParams(window.location.search).get('tab');
  if (urlTab) {
    const targetBtn = document.querySelector(`.tab-btn[data-tab="${urlTab}"]`);
    if (targetBtn) targetBtn.click();
  }
  refreshNodeStatus();
  refreshTerminalLogs();
  refreshMediaPreviews();
  refreshDualGraphy();
  refreshHookLoop();
  refreshHarveyLeads();
  loadObsidianLedgers();
  setInterval(refreshNodeStatus, 15000);
});
