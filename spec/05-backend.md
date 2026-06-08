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
- No HTTP types (`ResponseEntity`, `HttpStatus`) in services. **Exception:** `ApiException` carries an `HttpStatus`; services may throw it.
- **Each service is an interface (`service/`) with one implementation (`service/impl/<Name>Impl`).** Controllers depend on the interface. `@Service` goes on the `Impl`.
- **Every data-access service method takes the acting user's id (`UUID userId`) and scopes its query by it.** A user can never read or mutate another user's rows.

## Package responsibilities

| Package | Responsibility | May depend on |
|---------|----------------|---------------|
| `controller` | HTTP mapping, validation, reads current user | `service` (interfaces), `dto`, `security` (principal) |
| `service` (interface) | Business contract | `dto`, `entity` (types in signatures) |
| `service.impl` | Business logic, orchestration, user scoping | `service`, `repository`, `client`, `entity`, `dto` |
| `client` | External API calls | (its own internal models) |
| `repository` | Data access | `entity` |
| `entity` | JPA entities | — |
| `dto` | Request/response shapes | — |
| `security` | JWT issue/verify, auth filter, Google token verify | `config`, `entity`, `repository` |
| `config` | Configuration beans (incl. `SecurityConfig`) | Spring framework only |
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
    public ResponseEntity<FooResponse> create(@AuthenticationPrincipal CurrentUser user,
                                              @Valid @RequestBody FooRequest req) {
        return ResponseEntity.ok(service.handle(user.id(), req));
    }
}
```

- Constructor injection only. No field `@Autowired`.
- `@Valid` on every `@RequestBody`.
- Always return `ResponseEntity<T>` (consistent).
- The field type is the **service interface**, not the `Impl`.
- On every authenticated endpoint, take `@AuthenticationPrincipal CurrentUser user` and pass `user.id()` into the service. Never trust a user id from the request body or path.

## Service interface pattern

Every business service is split into an interface and one implementation:

```java
// service/ConversationService.java
public interface ConversationService {
    ConversationDto createConversation(UUID userId);
    List<ConversationDto> listConversations(UUID userId);
    List<MessageDto> listMessages(UUID userId, UUID conversationId);
    ChatResponse sendMessage(UUID userId, UUID conversationId, String userText);
}
```

```java
// service/impl/ConversationServiceImpl.java
@Service
public class ConversationServiceImpl implements ConversationService {
    // collaborators injected via constructor; @Service lives here, not on the interface
}
```

Rules:
- The interface declares only DTO-returning, user-scoped methods.
- Exactly one implementation per interface in v1 (Spring autowires by type).
- Controllers and other services inject the **interface**.

## Service template

```java
@Service
public class ConversationServiceImpl implements ConversationService {

    private final ConversationRepository convRepo;
    private final MessageRepository msgRepo;
    private final UserRepository userRepo;
    private final LlmClient llm;

    public ConversationServiceImpl(ConversationRepository convRepo,
                                   MessageRepository msgRepo,
                                   UserRepository userRepo,
                                   LlmClient llm) {
        this.convRepo = convRepo;
        this.msgRepo  = msgRepo;
        this.userRepo = userRepo;
        this.llm      = llm;
    }

    @Override
    @Transactional
    public ChatResponse sendMessage(UUID userId, UUID conversationId, String userText) {
        // Scope by BOTH ids — a conversation that isn't this user's is a 404, not a 403,
        // so we never reveal that another user's conversation exists.
        Conversation conv = convRepo.findByIdAndUserId(conversationId, userId)
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

## Security (Milestone 5)

### `SecurityConfig`

Stateless filter chain. CSRF disabled (no cookies — JWT in `Authorization` header). Public routes are `/api/health` and `/api/auth/google`; everything else requires authentication.

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwtFilter) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // /api/audio/** is public on purpose: it is fetched by a native <audio src>
                // tag, which cannot attach the Authorization header. Files are named with
                // unguessable UUID v4s, so this is an unguessable-link guard, not open listing.
                .requestMatchers("/api/health", "/api/auth/google", "/api/audio/**").permitAll()
                .anyRequest().authenticated())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(e -> e.authenticationEntryPoint(
                (req, res, ex) -> res.sendError(HttpStatus.UNAUTHORIZED.value(), "Unauthorized")));
        return http.build();
    }
}
```

### `JwtService`

- `String issue(User user)` — HS256, subject = `user.id`, claims `email` + `name`, expiry `app.auth.jwt.expiry-days`.
- `Optional<UUID> verify(String token)` — validates signature + expiry, returns the user id (subject), or empty on any failure. Never throws to the caller.
- Signing key from `JWT_SECRET` (min 32 bytes). The app refuses to start if the secret is blank (fail fast in `AuthProperties`).

### `JwtAuthFilter` (`OncePerRequestFilter`)

1. Read `Authorization: Bearer <token>`; if absent, continue the chain unauthenticated.
2. `jwtService.verify(token)` → user id; load `User` via `UserRepository`. If either fails, continue unauthenticated (the entry point returns 401 downstream).
3. Build a `CurrentUser` principal and set an authenticated `UsernamePasswordAuthenticationToken` into the `SecurityContext`.

```java
public record CurrentUser(UUID id, String email, String displayName) {}
```

Controllers receive it via `@AuthenticationPrincipal CurrentUser user`.

### `GoogleTokenVerifier`

Wraps Google's `GoogleIdTokenVerifier`:

```java
public Optional<GoogleProfile> verify(String idToken); // GoogleProfile(sub, email, name)
```

- Audience set to `app.auth.google.client-id`. Rejects tokens whose `aud` doesn't match.
- Returns empty on invalid/expired token; the service maps empty → `ApiException(UNAUTHORIZED, ...)`.

### `AuthService` flow (`AuthServiceImpl`)

```java
public AuthResponse loginWithGoogle(String googleIdToken) {
    GoogleProfile p = googleVerifier.verify(googleIdToken)
        .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid Google token"));
    User user = userRepo.findByGoogleSub(p.sub())
        .orElseGet(() -> userRepo.save(new User(UUID.randomUUID(), p.email(), p.sub(),
                                                p.name(), Instant.now())));
    return new AuthResponse(jwtService.issue(user), UserDto.from(user));
}
```

`AuthService` also exposes `UserDto me(UUID userId)` for `GET /api/auth/me`.

### Testing with auth (added in Round 22)

Adding security retroactively breaks earlier tests in two ways the implementer MUST handle:

1. **Context load fails** because `AuthProperties` requires `app.auth.jwt.secret` + `app.auth.google.client-id`. Fix once: a `backend/src/test/resources/application.yml` that supplies a dummy ≥32-byte secret and a dummy client id. This makes `@SpringBootTest` / Testcontainers tests boot again.
2. **Authed endpoints return 401, and `@WithMockUser` does NOT work** — it sets a `String`/`User` principal, so `@AuthenticationPrincipal CurrentUser` resolves to `null` → NPE. Provide a custom test annotation backed by `@WithSecurityContext`:

```java
// test sources
@Retention(RetentionPolicy.RUNTIME)
@WithSecurityContext(factory = WithMockCurrentUser.Factory.class)
public @interface WithMockCurrentUser {
    String id()    default "00000000-0000-0000-0000-000000000001";
    String email() default "tester@example.com";
    String name()  default "Tester";

    class Factory implements WithSecurityContextFactory<WithMockCurrentUser> {
        public SecurityContext createSecurityContext(WithMockCurrentUser a) {
            var principal = new CurrentUser(UUID.fromString(a.id()), a.email(), a.name());
            var auth = new UsernamePasswordAuthenticationToken(principal, null, List.of());
            SecurityContext ctx = SecurityContextHolder.createEmptyContext();
            ctx.setAuthentication(auth);
            return ctx;
        }
    }
}
```

Controller tests then annotate methods with `@WithMockCurrentUser` (and `@WebMvcTest` tests import `SecurityConfig` + the `JwtAuthFilter`/`JwtService` beans, or stub them). Round 22 lists which existing tests to update; Round 24 updates the controller tests whose method signatures gain `@AuthenticationPrincipal`.

## REST endpoints (full list)

**Auth column:** 🔓 = public, 🔒 = requires `Authorization: Bearer <app-jwt>`. All 🔒 endpoints operate only on the calling user's data.

| Auth | Method | Path | Body / Params | 200 Response | Round |
|------|--------|------|---------------|--------------|-------|
| 🔓 | `GET`  | `/api/health` | — | `{ "status": "UP" }` | 2 |
| 🔓 | `POST` | `/api/auth/google` | `{ idToken: string }` | `AuthResponse` `{ token, user }` | 23 |
| 🔒 | `GET`  | `/api/auth/me` | — | `UserDto` | 23 |
| 🔒 | `POST` | `/api/conversations` | (empty) | `ConversationDto` | 9 |
| 🔒 | `GET`  | `/api/conversations` | — | `[ConversationDto]` (caller's only) | 9 |
| 🔒 | `GET`  | `/api/conversations/{id}/messages` | — | `[MessageDto]` | 9 |
| 🔒 | `POST` | `/api/conversations/{id}/messages` | `{ content: string }` | `ChatResponse` | 9 (text), 13 (+audio) |
| 🔓† | `GET`  | `/api/audio/{filename}` | — | binary `audio/mpeg` | 12 |
| 🔒 | `POST` | `/api/pronunciation/assess` | multipart: `audio` + `referenceText` | `PronunciationResponse` | 18 |
| 🔒 | `GET`  | `/api/pronunciation/history` | — (returns the caller's latest 20) | `[PronunciationResponse]` (caller's only) | 18 |
| 🔒 | `POST` | `/api/translation` | `{ text, direction: "VI_TO_ZH"|"ZH_TO_VI" }` | `TranslationResponse` | 19 |
| 🔒 | `POST` | `/api/writing/feedback` | `{ text, topic? }` | `WritingFeedbackResponse` | 20 |

> Auth column added by Milestone 5 (Rounds 22–25). Before M5, feature endpoints are built unauthenticated; Round 24 wires them behind the filter and adds user scoping. `/api/translation` and `/api/writing/feedback` have no DB rows, so they only require a valid token — no per-user query.
>
> **† `/api/audio/{filename}` is public** because the browser fetches it via a native `<audio src>` element, which cannot send the `Authorization` header. The filename is an unguessable UUID v4, so it behaves like an unguessable share link. If true per-user audio protection is ever required, switch the frontend to fetch the bytes via `apiClient` (Bearer attached) into a blob URL and flip this route to `authenticated()`.

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
    chat-model:      ${LLM_CHAT_MODEL:deepseek-v4-flash}
    reasoning-model: ${LLM_REASONING_MODEL:deepseek-v4-pro}
    timeout-seconds: ${LLM_TIMEOUT_SECONDS:60}
  tts:
    base-url: ${TTS_BASE_URL:http://tts-service:8001}
    voice:    ${TTS_VOICE:zh-CN-XiaoxiaoNeural}
    storage-dir: ${AUDIO_STORAGE_DIR:/data/audio}
  azure-speech:
    key:    ${AZURE_SPEECH_KEY:}
    region: ${AZURE_SPEECH_REGION:southeastasia}
    language: zh-CN
  auth:
    jwt:
      secret:      ${JWT_SECRET:}          # required, min 32 bytes; app fails fast if blank
      expiry-days: ${JWT_EXPIRY_DAYS:7}
    google:
      client-id:   ${GOOGLE_CLIENT_ID:}    # OAuth client id; used as the token audience

logging:
  level:
    com.chineseapp: INFO
    org.springframework.web: INFO
```

**Model name note:** the original prompt states `deepseek-chat` and `deepseek-reasoner` will be deprecated 2026-07-24. Defaults use `deepseek-v4-flash` / `deepseek-v4-pro`, but the implementer MUST verify current model names at https://api-docs.deepseek.com/ when starting Round 7 and stop if they differ.
