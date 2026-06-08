# Spec Index

This directory is the **single source of truth** for the Chinese Learning App.

Read in this order before doing any work:

1. `../Claude.md` — behavioral rules (NEVER violate).
2. `00-overview-and-decisions.md` — what we're building and locked-in choices.
3. `01-tech-stack.md` → `11-sample-content.md` — design reference.
4. `rounds/README.md` — execution plan: 25 small rounds, done one at a time.

## Topic files

| File | Topic |
|------|-------|
| [00-overview-and-decisions.md](./00-overview-and-decisions.md) | Project goal, locked decisions, anti-decisions |
| [01-tech-stack.md](./01-tech-stack.md) | Versions and libraries for backend / frontend / TTS / DB |
| [02-architecture.md](./02-architecture.md) | System diagram and per-feature data flow |
| [03-folder-structure.md](./03-folder-structure.md) | Full project tree |
| [04-database.md](./04-database.md) | DDL, JPA entity rules, JSON shapes |
| [05-backend.md](./05-backend.md) | Layered design, code templates, endpoints, application.yml |
| [06-frontend.md](./06-frontend.md) | Layout, components, hooks, styling |
| [07-external-apis.md](./07-external-apis.md) | DeepSeek, Azure Speech, edge-tts |
| [08-docker-and-env.md](./08-docker-and-env.md) | docker-compose.yml and environment variables |
| [09-coding-standards.md](./09-coding-standards.md) | Project-specific code rules (on top of Claude.md) |
| [10-pitfalls.md](./10-pitfalls.md) | Known traps and how to avoid them |
| [11-sample-content.md](./11-sample-content.md) | Cohesive HSK 2–3 sample sentences for Chat/Pronounce/Translate/Write (validated in the design prototype) |

## Rounds

See [rounds/README.md](./rounds/README.md) for the 25-round execution plan, required execution order, and current status.

## How to use this spec with another model

1. Read `Claude.md`, then this `README.md`, then the topic files in order.
2. Open `rounds/README.md` and find the first unchecked round.
3. Open that round file, follow its steps, check off its verification items.
4. Update `rounds/README.md` status and `rounds/CHECKPOINT.md`.
5. Continue automatically to the next unchecked round unless a stop-and-ask trigger or blocking prerequisite applies.

## Authority

If a round file and a topic file disagree, **the topic file wins** — fix the round file.
If a topic file and `Claude.md` disagree, **`Claude.md` wins**.
If anything in `00-overview-and-decisions.md` would need to change, **stop and ask the user**.
