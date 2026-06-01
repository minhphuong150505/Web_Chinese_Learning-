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

- **Frontend never calls external APIs.** All third-party calls (DeepSeek, Azure) originate from the backend so keys stay server-side.
- **TTS service is internal.** Only the backend calls it (`http://tts-service:8001/tts`). The frontend never hits it directly.
- **Database is internal.** Only the backend connects to PostgreSQL.

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

- One user, sequential requests. No concurrent-write contention.
- DeepSeek chat: 60s backend timeout, 90s frontend timeout.
- Azure pronunciation: 30s timeout on `recognizeOnceAsync().get(...)`.
- edge-tts: ~2s typical; treat failure as non-fatal (chat continues without audio).
