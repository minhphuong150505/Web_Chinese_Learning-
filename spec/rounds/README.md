# Rounds — Execution Plan

25 small rounds (20 build rounds + 4 auth rounds in Milestone 5 + 1 finalization round). Do **one at a time**, in order. After each verified round, update the checkpoint and continue automatically to the next round unless a stop-and-ask trigger or blocking prerequisite applies. Execution order is Round 01 → 20, then Milestone 5 (Rounds 22 → 25), then Round 21 (final polish) last.

Each round file has the same structure:

```
Goal              — one sentence success criterion
Prerequisites     — what must be done first
Blocks if         — external requirement that must be met
Files to create   — explicit list
Files to modify   — explicit list with what changes
Steps             — numbered, actionable
References        — links to topic files
Verification      — checkbox list
When complete     — what to report and where to update
```

## Status tracker

Mark `[x]` when verified by the user. Implementer updates this at end-of-round per `09-coding-standards.md`.

### Milestone 0 — Scaffolding

- [x] [Round 01 — Repo init](./round-01-repo-init.md)
- [x] [Round 02 — Backend skeleton](./round-02-backend-skeleton.md)
- [x] [Round 03 — Frontend skeleton](./round-03-frontend-skeleton.md)
- [x] [Round 04 — TTS service skeleton](./round-04-tts-skeleton.md)
- [x] [Round 05 — Docker Compose wiring](./round-05-docker-compose.md)

### Milestone 1 — Text chat with DeepSeek

- [x] [Round 06 — DB schema V1 + entities](./round-06-db-schema-v1.md)
- [x] [Round 07 — LLM client](./round-07-llm-client.md)
- [x] [Round 08 — Conversation service + error handling](./round-08-conversation-service.md)
- [x] [Round 09 — Conversation REST API + CORS](./round-09-conversation-api.md)
- [x] [Round 10 — Chat UI](./round-10-chat-ui.md)

### Milestone 2 — TTS audio

- [x] [Round 11 — Backend TTS client + service](./round-11-tts-client.md)
- [x] [Round 12 — Audio file endpoint + wire into chat](./round-12-audio-endpoint.md)
- [x] [Round 13 — Audio playback in chat UI](./round-13-audio-playback-ui.md)

### Milestone 3 — Pronunciation assessment

- [x] [Round 14 — Audio recorder smoke test](./round-14-audio-recorder.md)
- [x] [Round 15 — ffmpeg + AudioConversionService](./round-15-audio-conversion.md)
- [x] [Round 16 — Azure Speech client (BLOCKS on key)](./round-16-azure-speech-client.md)
- [x] [Round 17 — Pronunciation domain (V2 + service)](./round-17-pronunciation-domain.md)
- [x] [Round 18 — Pronunciation API](./round-18-pronunciation-api-and-ui.md)

### Milestone 4 — Translation & Writing feedback

- [x] [Round 19 — Translation feature](./round-19-translation.md)
- [x] [Round 20 — Writing feedback feature](./round-20-writing-feedback.md)

### Milestone 5 — Auth & multi-user (public)

> Makes the app public for many users. Google sign-in → app JWT; each user sees only their own data. Adds the `users` table (V3) and `user_id` ownership (V4). BLOCKS on `JWT_SECRET` + `GOOGLE_CLIENT_ID` at Round 22.

- [x] [Round 22 — Auth foundation (deps + User entity + V3 + security config)](./round-22-auth-foundation.md)
- [x] [Round 23 — Google login + JWT issue (AuthService + AuthController)](./round-23-auth-endpoints.md)
- [x] [Round 24 — Per-user data (V4 + scope conversation & pronunciation services)](./round-24-user-scoping.md)
- [x] [Round 25 — Frontend auth (Google login, AuthProvider, login gate)](./round-25-frontend-auth.md)

### Finalization

> Run **last**, after Round 25 (despite its lower number — it's the closing polish pass for the whole app incl. auth).

- [x] [Round 21 — Cold-start verification + README polish](./round-21-final-polish.md)

## Hard rules for rounds

1. Never start the next round in the execution order until the current round is checked off. User approval to auto-continue is already granted; stop only for a stop-and-ask trigger, blocked prerequisite, failed verification, or explicit user interruption. After Round 20, the next round is Round 22; Round 21 runs last after Round 25.
2. Never touch files outside the round's "Files to create / modify" list — if you need to, stop and ask.
   - Reminder: every business service is created as an **interface + `impl/<Name>Impl`** (see `05-backend.md` § "Service interface pattern"). Controllers inject the interface.
3. Always run the round's Verification block to completion before reporting "done".
4. If a verification step fails: investigate root cause; do **not** mark complete; report to user.

## Auto-continue checkpoint

At the end of every verified round:

1. Update this tracker.
2. Rewrite `CHECKPOINT.md` with only the state needed to resume: completed round, next round, files changed, verification results, running services, and blockers/caveats.
3. Treat that checkpoint plus the next round file as the source of truth before continuing. This is the project's memory-clear step; the assistant cannot literally erase chat context.
4. Continue to the next unchecked round immediately unless a stop-and-ask trigger or blocked prerequisite applies.

## How to resume after a break

1. Open this README, find first `[ ]` round.
2. Open that round file.
3. Re-read `CHECKPOINT.md`, `Claude.md`, and `09-coding-standards.md`.
4. Begin or continue the auto-continue flow.
