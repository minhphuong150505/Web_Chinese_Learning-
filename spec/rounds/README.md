# Rounds — Execution Plan

21 small rounds. Do **one at a time**, in order. Stop after each round and wait for user approval.

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

- [ ] [Round 01 — Repo init](./round-01-repo-init.md)
- [ ] [Round 02 — Backend skeleton](./round-02-backend-skeleton.md)
- [ ] [Round 03 — Frontend skeleton](./round-03-frontend-skeleton.md)
- [ ] [Round 04 — TTS service skeleton](./round-04-tts-skeleton.md)
- [ ] [Round 05 — Docker Compose wiring](./round-05-docker-compose.md)

### Milestone 1 — Text chat with DeepSeek

- [ ] [Round 06 — DB schema V1 + entities](./round-06-db-schema-v1.md)
- [ ] [Round 07 — LLM client](./round-07-llm-client.md)
- [ ] [Round 08 — Conversation service + error handling](./round-08-conversation-service.md)
- [ ] [Round 09 — Conversation REST API + CORS](./round-09-conversation-api.md)
- [ ] [Round 10 — Chat UI](./round-10-chat-ui.md)

### Milestone 2 — TTS audio

- [ ] [Round 11 — Backend TTS client + service](./round-11-tts-client.md)
- [ ] [Round 12 — Audio file endpoint + wire into chat](./round-12-audio-endpoint.md)
- [ ] [Round 13 — Audio playback in chat UI](./round-13-audio-playback-ui.md)

### Milestone 3 — Pronunciation assessment

- [ ] [Round 14 — Audio recorder hook + RecordButton](./round-14-audio-recorder.md)
- [ ] [Round 15 — ffmpeg + AudioConversionService](./round-15-audio-conversion.md)
- [ ] [Round 16 — Azure Speech client (BLOCKS on key)](./round-16-azure-speech-client.md)
- [ ] [Round 17 — Pronunciation domain (V2 + service)](./round-17-pronunciation-domain.md)
- [ ] [Round 18 — Pronunciation API + UI](./round-18-pronunciation-api-and-ui.md)

### Milestone 4 — Translation & Writing feedback

- [ ] [Round 19 — Translation feature](./round-19-translation.md)
- [ ] [Round 20 — Writing feedback feature](./round-20-writing-feedback.md)

### Finalization

- [ ] [Round 21 — Cold-start verification + README polish](./round-21-final-polish.md)

## Hard rules for rounds

1. Never start round N+1 until round N is checked off AND the user has approved.
2. Never touch files outside the round's "Files to create / modify" list — if you need to, stop and ask.
3. Always run the round's Verification block to completion before reporting "done".
4. If a verification step fails: investigate root cause; do **not** mark complete; report to user.

## How to resume after a break

1. Open this README, find first `[ ]` round.
2. Open that round file.
3. Re-read `Claude.md` and `09-coding-standards.md`.
4. Begin.
