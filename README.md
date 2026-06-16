# Web Chinese Learning

A multi-user web app for practising Mandarin Chinese with an AI tutor, aimed at
Vietnamese-speaking learners. Users sign in (email/password, Google, or an optional
single-user mode) and get a set of practice modes, each backed by a real external
service. Every user sees only their own conversation and pronunciation history,
scoped by `userId`.

## Practice modes

| Mode | What it does | Backed by |
|---|---|---|
| **Chat** | Converse in Chinese with an LLM tutor; replies are read aloud (TTS). Supports voice turns (record → transcribe → reply). Tutor output is capped at HSK4 vocabulary. | LLM provider + `tts-service` |
| **Pronounce** | Read a sentence aloud and get per-word + per-syllable tone scoring. Mispronounced words are highlighted (red = badly off, yellow = slightly off, otherwise unmarked). | Azure Speech + `tts-service` F0 engine |
| **Translate** | Translate between Vietnamese and Chinese, both directions. | LLM provider |
| **Write** | Submit a short paragraph and get structured writing feedback. | LLM provider |
| **HSK** | Study section for HSK 1–4: scanned PDFs and MP3s served from disk, plus a verbatim-transcribed roadmap/vocab. | Filesystem |
| **Letter** | A private feature gated to allow-listed emails. | Backend |

Chat and Write also support **HSK exam practice** setups (HSK-lesson / Custom /
Mock-test), where an optional HSK level drives the exam-prep prompts and the
vocabulary ceiling.

## Architecture

The browser talks **only** to the backend (`/api/**`). The backend orchestrates the
LLM provider, Azure Speech, and the TTS microservice.

```
browser (SPA)  ──HTTPS──>  backend (Spring Boot)  ──>  LLM provider (OpenAI-compatible)
                                   │                ──>  Azure Speech (pronunciation)
                                   │                ──>  tts-service (TTS + F0 tone analysis)
                                   └──>  PostgreSQL (users, conversations, scores)
```

| Service | Stack | Port | Role |
|---|---|---|---|
| `frontend` | React 18 + Vite + TypeScript + Tailwind (nginx in Docker) | 5173 | Single-page app |
| `backend` | Spring Boot 3.3, **Java 21**, PostgreSQL + Flyway, stateless JWT | 8080 | API, auth, persistence, orchestration |
| `tts-service` | Python FastAPI + edge-tts + parselmouth | 8001 | TTS synthesis + F0 tone analysis |

In dev, Vite proxies `/api` → `http://localhost:8080` (`frontend/vite.config.ts`).

### Pronunciation scoring (two-engine merge)

Azure Speech returns base metrics and per-word timestamps. The backend
(`PronunciationServiceImpl`) then sends each syllable's pinyin, expected tone, and
timing to `tts-service`'s `/tone-analyze` F0 engine and enriches each syllable with a
detected tone and tone score. Tone thresholds are heuristic and need calibration
against real recordings — touch the scoring with care and run
`PronunciationServiceImplTest`.

## Repository layout

```
backend/            Spring Boot API (controller → service → repository/client)
frontend/           React SPA (src/features/<mode>/ — one folder per practice mode)
tts-service/        FastAPI TTS + tone-analysis microservice
TaiLieu/            HSK 1–4 source materials (scanned PDFs / MP3s), served from disk
spec/               Design source of truth; spec/rounds/ is the round-by-round build log
deploy/             Caddyfile + GCP startup script for production HTTPS
docker-compose.yml          Local full-stack wiring
docker-compose.gcp.yml      Production wiring with Caddy (automatic TLS)
```

## Prerequisites

- Docker + Docker Compose (the preferred way to run the full stack).
- A `.env` file based on `.env.example`.
- For local per-service development: Java 21, Node 18+, Python 3.11+.

## Quick start (Docker)

```bash
cp .env.example .env   # then fill in keys (see below)
docker compose up --build       # http://localhost:5173
docker compose down -v          # reset everything incl. DB + stored audio
```

URLs:

- Frontend: http://localhost:5173
- Backend: http://localhost:8080
- TTS service: http://localhost:8001

`GOOGLE_CLIENT_ID` must be a Google OAuth **Web application** client id with
`http://localhost:5173` listed as an authorized JavaScript origin (see
`spec/07-external-apis.md` §7.4). The same value is used by the backend (to verify
Google ID tokens) and the frontend (to render the Google sign-in button).

## Environment variables

All tunables come from env vars via `application.yml` — keys, URLs, and model names
are never hardcoded. Key variables (see `.env.example` for the full list):

| Variable | Purpose |
|---|---|
| `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_CHAT_MODEL` | LLM provider (chat, translation, writing). Defaults target DeepSeek; any OpenAI-compatible endpoint works. |
| `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | Azure Speech for pronunciation assessment. |
| `JWT_SECRET`, `JWT_EXPIRY_DAYS` | Stateless JWT signing. Generate a real secret, e.g. `openssl rand -base64 48`. |
| `GOOGLE_CLIENT_ID` | Google OAuth Web client id (shared by backend + frontend). |
| `DOMAIN`, `CORS_ALLOWED_ORIGIN_PATTERNS` | Production domain (used by Caddy for TLS) and allowed CORS origins. |
| `LETTER_ALLOWED_EMAILS`, `VITE_LETTER_ALLOWED_EMAILS` | Allow-list gating the private Letter feature. |
| `SINGLE_USER_ENABLED`, `SINGLE_USER_USERNAME`, `SINGLE_USER_PASSWORD`, `SINGLE_USER_DISPLAY_NAME` | Optional private single-account mode. |
| `HSK_MATERIALS_DIR` | Directory of HSK PDFs/MP3s (defaults to repo-level `TaiLieu/`). |

## Local development

Backend (from `backend/`, needs a running Postgres + env vars):
```bash
./mvnw spring-boot:run
./mvnw test                      # all tests (Testcontainers — Docker must be running)
./mvnw test -Dtest=PronunciationServiceImplTest             # single class
./mvnw test -Dtest=PronunciationServiceImplTest#methodName  # single method
./mvnw package                   # build jar
```

Frontend (from `frontend/`):
```bash
npm install
npm run dev        # Vite dev server on 5173
npm run build      # tsc --noEmit (typecheck) + vite build — the typecheck gate
```

tts-service (from `tts-service/`):
```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001
python scripts/eval_tone.py        # tone-engine evaluation / calibration helpers
```

## API overview

All endpoints are under `/api`. Authenticated routes require a `Bearer` JWT; the HSK
material/audio endpoints are deliberately public (loaded by native `<iframe>`/`<audio>`
tags that can't send the JWT header).

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/google`, `GET /api/auth/me`, `PATCH /api/auth/password`, `DELETE /api/auth/account` |
| Chat | `POST /api/conversations`, `GET /api/conversations`, `GET /api/conversations/{id}/messages`, `POST /api/conversations/{id}/messages`, `POST /api/conversations/{id}/voice-turn` |
| Pronunciation | `POST /api/pronunciation/assess`, `GET /api/pronunciation/history` |
| Translation | `POST /api/translation` |
| Writing | `POST /api/writing/prompts`, `POST /api/writing/feedback` |
| Audio / TTS | `GET /api/audio/**` |
| Letter | `GET /api/letter/kim-han` (allow-listed) |
| Health | `GET /api/health` |

`tts-service` exposes `GET /health`, `GET /tts` (synthesis), and `POST /tone-analyze`
(F0 tone analysis).

## Database

The schema is **Flyway-managed** (`backend/src/main/resources/db/migration/V*.sql`)
with `ddl-auto: validate`. Never edit an applied migration — add a new
`V<n>__*.sql`. Tables cover users, conversations/messages, and pronunciation scores
(scripted + unscripted), plus an optional tone-corpus collection.

## HSK materials

Large scanned PDFs and MP3s are **served from the filesystem**, never bundled into the
jar (`HskMaterialConfig`, `app.hsk.materials-dir`, defaults to repo-level `TaiLieu/`).
HSK study content must be **verbatim** from the source materials — HSK1 vocab is
transcribed; HSK2–4 are pending.

## Production HTTPS

Microphone access on a public domain requires HTTPS. The GCP Compose file includes
Caddy, which provisions and renews the TLS certificate automatically:

```bash
# DNS A records for the root domain and www must point to the VM.
# The cloud firewall must allow inbound TCP 80 and TCP/UDP 443.
DOMAIN=kanhim0105.com docker compose -f docker-compose.gcp.yml up -d --build
```

Open `https://<your-domain>` once DNS points to the VM and Caddy finishes
provisioning the certificate. For Google sign-in, also add the production origin as an
authorized JavaScript origin in the Google OAuth client.

## Reset everything

```bash
docker compose down -v   # also drops the database and stored audio
```

## More

- `CLAUDE.md` — guide for working in this repo (architecture + conventions).
- `spec/` — design source of truth; `spec/rounds/` — round-by-round build log.
- `spec/09-coding-standards.md` and `spec/10-pitfalls.md` — read before larger changes.
</content>
</invoke>
