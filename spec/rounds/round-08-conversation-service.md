# Round 08 — Conversation service + error handling

> **Milestone:** M1
> **Effort:** M (45–60 min)
> **Prerequisites:** Round 07 complete
> **Blocks if:** nothing

## Goal

`ConversationService` orchestrates user message → LLM → assistant message persistence. Global error handling returns uniform `ErrorBody`. Service has unit tests with mocked dependencies.

## Files to create

- `backend/src/main/java/com/chineseapp/exception/ApiException.java`
- `backend/src/main/java/com/chineseapp/exception/GlobalExceptionHandler.java`
- `backend/src/main/java/com/chineseapp/dto/chat/ChatRequest.java`
- `backend/src/main/java/com/chineseapp/dto/chat/ChatResponse.java`
- `backend/src/main/java/com/chineseapp/dto/chat/MessageDto.java`
- `backend/src/main/java/com/chineseapp/dto/chat/ConversationDto.java`
- `backend/src/main/java/com/chineseapp/service/ConversationService.java`
- `backend/src/test/java/com/chineseapp/service/ConversationServiceTest.java`

## Files to modify

- `backend/src/main/java/com/chineseapp/client/OpenAiCompatibleLlmClient.java` — replace the temporary `RuntimeException` from Round 7 with `ApiException(HttpStatus.BAD_GATEWAY, ...)`.

## Steps

1. Create `ApiException` exactly as in `spec/05-backend.md` § "Error handling".
2. Create `GlobalExceptionHandler` exactly as in `spec/05-backend.md` § "Error handling".
3. Create DTOs as Java records:
   ```java
   public record ChatRequest(@NotBlank String content) {}

   public record MessageDto(UUID id, String role, String content, String audioUrl, Instant createdAt) {
       public static MessageDto from(Message m) {
           String audioUrl = m.getAudioPath() == null ? null : "/api/audio/" + m.getAudioPath();
           return new MessageDto(m.getId(), m.getRole(), m.getContent(), audioUrl, m.getCreatedAt());
       }
   }

   public record ConversationDto(UUID id, String title, Instant createdAt, Instant updatedAt) {
       public static ConversationDto from(Conversation c) { /* obvious */ }
   }

   public record ChatResponse(MessageDto userMessage, MessageDto assistantMessage) {}
   ```
4. Create `ConversationService` per `spec/05-backend.md` § "Service template":
   - Constructor injects `ConversationRepository`, `MessageRepository`, `LlmClient`.
   - `private static final String SYSTEM_PROMPT = """..."""` exactly per `spec/07-external-apis.md` §7.1 `ConversationService.SYSTEM_PROMPT`.
   - Methods:
     - `ConversationDto createConversation()` — creates, saves, returns DTO.
     - `List<ConversationDto> listConversations()` — `findAll` ordered by `updatedAt desc`.
     - `List<MessageDto> listMessages(UUID conversationId)`.
     - `ChatResponse sendMessage(UUID conversationId, String userText)` — per template. Prepends `LlmMessage("system", SYSTEM_PROMPT)` to history.
   - All write methods `@Transactional`.
   - Update `conversation.updatedAt` to `Instant.now()` on each send.
5. Update `OpenAiCompatibleLlmClient` to throw `ApiException(HttpStatus.BAD_GATEWAY, ...)` instead of `RuntimeException`.
6. Write `ConversationServiceTest`:
   - Mock `LlmClient` to return a fixed string.
   - Use in-memory repos via Mockito.
   - Assert two messages saved per `sendMessage` call.
   - Assert `ApiException` thrown when conversationId not found.

## References

- `spec/05-backend.md` § Service template, Error handling
- `spec/07-external-apis.md` §7.1 system prompt

## Verification

- [ ] `./mvnw test` passes including `ConversationServiceTest`.
- [ ] Code review: services return DTOs only, never `Conversation` / `Message` entities.
- [ ] `GlobalExceptionHandler` is the only `@RestControllerAdvice` in the codebase.

## When complete

1. Update Round 08 status.
2. Report: "Round 08 done. Next: Round 09 — Conversation REST API."
3. **Stop.**
