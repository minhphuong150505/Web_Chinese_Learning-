# Round 09 — Conversation REST API + CORS

> **Milestone:** M1
> **Effort:** S–M (20–40 min)
> **Prerequisites:** Round 08 complete
> **Blocks if:** nothing

## Goal

`ConversationController` exposes the chat REST endpoints. Frontend dev origin (`http://localhost:5173`) can reach them. Curl roundtrip from request to DeepSeek reply works end-to-end.

## Files to create

- `backend/src/main/java/com/chineseapp/controller/ConversationController.java`
- `backend/src/main/java/com/chineseapp/config/CorsConfig.java`
- `backend/src/test/java/com/chineseapp/controller/ConversationControllerTest.java`

## Files to modify

(none)

## Steps

1. Create `CorsConfig`:
   ```java
   @Configuration
   public class CorsConfig {
       @Bean
       public WebMvcConfigurer corsConfigurer() {
           return new WebMvcConfigurer() {
               @Override
               public void addCorsMappings(CorsRegistry registry) {
                   registry.addMapping("/api/**")
                           .allowedOrigins("http://localhost:5173")
                           .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                           .allowedHeaders("*");
               }
           };
       }
   }
   ```
2. Create `ConversationController` per `spec/05-backend.md` § "REST endpoints":
   ```java
   @RestController
   @RequestMapping("/api/conversations")
   @Validated
   public class ConversationController {

       private final ConversationService service;

       public ConversationController(ConversationService service) {
           this.service = service;
       }

       @PostMapping
       public ResponseEntity<ConversationDto> create() {
           return ResponseEntity.ok(service.createConversation());
       }

       @GetMapping
       public ResponseEntity<List<ConversationDto>> list() {
           return ResponseEntity.ok(service.listConversations());
       }

       @GetMapping("/{id}/messages")
       public ResponseEntity<List<MessageDto>> messages(@PathVariable UUID id) {
           return ResponseEntity.ok(service.listMessages(id));
       }

       @PostMapping("/{id}/messages")
       public ResponseEntity<ChatResponse> send(@PathVariable UUID id,
                                                @Valid @RequestBody ChatRequest req) {
           return ResponseEntity.ok(service.sendMessage(id, req.content()));
       }
   }
   ```
3. Write `ConversationControllerTest` using `@WebMvcTest`:
   - `POST /api/conversations/{id}/messages` with empty content → 400 + `VALIDATION_FAILED`.
   - Missing conversation id → 404 (`ApiException`).
   - Mock `ConversationService`.

## References

- `spec/05-backend.md` § Controller template, REST endpoints
- `spec/10-pitfalls.md` § CORS

## Verification

- [ ] `./mvnw test` passes.
- [ ] `docker compose up --build backend postgres` boots cleanly.
- [ ] `curl -s -X POST http://localhost:8080/api/conversations | jq` returns `{id, title, createdAt, updatedAt}`.
- [ ] `curl -s -X POST -H 'Content-Type: application/json' -d '{"content":"你好"}' http://localhost:8080/api/conversations/<id>/messages` returns `ChatResponse` with a Chinese assistant reply.
- [ ] `curl -X POST -H 'Content-Type: application/json' -d '{"content":""}' .../messages` returns 400 with `ErrorBody`.
- [ ] CORS preflight from Vite dev origin works (verify in Round 10 once frontend is wired).

## When complete

1. Update Round 09 status.
2. Report: "Round 09 done. Backend chat works end-to-end via curl. Next: Round 10 — Chat UI."
3. **Stop.**
