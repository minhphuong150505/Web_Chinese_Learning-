# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Note: `Claude.md` (different file, capital C) holds generic LLM coding-behavior guidelines. This file is the project-specific guide.

## What this is

A multi-user web app for practicing Mandarin Chinese with an AI tutor. Users sign in
(email/password, Google, or an optional single-user mode) and get practice modes, each
backed by a real external service. Each user sees only their own conversation and
pronunciation history (scoped by `userId`).

Practice modes: **Chat** (LLM tutor, replies spoken via TTS), **Pronounce** (read aloud →
per-word + per-syllable tone scoring), **Translate** (VI↔ZH), **Write** (paragraph → structured
feedback), plus an **HSK** study section (HSK1–4 scanned PDFs/MP3s served from disk) and a
private **Letter** feature gated to allow-listed emails.

## Three services

| Service | Stack | Port | Role |
|---|---|---|---|
| `frontend` | React 18 + Vite + TypeScript + Tailwind (nginx in Docker) | 5173 | SPA |
| `backend` | Spring Boot, **Java 21**, PostgreSQL + Flyway, stateless JWT | 8080 | API, auth, persistence, orchestration |
| `tts-service` | Python FastAPI + edge-tts + parselmouth | 8001 | TTS synthesis + F0 tone analysis |

The browser talks **only** to the backend (`/api/**`). The backend calls the LLM provider,
Azure Speech, and `tts-service`. In dev, Vite proxies `/api` → `http://localhost:8080`
(`frontend/vite.config.ts`).

## Commands

Full stack (preferred — matches production wiring):
```bash
cp .env.example .env   # then fill in keys (see README)
docker compose up --build       # http://localhost:5173
docker compose down -v          # reset everything incl. DB + stored audio
```

Backend (Maven wrapper, run from `backend/`):
```bash
./mvnw spring-boot:run           # needs a running Postgres + env vars
./mvnw test                      # all tests
./mvnw test -Dtest=PronunciationServiceImplTest             # single class
./mvnw test -Dtest=PronunciationServiceImplTest#methodName  # single method
./mvnw package                   # build jar
```
Tests use **Testcontainers** (`postgresql` test dep) — Docker must be running.

Frontend (run from `frontend/`):
```bash
npm install
npm run dev        # Vite dev server on 5173
npm run build      # tsc --noEmit (typecheck) + vite build
```
There is no separate lint/test script; `npm run build` is the typecheck gate.

tts-service (run from `tts-service/`):
```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001
python scripts/eval_tone.py        # tone-engine evaluation / calibration helpers
```

## Backend architecture

Standard layered Spring layout under `com.chineseapp`: `controller` → `service`
(interface) + `service/impl` → `repository`/`client`. Config is centralized in
`@ConfigurationProperties` classes under `config/` (e.g. `LlmProperties`, `AzureSpeechProperties`,
`HskProperties`) bound from `application.yml`. **All tunables come from env vars via
`application.yml`** — do not hardcode keys, URLs, or model names; add a property instead.

External integrations live in `client/` and are interface-first so impls can be swapped/mocked:
- `LlmClient` (single method `chat(List<LlmMessage>)`) — impl `OpenAiCompatibleLlmClient`,
  provider/base-url/model all configurable (`app.llm.*`, defaults to DeepSeek). Used by chat,
  translation, and writing feedback.
- `AzureSpeechClient` — pronunciation assessment (scripted + unscripted).
- `ToneAnalysisClient` + `EdgeTtsClient` — call `tts-service`.

**Pronunciation scoring is a two-engine merge** (`PronunciationServiceImpl`): Azure returns
base metrics and per-word timestamps (in 100-ns ticks); the service then sends each syllable's
pinyin/expected-tone/timing to `tts-service`'s `/tone-analyze` F0 engine and enriches each
syllable with a detected tone + tone score. Tone thresholds are heuristic and need calibration
against real recordings. Touch the scoring with care and run `PronunciationServiceImplTest`.

Security: stateless JWT (`security/JwtService`, `JwtAuthFilter`), Google ID-token verification
(`GoogleTokenVerifier`), config in `SecurityConfig`. HSK material paths and the audio endpoint
are deliberately public (loaded by native `<iframe>`/`<audio>` tags that can't send the JWT header).

Database: schema is **Flyway-managed** (`resources/db/migration/V*.sql`), `ddl-auto: validate`.
Never edit an applied migration — add a new `V<n>__*.sql`.

HSK materials: large scanned PDFs and MP3s are **served from the filesystem**, never bundled
into the jar (`HskMaterialConfig`, `app.hsk.materials-dir`, defaults to repo-level `TaiLieu/`).

## Frontend architecture

`src/features/<mode>/` (auth, chat, pronunciation, translation, writing, hsk, letter) — one
folder per practice mode, the primary place to work. Shared code in `components/`, `hooks/`,
`lib/`, `auth/`, `i18n/`, `types/`. Data fetching via `@tanstack/react-query` + `axios`; Chinese
text helpers via `pinyin-pro`. Google sign-in via `@react-oauth/google` using the shared
`GOOGLE_CLIENT_ID`.

## Conventions specific to this repo

- **HSK study content must be verbatim** from the source materials — do not invent vocab,
  roadmap, or example sentences. HSK1 vocab is transcribed; HSK2–4 are pending.
- **Chat/conversation prompts cap replies at HSK4 and below** — keep LLM tutor output within
  that vocabulary level (see `ConversationServiceImpl`).
- The `spec/` folder is the design source of truth; `spec/rounds/` is the round-by-round build
  log. `spec/10-pitfalls.md` and `spec/09-coding-standards.md` are worth reading before larger changes.
- Production HTTPS (needed for mic access on a public domain) uses `docker-compose.gcp.yml`
  with Caddy for automatic TLS.
