# Gemini Adapter

Paperclip alias: `gemini`

CLI: `gemini`

Provider: Gemini CLI login lane. `opencode_provider: "google"` /
`gemini-2.5-pro` only when explicitly routed through OpenCode.

Separation: Google-specific auth. Use for Gemini work where free tier or specific model desired. Separate file + alias from hermes/opencode.

Agent declaration example: adapter: gemini

