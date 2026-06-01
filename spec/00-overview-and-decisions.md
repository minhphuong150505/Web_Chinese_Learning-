# 00 — Overview & Locked Decisions

## Project goal

A locally-runnable web app to practice Mandarin Chinese (中文) through three features, in priority order:

| # | Feature | What it does |
|---|---------|--------------|
| 1 | **Voice conversation with AI** | User types or speaks Chinese; AI replies with text + natural-voice audio. AI acts as a practice partner and corrects mistakes. |
| 2 | **Pronunciation scoring** | User reads a sentence; system returns accuracy / fluency / completeness / **tone** scores per syllable. |
| 3 | **Translation & writing feedback** | Translate Vi↔Zh; review user's Chinese writing for grammar & word choice. |

Purpose: personal learning / demo. **Not** production, **not** multi-user, **no** auth.

## Locked-in decisions

These are decided. Do not revisit without explicit user approval (see Appendix in `README.md`).

| Decision | Choice | Rationale |
|----------|--------|-----------|
| LLM provider | **DeepSeek** | User choice. Backend still uses a provider-agnostic `LlmClient`, so Qwen can swap in via env vars without code changes. |
| 2D character (Live2D) | **Excluded** | User opted out. |
| UI language | **English** | All labels/buttons/messages in English. User input/output stays in Chinese (with pinyin where helpful). |
| Chat transport | **REST (synchronous)** in v1 | Streaming (SSE/WebSocket) deferred. |
| Browser audio capture | **WebM/Opus** (MediaRecorder default) | Backend converts to 16 kHz mono WAV via ffmpeg before Azure. |
| DB migrations | **Flyway** | Standard with Spring Boot; SQL files committed to git. |
| Backend build tool | **Maven** | Wrapper (`mvnw`) committed. |
| Styling | **Tailwind CSS** | Fast iteration; no design system needed. |
| Frontend server state | **TanStack Query v5** | Caching + retries out of the box. |
| Auth | **None** | Single anonymous user. |
| Routing (frontend) | **None** | Single page with tabs. Add router only if app grows past 4 tabs. |
| Java helpers | **No Lombok** | Use Java 21 records + explicit getters. Keeps code obvious for any model reading it. |

## Anti-decisions (explicitly NOT doing)

- No authentication / users / sessions.
- No streaming responses in v1.
- No CI/CD, no production deploy configs.
- No analytics, no telemetry.
- No mobile-specific UI.
- No PWA / offline support.
- No background cleanup jobs (e.g., old audio files).

## Out-of-scope for changes

If a task would require modifying any of the above, **stop and ask the user** before proceeding.
