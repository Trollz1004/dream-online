# Credits — Shorts, Podcast & Promo Media

Joshua's ruling (2026-11-01): platforms that give us real free access get named on screen and in descriptions.

## Video generation

- **LightX2V by ModelTC** — https://github.com/ModelTC/LightX2V (framework code: Apache-2.0).
  - Lightweight video-generation inference: step-distillation (about 4–8 steps instead of 40–50), quantization and CPU offload so big video models (for example Wan 2.x) run on 8–16 GB cards. Also ships distillation LoRAs used in ComfyUI.
  - Joshua's ruling: free to use, **never for the date app, never for NSFW content**, and ModelTC gets named for giving us real free access.
  - Required credit in every video description that uses it: `Video made with LightX2V by ModelTC`.
  - Optional on-screen end-card line: `Video: LightX2V by ModelTC`.
  - Note: the base model weights run through LightX2V (Wan, etc.) carry their own licences; check each model card before publishing.
  - **LightX2V Studio cloud API** (`https://x2v.light-ai.top`, key from User menu → API Key Management): per Joshua, his cloud/API usage is free (same two limits: no date app, no NSFW). This is the preferred path for Shorts video so neither `.40` nor `.8` burns VRAM. Earlier Antigravity work already added the README thank-you and a LightX2V studio page (commit `86194a5e`, logged in the vault 2026-10-14).
  - Key lives only in `.env` as `LIGHTX2V_API_KEY=XXXX` on the node that calls it. Never commit it, never print it.
  - The API enforces request spacing and per-tier concurrency: queue requests and back off on HTTP 429.
  - 2026-11-01: the LightX2V Studio agent itself generated a "#UntilNoKidInNeed charity content SOP" skill in Joshua's account (My skills) and a structured session handoff (`docs/partners/lightx2v-studio-record.md`). It states charity generation is permanently free with no quota, G-rated only, isolated from adult nodes, factory-default safety, outputs GLB rigged / PNG sprite sheets / transparent WebM, optional mark "Built with LightX2V Studio". It was written by their AI agent, not by Joshua. Until LightX2V staff confirm it in writing, treat "free, no limits" as the agent's statement, not a contract.
  - Credit we use anyway (Joshua's rule): `Built with LightX2V Studio`.

- **LTX-2 by Lightricks** (`ltx-2.3-22b-distilled-fp8` + IC-LoRA, already downloaded in ComfyUI on `.40`).
  - Separate model family from LightX2V. Check the Lightricks licence on its model card before publishing anything made with it.
  - Credit when used: `Video made with LTX-2 by Lightricks`.

## Locally generated art (ComfyUI)

- Text-to-image and text-to-video output generated on our own machines (Alienware `.40` light jobs, Sabretooth `.8` heavy jobs) counts as in-house assets.
- Keep the prompt and model name next to each saved asset so credits stay accurate.

## Voices

- Natural female voices only (Gemini TTS `Aoede` / `Kore`, or Kokoro / F5-TTS / Chatterbox on Sabretooth). No robotic system TTS.
