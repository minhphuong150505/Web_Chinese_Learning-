# Round 20 — Writing feedback feature

> **Milestone:** M4
> **Effort:** S–M (30–45 min)
> **Prerequisites:** Round 19 complete
> **Blocks if:** nothing

## Goal

User submits a Chinese paragraph (optionally with a topic). Backend asks DeepSeek with a JSON-only system prompt, parses the JSON, returns the corrected text + comment list. The already-built UI renders both.

The UI side — types, hook, two-pane layout, severity-colored comment cards — is **already built and running against mock data** (see `spec/06-frontend.md` § Pre-built frontend & the mock seam). This round is mostly backend: build the service + controller, then retire the writing-feedback mock handler.

## Files to create

- `backend/src/main/java/com/chineseapp/dto/writing/WritingFeedbackRequest.java`
- `backend/src/main/java/com/chineseapp/dto/writing/WritingFeedbackResponse.java`
- `backend/src/main/java/com/chineseapp/service/WritingFeedbackService.java` (interface)
- `backend/src/main/java/com/chineseapp/service/impl/WritingFeedbackServiceImpl.java` (`@Service`)
- `backend/src/main/java/com/chineseapp/controller/WritingController.java`
- `backend/src/test/java/com/chineseapp/service/WritingFeedbackServiceImplTest.java`

## Already built (do not recreate)

- `frontend/src/types/writing.ts`:
  ```ts
  export type CommentSeverity = 'info' | 'warn' | 'error';
  export interface WritingFeedbackRequest { text: string; topic: string | null }
  export interface WritingComment { issue: string; suggestion: string; severity: CommentSeverity }
  export interface WritingFeedbackResponse { correctedText: string; comments: WritingComment[] }
  ```
- `frontend/src/hooks/useWritingFeedback.ts` — mutation hook to `/writing/feedback`.
- `frontend/src/features/writing/WritingFeedbackPanel.tsx` — corrected text block + comment list with severity-colored left border (`info` → slate, `warn` → amber, `error` → red), `issue` bold / `suggestion` muted.
- `frontend/src/features/writing/WritingTab.tsx` — two-pane layout: left = topic input + textarea + Submit; right = `WritingFeedbackPanel` on success.
- The Write tab is already enabled in `App.tsx`.

If your backend `WritingFeedbackResponse` (in particular the `severity` enum values) differs from the above, **adjust the backend DTO to match** — that's the contract the UI was built against.

## Files to modify

- `frontend/src/mocks/server.ts` — delete the writing-feedback mock handler.
- `frontend/src/mocks/data.ts` — delete fixtures that become unused once that handler is gone.

## Steps

### Backend

1. DTOs:
   ```java
   public record WritingFeedbackRequest(@NotBlank String text, String topic) {}

   public record WritingFeedbackResponse(String correctedText, List<Comment> comments) {
       public record Comment(String issue, String suggestion, String severity) {}
   }
   ```
2. `WritingFeedbackService` interface + `WritingFeedbackServiceImpl` (`@Service`) per `spec/05-backend.md` § "Service interface pattern" (no DB, no user scoping — only a valid token at the controller):
   - `SYSTEM_PROMPT` exactly per `spec/07-external-apis.md` §7.1 `WritingFeedbackService.SYSTEM_PROMPT`.
   - Build user message: if `topic` present, prefix `"Topic: ${topic}\n\n"`, then the text.
   - Call `LlmClient.chat([system, user])`.
   - Defensively strip ` ```json ... ``` ` markdown fences if present.
   - `ObjectMapper.readValue(json, WritingFeedbackResponse.class)`.
   - On parse failure: throw `ApiException(HttpStatus.BAD_GATEWAY, "LLM returned non-JSON")` with the response body logged at DEBUG (not INFO, to avoid noisy logs).
3. `WritingController` per controller template.
4. Service test: mock `LlmClient` to return:
   - Valid JSON → assert deserialized fields.
   - JSON wrapped in fences → still parses (covers the strip logic).
   - Non-JSON garbage → `ApiException`.

### Frontend (mock retirement only)

5. In `frontend/src/mocks/server.ts`, remove `mock.onPost('/writing/feedback')`.
6. In `frontend/src/mocks/data.ts`, remove now-unused exports (`makeWritingFeedback`, `WRITING_PROMPT_TOPIC`/`WRITING_PROMPT_TEXT`/`WRITING_PROMPT_SAMPLE_INPUT` if the tab hardcodes its own copy) and their dangling imports in `server.ts`.
7. Run the app with the backend up. `/writing/feedback` now falls through (`onNoMatch: 'passthrough'`) to the real backend — no component change needed.

## References

- `spec/06-frontend.md` § Pre-built frontend & the mock seam
- `spec/07-external-apis.md` §7.1 (writing prompt)
- `spec/10-pitfalls.md` § markdown fences
- `spec/11-sample-content.md` §11.4 (prompt, sample input, fixture realism)

## Verification

- [ ] `./mvnw test` passes.
- [ ] "我昨天去了学校了" → response flags duplicated `了`, sourced from a real DeepSeek call (no longer the four scripted mock comments).
- [ ] "我昨天去学校了" → response has zero or trivial comments.
- [ ] Garbage input ("asdfghjkl") → service still returns valid JSON (LLM may return empty corrections) or `ApiException` rendered as a friendly error in the panel.
- [ ] No console errors in DevTools.

## When complete

1. Update Round 20 status.
2. Report: "Round 20 done. Milestone 4 (Translation & Writing) complete. Next: Round 22 — Auth foundation."
3. **Stop.**
