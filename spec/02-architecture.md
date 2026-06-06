# 02 — System Architecture

## Topology

```
┌─────────────────────────── Docker Compose ───────────────────────────┐
│                                                                       │
│   ┌──────────────┐      ┌──────────────────┐    ┌────────────────┐  │
│   │  frontend    │      │     backend      │    │  tts-service   │  │
│   │  React+Vite  │◄────►│   Spring Boot    │───►│   FastAPI      │  │
│   │  :5173       │ HTTP │   :8080          │    │   :8001        │  │
│   └──────────────┘      └────────┬─────────┘    └────────────────┘  │
│                                  │                                    │
│                                  ▼                                    │
│                         ┌─────────────────┐                          │
│                         │   postgres      │                          │
│                         │   :5432         │                          │
│                         └─────────────────┘                          │
└───────────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼────────────────┐
              ▼               ▼                ▼
      DeepSeek API    Azure Speech API   (edge-tts uses
   (chat/translate/    (pronunciation     Microsoft Edge
       writing)         assessment)       cloud directly)
```

## Boundaries

- **Frontend never calls external APIs.** All third-party calls (DeepSeek, Azure) originate from the backend so keys stay server-side. **Exception:** the frontend talks to Google Sign-In directly to obtain a Google ID token — but only the backend verifies it (see Auth flow below).
- **TTS service is internal.** Only the backend calls it (`http://tts-service:8001/tts`). The frontend never hits it directly.
- **Database is internal.** Only the backend connects to PostgreSQL.
- **Every `/api/**` endpoint requires a valid app JWT, except three public routes:** `/api/health`, `/api/auth/google`, and `/api/audio/**` (the last is fetched by a native `<audio>` tag that can't send the header; guarded by unguessable UUID filenames — see `05-backend.md`). For all authed routes the backend resolves the JWT to the current `User` and scopes data access to that user.

## Auth flow (Round 22–25)

```
┌──────────┐  1. Google Sign-In (browser ↔ Google)
│ Frontend │ ─────────────────────────────► Google
│          │ ◄───────────── Google ID token (JWT signed by Google)
└────┬─────┘
     │ 2. POST /api/auth/google { idToken }
     ▼
┌──────────────────┐  3. GoogleIdTokenVerifier.verify(idToken)  ──► Google certs
│ AuthController    │     (checks signature + audience = GOOGLE_CLIENT_ID)
│  → AuthService    │  4. find-or-create User(email, googleSub, displayName)
│                   │  5. JwtService.issue(user) → app JWT (HS256, multi-day exp)
└────┬──────────────┘
     │ 6. { token, user }
     ▼
  Frontend stores token; every later request sends `Authorization: Bearer <app-jwt>`
     │
     ▼
┌──────────────────┐  JwtAuthFilter validates app JWT on each request,
│ JwtAuthFilter     │  loads the User, sets SecurityContext.
└──────────────────┘  Controllers read the current user via @AuthenticationPrincipal.
```

- The **Google ID token is used once** (at `/api/auth/google`); after that the app JWT is the only credential.
- The app JWT is **stateless** — no server-side session table. Signed with `JWT_SECRET`.

## Per-feature data flow

### Chat (Rounds 6–13)

```
User types Chinese
   │
   ▼  POST /api/conversations/{id}/messages
Frontend (axios)
   │
   ▼
ConversationController
   │
   ▼
ConversationService
   ├─► MessageRepository.save(user message)
   ├─► LlmClient.chat(history) ──────► DeepSeek
   ├─► TtsService.synthesize(reply) ─► tts-service ─► writes /data/audio/{uuid}.mp3
   └─► MessageRepository.save(assistant message with audio_path)
   │
   ▼ ChatResponse
Frontend renders bubble + <audio autoPlay>
```

### Pronunciation (Rounds 14–18)

```
User reads reference text aloud
   │
   ▼ MediaRecorder → WebM blob
Frontend
   │
   ▼ POST /api/pronunciation/assess (multipart: audio + referenceText)
PronunciationController
   │
   ▼
PronunciationService
   ├─► save WebM to tmp
   ├─► AudioConversionService → ffmpeg → 16k mono WAV
   ├─► AzureSpeechClient.assess(wav, referenceText) ─► Azure Speech
   ├─► parse NBest JSON
   └─► PronunciationScoreRepository.save
   │
   ▼ PronunciationResponse (scores + word details)
Frontend renders ScorePanel
```

### Translation & Writing feedback (Rounds 19–20)

```
User types text
   │
   ▼ POST /api/translation OR /api/writing/feedback
Controller
   │
   ▼
Service ─► LlmClient.chat(systemPrompt + userText) ─► DeepSeek
   │
   ▼ TranslationResponse / WritingFeedbackResponse
Frontend renders result pane
```

No DB persistence for translation/writing in v1 (out of scope).

## Concurrency & timing assumptions

- Multiple users may be active concurrently, but each user's requests are sequential and touch only their own rows (scoped by `user_id`), so there is no cross-user write contention. No row-level locking needed in v1.
- DeepSeek chat: 60s backend timeout, 90s frontend timeout.
- Azure pronunciation: 30s timeout on `recognizeOnceAsync().get(...)`.
- edge-tts: ~2s typical; treat failure as non-fatal (chat continues without audio).
