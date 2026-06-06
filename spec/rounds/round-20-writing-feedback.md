# Round 20 — Writing feedback feature

> **Milestone:** M4
> **Effort:** M (40–60 min)
> **Prerequisites:** Round 19 complete
> **Blocks if:** nothing

## Goal

User submits a Chinese paragraph (optionally with a topic). Backend asks DeepSeek with a JSON-only system prompt, parses the JSON, returns the corrected text + comment list. UI renders both.

## Files to create

- `backend/src/main/java/com/chineseapp/dto/writing/WritingFeedbackRequest.java`
- `backend/src/main/java/com/chineseapp/dto/writing/WritingFeedbackResponse.java`
- `backend/src/main/java/com/chineseapp/service/WritingFeedbackService.java` (interface)
- `backend/src/main/java/com/chineseapp/service/impl/WritingFeedbackServiceImpl.java` (`@Service`)
- `backend/src/main/java/com/chineseapp/controller/WritingController.java`
- `backend/src/test/java/com/chineseapp/service/WritingFeedbackServiceImplTest.java`
- `frontend/src/types/writing.ts`
- `frontend/src/hooks/useWritingFeedback.ts`
- `frontend/src/features/writing/WritingTab.tsx`
- `frontend/src/features/writing/WritingFeedbackPanel.tsx`

## Files to modify

- `frontend/src/App.tsx` — enable Write tab; route to `WritingTab`.

## Steps

### Backend

1. DTOs:
   ```java
   public record WritingFeedbackRequest(@NotBlank String text, String topic) {}

   public record Comment(String issue, String suggestion, String severity) {}
   public record WritingFeedbackResponse(String correctedText, List<Comment> comments) {}
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

### Frontend

5. `types/writing.ts` — mirror DTOs.
6. `useWritingFeedback.ts` — mutation hook to `/writing/feedback`.
7. `WritingFeedbackPanel.tsx`:
   - Top: corrected text in a styled block.
   - Below: list of comments, each rendered with a severity-color left border:
     - `info` → slate
     - `warn` → yellow
     - `error` → red
   - Each comment shows `issue` (bold) and `suggestion` (muted).
8. `WritingTab.tsx`:
   - Two-pane layout: left = textarea + optional "Topic" input + Submit; right = `WritingFeedbackPanel` when result arrives.
9. Enable `write: true` in `App.tsx` TabBar.

## References

- `spec/07-external-apis.md` §7.1 (writing prompt)
- `spec/10-pitfalls.md` § markdown fences

## Verification

- [ ] `./mvnw test` passes.
- [ ] "我昨天去了学校了" → response flags duplicated `了`.
- [ ] "我昨天去学校了" → response has zero or trivial comments.
- [ ] Garbage input ("asdfghjkl") → service still returns valid JSON (LLM may return empty corrections) or `ApiException` rendered as a friendly error toast.
- [ ] No console errors in DevTools.

## When complete

1. Update Round 20 status.
2. Report: "Round 20 done. Milestone 4 (Translation & Writing) complete. Next: Round 21 — final polish."
3. **Stop.**
