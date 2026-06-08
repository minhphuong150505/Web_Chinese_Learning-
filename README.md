# Web Chinese Learning

A multi-user web app for practicing Mandarin Chinese with an AI tutor. Learners sign
in with Google and get four practice modes, each backed by a real AI service:

- **Chat** — converse in Chinese with an LLM tutor; replies are spoken aloud (TTS).
- **Pronounce** — read a sentence aloud and get per-word pronunciation scoring (Azure Speech).
- **Translate** — translate between Vietnamese and Chinese in both directions.
- **Write** — submit a short paragraph and get structured writing feedback.

Each user sees only their own conversation and pronunciation history.

## Architecture

- **frontend** — React + Vite + TypeScript (served by nginx in Docker).
- **backend** — Spring Boot (Java 21), PostgreSQL + Flyway, stateless JWT auth.
- **tts-service** — Python text-to-speech microservice.

## Prerequisites

- Docker + Docker Compose.
- A `.env` file based on `.env.example` (see below).

## Quick start

```bash
cp .env.example .env
# Edit .env and set:
#   LLM_API_KEY              - your LLM provider key (chat, translation, writing)
#   AZURE_SPEECH_KEY         - Azure Speech key (pronunciation)
#   AZURE_SPEECH_REGION      - Azure Speech region
#   JWT_SECRET               - a long random secret (min 32 bytes), e.g. `openssl rand -base64 48`
#   GOOGLE_CLIENT_ID         - Google OAuth Web client id (used by backend AND frontend)
docker compose up --build
# open http://localhost:5173
```

`GOOGLE_CLIENT_ID` must be a Google OAuth **Web application** client id with
`http://localhost:5173` listed as an authorized JavaScript origin (see
`spec/07-external-apis.md` §7.4). The same value is used by the backend (to verify
Google ID tokens) and the frontend (to render the Google sign-in button).

URLs:

- Frontend: http://localhost:5173
- Backend: http://localhost:8080
- TTS service: http://localhost:8001

## How to reset everything

```bash
docker compose down -v   # also drops the database and stored audio
```

## More

See `spec/` for the design and `spec/rounds/` for the round-by-round implementation guide.
