# Fable's Kitchen: the recipes in pictures

Every change to this repo is cooked in one kitchen. There is one head chef, a line of chefs from different AI companies, a pantry of memory, and two tasters before anything is served.

How to read the pictures: solid boxes run today. Dashed boxes are being built.

## 1. The line: how one ticket becomes a served dish

```mermaid
flowchart TD
  T["Order ticket<br/>from Josh or the Head Chef"]
  E["Expediter<br/>a decision model reads the ticket"]
  P["Panda Router<br/>picks the burner: which model"]
  R["Role router<br/>picks the chef: one agency-agents role<br/>and up to two companion skills"]
  A["Line chef A<br/>first plate"]
  B["Line chef B<br/>same dish, other approach"]
  ADD["Add-on station<br/>keeps the best, names five add-ons"]
  J1["Taster<br/>Gemini 4 Carbon"]
  J2["Taster<br/>Codex"]
  H["Head Chef Fable<br/>serve or send back"]
  S["Served<br/>merged to main, deployed to the T5500"]
  M[("Pantry memory")]
  T --> E --> P --> R
  R --> A
  R --> B
  A --> ADD
  B --> ADD
  ADD -. "each add-on goes back as a new ticket" .-> P
  ADD --> J1
  ADD --> J2
  J1 --> H
  J2 --> H
  H -- "serve" --> S
  H -. "send back, two times at most" .-> P
  S --> M
  M -.-> R
  classDef soon stroke-dasharray: 6 4
  class E,R,B,ADD,J1,J2 soon
```

Running today: tickets land in the wheel's inbox; the Panda Router picks the model; one line chef cooks; Head Chef Fable reads the work and the real screens, then merges or sends it back; main is deployed to the T5500; every dish leaves notes in the pantry.

Being built: the Swarm Command request box that writes tickets into the inbox, the expediter, the role router, the second plate, the add-on station and the two tasters.

## 2. The pantry: what every chef can reach

```mermaid
flowchart LR
  subgraph KIT["Starter kit: every chef, every ticket"]
    K1["Code map search<br/>no chef reads a whole repo"]
    K2["Fleet memory"]
    K3["Obsidian notes<br/>one per dish"]
    K4["Role card<br/>only the role picked"]
    K5["Method card<br/>brainstorm, plan, test first, verify"]
  end
  subgraph ROLES["Where role cards come from"]
    R1["agency-agents<br/>all divisions"]
    R2["Josh's own skill folder"]
    R3["This repo's skills"]
  end
  subgraph LOCK["Locked shelf: trusted chefs only"]
    L1["REA"]
    L2["Remake"]
    L3["Agent-Reach"]
    L4["last30days"]
    L5["Superpowers"]
  end
  subgraph FIN["Finishing station: before anything is plated"]
    F1["Impeccable"]
    F2["Hallmark"]
    F3["Humanizer"]
    F4["Stop-slop"]
    F5["Caveman notes"]
  end
  subgraph TRUST["Trusted chefs"]
    C1["Claude Opus and Fable"]
    C2["Gemini 4 Carbon"]
    C3["GPT-6 Astra, GPT-6.1 Sol and Codex"]
  end
  ROLES --> K4
  TRUST --> LOCK
  KIT --> FIN
  classDef soon stroke-dasharray: 6 4
  class K4,K5,ROLES,LOCK soon
```

Running today: the code map, fleet memory and the Obsidian note for every task. The role cards, the method card and the locked shelf as one starter kit are being built. The roster of roles already holds 347 entries.

Remake rule: a remake is a study copy. It stays on the machine that made it, is recoloured dark, gets new icons, routing and memory, and has any sign-in removed. Nothing from a remake is served as a copy.

## 3. The kitchens: machines, ports and what runs on a timer

Every address is written the way the house requires (`docs/house/ADDRESS-DOCTRINE.md` and `ops/fleet/fleet-map.json`): `192.168.0.40` (Alienware) or `192.168.0.15` (T5500) and the port, never a loopback reach URL. Guarded LAN services require their token check and firewall allowlist. Postgres (`5432`), Redis (`6379`) and Obsidian Local REST (`27123`) stay on `127.0.0.1` (`this machine only`), on purpose.

```mermaid
flowchart TB
  NET(["The internet"])
  CF["Cloudflare tunnel<br/>on the T5500"]
  subgraph T5["T5500 · 192.168.0.15 · front of house"]
    t3200["3200 · date app<br/>192.168.0.15:3200"]
    t8000["8000 · date app API<br/>192.168.0.15:8000"]
    t9160["9160 · domains server<br/>192.168.0.15:9160"]
    t3130["3130 · Mission OS<br/>192.168.0.15:3130 · lan-guarded"]
    t20128["20128 · OmniRoute<br/>192.168.0.15:20128"]
    t9119["9119 · Hermes dashboard<br/>192.168.0.15:9119"]
    tdb["5432 Postgres · 6379 Redis · 27123 Obsidian REST<br/>127.0.0.1 · this machine only"]
    tsch["On a timer: keepalive, Mission Control,<br/>OmniRoute, Postgres, nightly backup"]
  end
  subgraph AW["Alienware · 192.168.0.40 · the workshop"]
    a8000["8000 · Swarm Command<br/>192.168.0.40:8000 · lan-guarded"]
    a8765["8765 · Panda Router<br/>192.168.0.40:8765"]
    a8082["8082 · Free Claude Code<br/>192.168.0.40:8082 · lan-guarded"]
    a9180["9180 · DREAM dev engine<br/>192.168.0.40:9180 · lan-guarded"]
    a8390["8390 · OPSis studio<br/>192.168.0.40:8390"]
    a8392["8392 · lead-gen studio<br/>192.168.0.40:8392 · lan-guarded"]
    a11434["11434 · Ollama<br/>192.168.0.40:11434 · lan-guarded"]
    a27200["27200 · Obsidian MCP<br/>192.168.0.40:27200"]
    adb["27123 · Obsidian REST<br/>127.0.0.1 · this machine only"]
    asch["On a timer: boot check every 15 minutes,<br/>inbox runner, Panda Router"]
  end
  NET --> CF
  CF -- "youandinotai.com" --> t3200
  CF -- "api.youandinotai.com" --> t8000
  CF -- "onlinerecycle.net and dream-online.net" --> t9160
  CF -- "mcp.youandinotai.com, sign-in first" --> t3130
  a8000 --> a8765
  AW -- "deploy from main only" --> T5
```

## 4. The memory loop: why the kitchen gets better every day

```mermaid
flowchart LR
  D["Dish served"] --> N["Obsidian note<br/>did, broke, next"]
  D --> F["Fleet memory<br/>three lasting facts"]
  D --> C["Code map<br/>rebuilt when the repo moved"]
  D --> SB["Scoreboard<br/>which chef won which dish"]
  N --> ND["Nightly distill<br/>the day's lessons"]
  F --> ND
  SB --> ND
  ND --> RC["Role cards learn"]
  SB --> PR["Panda picks better"]
  RC --> NX["Next ticket"]
  PR --> NX
  C --> NX
  classDef soon stroke-dasharray: 6 4
  class SB,ND,RC,PR soon
```

Running today: the note, fleet memory and the code map. The scoreboard, the nightly distill and the learning role cards are being built.
