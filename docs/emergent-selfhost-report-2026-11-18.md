# Self-hosting the Emergent apps on the Alienware, report of 2026-11-18

Source order: `.fable-kitchen/orders/ORDER-EMERGENT-SELFHOST.md`. Josh's ruling, 2026-11-18 08:12: the Emergent apps are self-hosted, not run on Emergent, and they tie into the one dashboard with agency agents and judges.

This report covers the two apps. Setting names only, never values. No env file was opened. Every repo was fetched and fast-forwarded to `main` first:

- Auto Freelance Hub, `Ai-Solutions-Store/EMERGENT-if-self-hosted-EMERGENT-GETS-CREDIT-AND-FREEM-BRANDING-MANDATORY-`, main `47fbe78`.
- The marketplace app, `Trollz1004/civic-marketplace`, main `a05a376`.

The Emergent repo's name is a rule: any self-hosted copy keeps Emergent's credit and branding. Nothing in this work removes either.

---

## 1. Auto Freelance Hub

### What it does
It is a private dashboard for one freelancer:
- It pulls "help wanted" posts from Reddit. The Fiverr and Upwork entries are fake samples written into the code.
- An AI scores each post 0 to 100 on how much of the work could be automated, and suggests a price.
- For a post, it can write a demo (code, plan, mockup or video script) and a pitch message.
- The owner copies the pitch and sends it by hand, then clicks "Mark sent" or "Converted".
- A Telegram bot alerts the owner about posts that score 70 or more, and takes `/approve` and `/reject` from him.

Nothing is sent to clients automatically today.

### Its parts
- **Backend**:
  - Built with Python and FastAPI. The entry file is `backend/server.py`, and every route sits under `/api`.
  - Libraries: Motor (MongoDB), PyJWT and bcrypt for login, httpx.
  - Other modules: `llm_router.py`, `llm_service.py`, `scanners.py`, `telegram_bot.py`, `swarm_client.py`, `mcp_memory.py` (Qdrant).
  - On Emergent it ran under the pod's supervisor. The repo has no start script.
- **Frontend**: React 19 on Create React App via craco, with Tailwind, shadcn/ui and recharts. It calls `${REACT_APP_BACKEND_URL}/api` with a login token.
- **Database**:
  - MongoDB collections: `users`, `opportunities` (the main one), `demos`, `outreach`, `payments` (payout handles only, not money records) and `settings`.
  - Qdrant is optional.
- `docker-compose.yml` names Mongo 7, Qdrant, the backend on 8001 and the frontend on 3000. The repo has no Dockerfiles, so compose cannot build it as it stands.

### What it needs to run on this PC
- **Python**: 3.11 or 3.12 suits the pins best. 3.14 is installed and has run the cleaned copy.
- **Python packages**: `backend/requirements.txt`, minus `emergentintegrations`. That package is on Emergent's private index, not PyPI. The code imports it only when it is used, so the app starts without it.
- **Node and yarn**: Node is installed. yarn is not; `corepack` or npm works instead. The frontend is optional for a headless service.
- **MongoDB**: not installed on this PC. Nothing listens on 27017 and the Docker service is stopped. The free MongoDB Community server, unpacked from its zip (no installer, no account, no admin), can run headless and bound to 127.0.0.1.
- **Qdrant**: optional, and left off.

### Outside services or accounts it calls (names only)
- Emergent Universal LLM Key, through `emergentintegrations`
- OpenRouter (optional)
- Ollama (optional, local)
- Reddit
- Telegram Bot API (to the owner only)
- PostHog (analytics snippet in `frontend/public/index.html`)
- Emergent CDN (`assets.emergent.sh`, `static.prod-images.emergentagent.com`)
- Swarm orchestrator / Mission Control (optional)
- Qdrant (optional)
- Fiverr and Upwork appear only as sample data; the app never calls them. `DEPLOY.md` mentions Stripe, but there is no Stripe code.

### Setting names it needs (never values)
| Name | What it is for | Required? |
|---|---|---|
| `MONGO_URL` | Mongo connection | yes |
| `DB_NAME` | Mongo database name | yes |
| `JWT_SECRET` | signs login tokens; the code has a weak fallback | in practice, yes |
| `EMERGENT_LLM_KEY` | Emergent LLM tier | no, once OmniRoute replaces it |
| `OLLAMA_URL`, `OLLAMA_MODEL` | local LLM tier | no |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | middle LLM tier | no |
| `TELEGRAM_BOT_TOKEN` | owner alerts bot | no |
| `SWARM_ORCHESTRATOR_URL`, `SWARM_API_KEY` | Mission Control hooks | no |
| `QDRANT_URL`, `QDRANT_API_KEY`, `QDRANT_OPPS_COLLECTION`, `QDRANT_OUTREACH_COLLECTION` | vector memory | no |
| `CORS_ORIGINS` | allowed browser origins (defaults to all) | no, but should be set |
| `REACT_APP_BACKEND_URL` | frontend's backend address | yes, for the frontend |
| `ENABLE_HEALTH_CHECK` | frontend dev-server health pages | no |

The cleaned copy `Trollz1004/auto-freelance-hub` (one commit, 2026-11-14) is the same app with self-host changes. It adds these setting names: `OMNIROUTE_BASE_URL`, `OMNIROUTE_API_KEY`, `OMNIROUTE_MODEL`, `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_RATE_DELAY_SECONDS` and `HN_RATE_DELAY_SECONDS`.

### What depends on Emergent's hosted services, and what replaces it here
| Emergent dependency | Where | Replacement on this PC |
|---|---|---|
| `emergentintegrations` with `EMERGENT_LLM_KEY` (the only "premium" LLM tier) | `backend/llm_router.py`, `backend/requirements.txt` | An OpenAI-compatible OmniRoute tier on the T5500 at port 20128 (`/v1/chat/completions`). The Emergent tier is kept, but only when its key is set. The cleaned copy already has this tier. |
| Emergent pod supervisor | `README.md` | Started headless by `ops/node/boot-alienware-services.ps1`, like the other Alienware services. |
| Preview URL `auto-freelance-hub.preview.emergentagent.com` | `backend/tests/backend_test.py` (test default only) | The local address from the fleet map |
| Emergent CDN hero image | `frontend/src/pages/Landing.jsx`, `Auth.jsx` | Left as is (it is part of the look). |
| `@emergentbase/visual-edits` dev tool | `frontend/package.json`, `craco.config.js` | Kept. craco only warns if it is missing. |

**Emergent credit and branding stay, all of it**:
- `EMERGENT_CREDITS.md` and `memory/EMERGENT_JOURNAL.md`.
- The README badge and Credits section.
- The `X-Powered-By: Emergent (emergent.sh)` and `X-Built-With` response headers.
- The `powered_by` and `built_with` fields in `/api/widget/summary`.
- The "BUILT BY EMERGENT" link in `AppShell.jsx`.
- The `emergent-main.js` "Made with Emergent" badge script, and the page title and meta text.

### How a job moves through it today
- **Opportunity** (`backend/models.py`): `new`, then `approved` or `rejected`, then `contacted`, then `sold`.
- **Outreach**: `draft`, then `sent`, then `replied`, then `converted` or `declined`.
- The code has no "in work", "waiting for a judge" or "paid" state, and no real money record. Its "revenue" is the AI's suggested price, summed over sold opportunities. The health route below labels it as an estimate.

### Outside sites it acts on
| Site | What it does | Sends today? |
|---|---|---|
| Reddit | reads new posts in r/forhire, r/slavelabour, r/DoneDirtCheap, r/hiring, r/jobbit | reads only |
| Fiverr, Upwork | sample posts in code | no network at all |
| Hacker News (cleaned copy only) | reads freelancer threads | reads only |
| Telegram | alerts to the owner's own chat | yes, to the owner only |

Client pitches are drafted only. The UI copies the text to the clipboard, and "Mark sent" just flips a status.

### Risks before it is ever opened to the network
- Anyone can register an account.
- `JWT_SECRET` has a weak fallback.
- CORS allows every origin.
- `GET /api/settings` returns the stored Telegram token.
- Binding to 127.0.0.1 keeps all of these off the LAN.

---

## 2. The marketplace app (civic-marketplace)

### What it does
It is a small sales and outreach tool for the Youandinotai charity and volunteer platform:
- It keeps a list of people who showed interest (leads) and scores how warm each one is.
- It builds signup pages and social signup forms.
- It writes email templates, campaigns and drip sequences.
- It suggests social posts and hashtags with AI.
- It charts leads by city and by volunteer group.

Despite the name, it is a lead CRM, not a buy-and-sell marketplace. It has no listings, offers, bids or payments.

PR #1 (merged 2026-11-14) already did most of the self-hosting work:
- An OmniRoute-first LLM router.
- Mongo defaults pointing at this PC's own Mongo on port 27017, database `civic_marketplace`.
- Sample records marked and left out of every total.
- A master switch, `OUTBOUND_SENDING_ENABLED`, that is off by default.
- PostHog and the Emergent script removed from `index.html`.
- 10 self-host tests.

### Its parts
- **Backend**:
  - Python and FastAPI, all in `backend/server.py` plus `backend/llm_router.py`. Every route sits under `/api`.
  - Uses Motor for Mongo.
  - Has no login at all.
- **Frontend**: React 19 on Create React App via craco, with Tailwind and shadcn/ui. It calls `${REACT_APP_BACKEND_URL}/api`.
- **Database**: MongoDB, database `civic_marketplace`. Collections: `leads`, `email_templates`, `email_campaigns`, `email_logs`, `drip_sequences`, `automation_rules`, `landing_pages`, `platforms`, `social_captures`, `groups`, `content_suggestions`, `lead_analyses` and `status_checks`.

### What it needs to run on this PC
- **Python**: 3.11 or 3.12, or the installed 3.14 if the wheels install.
- **Python packages**: `backend/requirements.txt`, minus `emergentintegrations` (Emergent's private index; imported only when used). Several pinned packages are never imported.
- **MongoDB**: the same local server as the hub. The two apps use separate databases.
- **Node and yarn**: for the frontend only (optional for a headless service).

### Outside services or accounts it calls (names only)
- OmniRoute (optional)
- Ollama (optional)
- OpenRouter (read from settings but never called)
- Emergent LLM gateway (only if its key is set)
- Resend (email; off behind the switch)
- User-supplied webhook URLs (off behind the switch; the sample is Zapier)
- Google Fonts
- Unsplash (hotlinked images)
- Emergent CDN (install time only, for the visual-edits dev tool)

### Setting names it needs (never values)
| Name | What it is for | Required? |
|---|---|---|
| `MONGO_URL` | Mongo connection | no (defaults to local) |
| `DB_NAME` | database name | no (defaults to `civic_marketplace`) |
| `CORS_ORIGINS` | allowed browser origins | no |
| `OUTBOUND_SENDING_ENABLED` | master switch for real email and webhooks | no (off by default) |
| `RESEND_API_KEY`, `SENDER_EMAIL` | email sending | only to really send |
| `OMNIROUTE_BASE_URL`, `OMNIROUTE_API_KEY`, `OMNIROUTE_MODEL` | house LLM router | no (must point at the T5500 to work) |
| `OLLAMA_URL`, `OLLAMA_MODEL` | local LLM | no |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | read but unused | no |
| `EMERGENT_LLM_KEY` | optional Emergent tier | no; leave unset |
| `REACT_APP_BACKEND_URL` | frontend's backend address | yes, for the frontend |
| `ENABLE_HEALTH_CHECK` | frontend dev-server health pages | no |

### What depends on Emergent's hosted services, and what replaces it here
| Emergent dependency | Replacement on this PC |
|---|---|
| `emergentintegrations` and `EMERGENT_LLM_KEY` | Already optional. OmniRoute on the T5500 at port 20128, through `OMNIROUTE_BASE_URL`. |
| `@emergentbase/visual-edits` from the Emergent CDN | craco already turns it off when it is missing. |
| Emergent auth | None used; the app has no login. It stays bound to 127.0.0.1 until auth is added. |
| Preview URLs | None in the code. |

**Emergent credit and branding stay**:
- The README "Built with Emergent" line, the badge and Credits.
- The `index.html` meta "A product of emergent.sh" and the title.
- The `.emergent/` folder.
- The frontend health-check plugin.

### How a lead moves through it today
- **Lead `status`**: `new`, `contacted`, `engaged`, `qualified`, `converted` or `lost`. Statuses change by hand, by an automation rule, or when an email click sets `engaged`.
- **Money**: the only money field is `conversion_value`, entered by hand.
- **Sample records**: every count uses the filter `is_sample != true`.
- **Campaigns**: `draft`, `scheduled`, `running`, `paused` or `completed`.
- **Email logs**: written only when Resend really accepted an email.

### Outside sites it acts on
| What | Sends today? |
|---|---|
| Email to leads through Resend | no: blocked unless `OUTBOUND_SENDING_ENABLED` is on and a Resend key is set |
| Webhook POST of lead data | no: same switch |
| LLM calls (OmniRoute, Ollama, Emergent) | yes, when reachable. They produce text and post nothing anywhere. |

---

## Stage 2, running them here
Added below once the services run. The ports come from `ops/fleet/fleet-map.json`, and the services are started by `ops/node/boot-alienware-services.ps1`. Each binds 127.0.0.1 when no shared token is set, and each has a counts-only health route.

## Stage 3, tie-in design
Added below in this same pull request.

## Terms of each site the hub would act on
Added below in this same pull request. Until the judge rules on that list, the hub only drafts. It sends nothing, bids on nothing and messages no one.
