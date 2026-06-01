# 05 — Backend Design

## Layered architecture (strict)

```
HTTP request
   │
   ▼
Controller   ── validates DTO, calls Service, maps to ResponseEntity
   │
   ▼
Service      ── orchestrates: repositories + clients; owns transactions
   │
   ├──► Repository (Spring Data JPA)
   └──► Client     (external API: DeepSeek, Azure, edge-tts)
```

**Hard rules:**

- Controllers MUST NOT call clients or repositories directly.
- Services MUST NOT return JPA entities to controllers — map to DTOs.
- Clients MUST NOT know about JPA entities or controller DTOs — they own their own request/response models.
- No business logic in controllers (validation + delegation only).
- No HTTP types (`ResponseEntity`, `HttpStatus`) in services.

## Package responsibilities

| Package | Responsibility | May depend on |
|---------|----------------|---------------|
| `controller` | HTTP mapping, validation | `service`, `dto` |
| `service` | Business logic, orchestration | `repository`, `client`, `entity`, `dto` |
| `client` | External API calls | (its own internal models) |
| `repository` | Data access | `entity` |
| `entity` | JPA entities | — |
| `dto` | Request/response shapes | — |
| `config` | Configuration beans | Spring framework only |
| `exception` | App errors + handler | `dto` |

## Controller template

```java
@RestController
@RequestMapping("/api/<resource>")
@Validated
public class FooController {

    private final FooService service;

    public FooController(FooService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<FooResponse> create(@Valid @RequestBody FooRequest req) {
        return ResponseEntity.ok(service.handle(req));
    }
}
```

- Constructor injection only. No field `@Autowired`.
- `@Valid` on every `@RequestBody`.
- Always return `ResponseEntity<T>` (consistent).

## Service template

```java
@Service
public class ConversationService {

    private final ConversationRepository convRepo;
    private final MessageRepository msgRepo;
    private final LlmClient llm;

    public ConversationService(ConversationRepository convRepo,
                               MessageRepository msgRepo,
                               LlmClient llm) {
        this.convRepo = convRepo;
        this.msgRepo  = msgRepo;
        this.llm      = llm;
    }

    @Transactional
    public ChatResponse sendMessage(UUID conversationId, String userText) {
        Conversation conv = convRepo.findById(conversationId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Conversation not found"));

        Message userMsg = new Message(UUID.randomUUID(), conv, "user", userText, null, Instant.now());
        msgRepo.save(userMsg);

        List<LlmClient.LlmMessage> history = msgRepo.findByConversationOrderByCreatedAtAsc(conv).stream()
            .map(m -> new LlmClient.LlmMessage(m.getRole(), m.getContent()))
            .toList();

        String assistantText = llm.chat(prependSystemPrompt(history));

        Message assistantMsg = new Message(UUID.randomUUID(), conv, "assistant",
                                            assistantText, null, Instant.now());
        msgRepo.save(assistantMsg);

        return ChatResponse.from(userMsg, assistantMsg);
    }
}
```

Notes:
- `@Transactional` at the service-method level for write paths.
- System prompt is a `private static final String` constant in the service (see `07-external-apis.md`).
- Service returns a DTO, never an entity.

## Client interface pattern

```java
public interface LlmClient {

    /** Non-streaming chat completion. */
    String chat(List<LlmMessage> messages);

    record LlmMessage(String role, String content) {}
}
```

Single implementation `OpenAiCompatibleLlmClient` serves both DeepSeek and Qwen via env-driven `base-url` + `model`.

## Error handling

`ApiException` is a `RuntimeException` carrying `HttpStatus` and a message.

```java
public class ApiException extends RuntimeException {
    private final HttpStatus status;
    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }
    public HttpStatus getStatus() { return status; }
}
```

Global handler:

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorBody> handleApi(ApiException ex) {
        return ResponseEntity.status(ex.getStatus())
            .body(new ErrorBody(ex.getStatus().name(), ex.getMessage(), Instant.now()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorBody> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> e.getField() + ": " + e.getDefaultMessage())
            .collect(Collectors.joining("; "));
        return ResponseEntity.badRequest().body(new ErrorBody("VALIDATION_FAILED", msg, Instant.now()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorBody> handleAny(Exception ex) {
        log.error("Unhandled error", ex);
        return ResponseEntity.internalServerError()
            .body(new ErrorBody("INTERNAL_ERROR", "Unexpected server error", Instant.now()));
    }

    public record ErrorBody(String error, String message, Instant timestamp) {}
}
```

## REST endpoints (full list)

| Method | Path | Body / Params | 200 Response | Round |
|--------|------|---------------|--------------|-------|
| `GET`  | `/api/health` | — | `{ "status": "UP" }` | 2 |
| `POST` | `/api/conversations` | (empty) | `ConversationDto` | 9 |
| `GET`  | `/api/conversations` | — | `[ConversationDto]` | 9 |
| `GET`  | `/api/conversations/{id}/messages` | — | `[MessageDto]` | 9 |
| `POST` | `/api/conversations/{id}/messages` | `{ content: string }` | `ChatResponse` | 9 (text), 13 (+audio) |
| `GET`  | `/api/audio/{filename}` | — | binary `audio/mpeg` | 12 |
| `POST` | `/api/pronunciation/assess` | multipart: `audio` + `referenceText` | `PronunciationResponse` | 18 |
| `GET`  | `/api/pronunciation/history` | `?limit=20` | `[PronunciationResponse]` | 18 |
| `POST` | `/api/translation` | `{ text, direction: "VI_TO_ZH"|"ZH_TO_VI" }` | `TranslationResponse` | 19 |
| `POST` | `/api/writing/feedback` | `{ text, topic? }` | `WritingFeedbackResponse` | 20 |

## `application.yml`

```yaml
spring:
  application:
    name: chinese-learning-app
  datasource:
    url: ${DB_URL:jdbc:postgresql://postgres:5432/chinese_app}
    username: ${DB_USER:chinese}
    password: ${DB_PASSWORD:chinese}
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate.format_sql: true
  flyway:
    enabled: true
    baseline-on-migrate: true

server:
  port: 8080

app:
  llm:
    provider: ${LLM_PROVIDER:deepseek}
    base-url: ${LLM_BASE_URL:https://api.deepseek.com}
    api-key:  ${LLM_API_KEY:}
    chat-model:      ${LLM_CHAT_MODEL:deepseek-chat}
    reasoning-model: ${LLM_REASONING_MODEL:deepseek-reasoner}
    timeout-seconds: ${LLM_TIMEOUT_SECONDS:60}
  tts:
    base-url: ${TTS_BASE_URL:http://tts-service:8001}
    voice:    ${TTS_VOICE:zh-CN-XiaoxiaoNeural}
    storage-dir: ${AUDIO_STORAGE_DIR:/data/audio}
  azure-speech:
    key:    ${AZURE_SPEECH_KEY:}
    region: ${AZURE_SPEECH_REGION:southeastasia}
    language: zh-CN

logging:
  level:
    com.chineseapp: INFO
    org.springframework.web: INFO
```

**Model name note:** the original prompt states `deepseek-chat` and `deepseek-reasoner` will be deprecated 2026-07-24. Implementer MUST verify at https://api-docs.deepseek.com/ when starting Round 7 and update `.env` defaults if needed. The code reads from env, so no source change is required.
