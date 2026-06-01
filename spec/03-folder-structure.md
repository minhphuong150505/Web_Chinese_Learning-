# 03 — Folder Structure

This tree is the **target** end state. Not every file exists in every round — see each round file for which files are added in that round.

```
Web_Chinese_Learning/
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
│       │   │   │   ├── WebClientConfig.java
│       │   │   │   └── CorsConfig.java
│       │   │   ├── controller/
│       │   │   │   ├── HealthController.java
│       │   │   │   ├── ConversationController.java
│       │   │   │   ├── PronunciationController.java
│       │   │   │   ├── TranslationController.java
│       │   │   │   ├── WritingController.java
│       │   │   │   └── TtsController.java          # audio file serving
│       │   │   ├── service/
│       │   │   │   ├── ConversationService.java
│       │   │   │   ├── PronunciationService.java
│       │   │   │   ├── TranslationService.java
│       │   │   │   ├── WritingFeedbackService.java
│       │   │   │   ├── TtsService.java
│       │   │   │   └── AudioConversionService.java
│       │   │   ├── client/
│       │   │   │   ├── LlmClient.java               # interface
│       │   │   │   ├── OpenAiCompatibleLlmClient.java
│       │   │   │   ├── AzureSpeechClient.java
│       │   │   │   └── EdgeTtsClient.java
│       │   │   ├── dto/
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
│       │   │   │   ├── Conversation.java
│       │   │   │   ├── Message.java
│       │   │   │   └── PronunciationScore.java
│       │   │   ├── repository/
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
│       │           └── V2__pronunciation_scores.sql
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
│       │   ├── apiClient.ts
│       │   └── queryClient.ts
│       ├── types/
│       │   ├── chat.ts
│       │   ├── pronunciation.ts
│       │   ├── translation.ts
│       │   └── writing.ts
│       ├── hooks/
│       │   ├── useAudioRecorder.ts
│       │   ├── useConversation.ts
│       │   ├── useSendMessage.ts
│       │   ├── usePronunciation.ts
│       │   ├── useTranslation.ts
│       │   └── useWritingFeedback.ts
│       ├── features/
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
- Frontend: feature folders under `features/` own their components; cross-feature primitives live in `components/`.
- Hooks always live in `hooks/`, never inside a feature folder.
- One React component per file. File name matches default export.
