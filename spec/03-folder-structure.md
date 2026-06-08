# 03 — Folder Structure

This tree is the **target** end state. Not every file exists in every round — see each round file for which files are added in that round.

```
Web_Chinese_Learning-/
├── Claude.md                        # behavioral rules (DO NOT EDIT)
├── PROMPT_CLAUDE_CODE.md            # original user prompt (DO NOT EDIT)
├── SPEC.md                          # pointer to spec/
├── README.md                        # quick-start (created in Round 1)
├── .env.example
├── .gitignore
├── docker-compose.yml
├── spec/                            # THIS DIRECTORY (DO NOT EDIT during impl)
│
├── backend/
│   ├── pom.xml
│   ├── mvnw, mvnw.cmd, .mvn/
│   ├── Dockerfile
│   └── src/
│       ├── main/
│       │   ├── java/com/chineseapp/
│       │   │   ├── ChineseAppApplication.java
│       │   │   ├── config/
│       │   │   │   ├── LlmProperties.java
│       │   │   │   ├── TtsProperties.java
│       │   │   │   ├── AzureSpeechProperties.java
│       │   │   │   ├── AuthProperties.java          # jwt secret/expiry + google client id (M5)
│       │   │   │   ├── WebClientConfig.java
│       │   │   │   ├── SecurityConfig.java          # filter chain, public vs authed routes (M5)
│       │   │   │   └── CorsConfig.java
│       │   │   ├── security/                        # M5 — auth plumbing
│       │   │   │   ├── JwtService.java              # issue + parse app JWT
│       │   │   │   ├── JwtAuthFilter.java           # OncePerRequestFilter
│       │   │   │   ├── GoogleTokenVerifier.java     # wraps GoogleIdTokenVerifier
│       │   │   │   └── CurrentUser.java             # principal record in SecurityContext
│       │   │   ├── controller/
│       │   │   │   ├── HealthController.java
│       │   │   │   ├── AuthController.java          # POST /api/auth/google, GET /api/auth/me (M5)
│       │   │   │   ├── ConversationController.java
│       │   │   │   ├── PronunciationController.java
│       │   │   │   ├── TranslationController.java
│       │   │   │   ├── WritingController.java
│       │   │   │   └── TtsController.java          # audio file serving
│       │   │   ├── service/                         # INTERFACES only (one per feature)
│       │   │   │   ├── AuthService.java             # M5
│       │   │   │   ├── ConversationService.java
│       │   │   │   ├── PronunciationService.java
│       │   │   │   ├── TranslationService.java
│       │   │   │   ├── WritingFeedbackService.java
│       │   │   │   ├── TtsService.java
│       │   │   │   ├── AudioConversionService.java
│       │   │   │   └── impl/                        # IMPLEMENTATIONS (@Service beans)
│       │   │   │       ├── AuthServiceImpl.java     # M5
│       │   │   │       ├── ConversationServiceImpl.java
│       │   │   │       ├── PronunciationServiceImpl.java
│       │   │   │       ├── TranslationServiceImpl.java
│       │   │   │       ├── WritingFeedbackServiceImpl.java
│       │   │   │       ├── TtsServiceImpl.java
│       │   │   │       └── AudioConversionServiceImpl.java
│       │   │   ├── client/
│       │   │   │   ├── LlmClient.java               # interface
│       │   │   │   ├── OpenAiCompatibleLlmClient.java
│       │   │   │   ├── AzureSpeechClient.java
│       │   │   │   └── EdgeTtsClient.java
│       │   │   ├── dto/
│       │   │   │   ├── auth/                         # M5
│       │   │   │   │   ├── GoogleLoginRequest.java   # { idToken }
│       │   │   │   │   ├── AuthResponse.java         # { token, user }
│       │   │   │   │   └── UserDto.java              # { id, email, displayName }
│       │   │   │   ├── chat/
│       │   │   │   │   ├── ChatRequest.java
│       │   │   │   │   ├── ChatResponse.java
│       │   │   │   │   ├── MessageDto.java
│       │   │   │   │   └── ConversationDto.java
│       │   │   │   ├── pronunciation/
│       │   │   │   │   ├── PronunciationResponse.java
│       │   │   │   │   └── WordScore.java
│       │   │   │   ├── translation/
│       │   │   │   │   ├── TranslationRequest.java
│       │   │   │   │   └── TranslationResponse.java
│       │   │   │   └── writing/
│       │   │   │       ├── WritingFeedbackRequest.java
│       │   │   │       └── WritingFeedbackResponse.java
│       │   │   ├── entity/
│       │   │   │   ├── User.java                     # M5
│       │   │   │   ├── Conversation.java             # gains user_id (M5)
│       │   │   │   ├── Message.java
│       │   │   │   └── PronunciationScore.java       # gains user_id (M5)
│       │   │   ├── repository/
│       │   │   │   ├── UserRepository.java           # M5
│       │   │   │   ├── ConversationRepository.java
│       │   │   │   ├── MessageRepository.java
│       │   │   │   └── PronunciationScoreRepository.java
│       │   │   └── exception/
│       │   │       ├── ApiException.java
│       │   │       └── GlobalExceptionHandler.java
│       │   └── resources/
│       │       ├── application.yml
│       │       └── db/migration/
│       │           ├── V1__init_schema.sql
│       │           ├── V2__pronunciation_scores.sql
│       │           ├── V3__users.sql                # M5 — users table
│       │           └── V4__add_user_id.sql          # M5 — user_id FK on owned tables
│       └── test/
│           └── java/com/chineseapp/...
│
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── .env.example
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── lib/
│       │   ├── apiClient.ts                 # axios interceptor attaches Bearer token (M5)
│       │   ├── authStorage.ts               # read/write app JWT in localStorage (M5)
│       │   └── queryClient.ts
│       ├── auth/                            # M5 — auth context
│       │   └── AuthProvider.tsx             # holds {user, token, login, logout}
│       ├── types/
│       │   ├── auth.ts                       # User, AuthResponse (M5)
│       │   ├── chat.ts
│       │   ├── pronunciation.ts
│       │   ├── translation.ts
│       │   └── writing.ts
│       ├── hooks/
│       │   ├── useAuth.ts                    # consumes AuthProvider context (M5)
│       │   ├── useGoogleLogin.ts             # POST /api/auth/google mutation (M5)
│       │   ├── useAudioRecorder.ts
│       │   ├── useConversation.ts
│       │   ├── useSendMessage.ts
│       │   ├── usePronunciation.ts
│       │   ├── useTranslation.ts
│       │   └── useWritingFeedback.ts
│       ├── features/
│       │   ├── auth/                         # M5
│       │   │   └── LoginScreen.tsx           # Google sign-in button; shown when logged out
│       │   ├── chat/
│       │   │   ├── ChatTab.tsx
│       │   │   ├── MessageList.tsx
│       │   │   ├── MessageBubble.tsx
│       │   │   └── MessageComposer.tsx
│       │   ├── pronunciation/
│       │   │   ├── PronunciationTab.tsx
│       │   │   ├── RecordButton.tsx
│       │   │   └── ScorePanel.tsx
│       │   ├── translation/
│       │   │   ├── TranslationTab.tsx
│       │   │   └── TranslationForm.tsx
│       │   └── writing/
│       │       ├── WritingTab.tsx
│       │       └── WritingFeedbackPanel.tsx
│       └── components/
│           ├── Layout.tsx
│           ├── TabBar.tsx
│           └── Spinner.tsx
│
└── tts-service/
    ├── Dockerfile
    ├── requirements.txt
    └── app/
        └── main.py
```

## Conventions

- Backend: package per layer; layer name = folder name.
- **Service layer is interface-first.** Each business service is an interface in `service/` with exactly one implementation `<Name>Impl` in `service/impl/`. Controllers and other services depend on the interface, never the `Impl`. The `@Service` annotation goes on the `Impl`. (See `05-backend.md` § "Service interface pattern".)
- Frontend: feature folders under `features/` own their components; cross-feature primitives live in `components/`.
- Hooks always live in `hooks/`, never inside a feature folder.
- The auth context provider (`auth/AuthProvider.tsx`) wraps the app in `main.tsx`; components reach it only through the `useAuth` hook.
- One React component per file. File name matches default export.
