# Ollama-Local Adapter

Paperclip alias: `ollama-local`

CLI: `opencode` (delegates to ollama-local provider)

Provider separation: Maps to `ollama-local` block in `opencode/opencode.json`. Base: http://localhost:11434/v1 . Unlimited free local inference for supported models (qwen2.5-coder, gemma*, etc.).

Agents using this adapter (example):
- Low-cost batch / dev workers
- CEO fallbacks when specified
- Agents declaring `adapter: ollama-local` 

This adapter is intentionally separated from cloud (ollama-cloud), router, and paid (codex etc).

To add a model: edit opencode/opencode.json under "ollama-local" then restart CLI sessions. Agents reference the exact key e.g. "ollama-local/qwen2.5-coder:7b"

Local only — no network for inference (unless Ollama itself proxies).

