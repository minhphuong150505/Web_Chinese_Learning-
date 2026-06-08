# Round 19 — Translation feature

> **Milestone:** M4 (Translation & Writing feedback)
> **Effort:** S–M (30–45 min)
> **Prerequisites:** Round 18 complete
> **Blocks if:** nothing (uses the same `LLM_API_KEY` already in `.env`)

## Goal

User types Vietnamese or Chinese, picks direction, clicks Translate, sees the result. No persistence.

The UI side — types, hook, two-pane form, direction toggle — is **already built and running against mock data** (see `spec/06-frontend.md` § Pre-built frontend & the mock seam). This round is mostly backend: build the service + controller, then retire the translation mock handler.

## Files to create

- `backend/src/main/java/com/chineseapp/dto/translation/TranslationRequest.java`
- `backend/src/main/java/com/chineseapp/dto/translation/TranslationResponse.java`
- `backend/src/main/java/com/chineseapp/service/TranslationService.java` (interface)
- `backend/src/main/java/com/chineseapp/service/impl/TranslationServiceImpl.java` (`@Service`)
- `backend/src/main/java/com/chineseapp/controller/TranslationController.java`
- `backend/src/test/java/com/chineseapp/service/TranslationServiceImplTest.java`

## Already built (do not recreate)

- `frontend/src/types/translation.ts`:
  ```ts
  export type Direction = 'VI_TO_ZH' | 'ZH_TO_VI';
  export interface TranslationRequest { text: string; direction: Direction }
  export interface TranslationResponse { translation: string }
  ```
- `frontend/src/hooks/useTranslation.ts` — mutation hook posting `{ text, direction }` to `/translation`.
- `frontend/src/features/translation/TranslationForm.tsx` — two-pane layout (textarea + direction toggle/swap on the left, read-only result on the right); Translate button disabled while empty/pending.
- `frontend/src/features/translation/TranslationTab.tsx` — wraps the form with a heading.
- The Translate tab is already enabled in `App.tsx`.

If your backend `TranslationRequest`/`TranslationResponse` differ from the above, **adjust the backend DTOs to match** — that's the contract the UI was built against.

## Files to modify

- `frontend/src/mocks/server.ts` — delete the translation mock handler.
- `frontend/src/mocks/data.ts` — delete fixtures that become unused once that handler is gone.

## Steps

### Backend

1. DTOs:
   ```java
   public record TranslationRequest(@NotBlank String text, @NotNull Direction direction) {
       public enum Direction { VI_TO_ZH, ZH_TO_VI }
   }
   public record TranslationResponse(String translation) {}
   ```
2. `TranslationService` interface + `TranslationServiceImpl` (`@Service`) per `spec/05-backend.md` § "Service interface pattern". Interface: `TranslationResponse translate(TranslationRequest req)` (no DB, no user scoping needed — only a valid token is required at the controller):
   ```java
   @Service
   public class TranslationServiceImpl implements TranslationService {
       private static final String SYSTEM_PROMPT_VI_TO_ZH = """
           You translate Vietnamese to Simplified Chinese.
           - Output ONLY the Chinese translation, no commentary.
           - Use natural modern Mandarin (Mainland), not Classical Chinese.
           """;
       private static final String SYSTEM_PROMPT_ZH_TO_VI = """
           You translate Simplified Chinese to Vietnamese.
           - Output ONLY the Vietnamese translation, no commentary.
           - Use natural modern Vietnamese.
           """;

       private final LlmClient llm;

       public TranslationServiceImpl(LlmClient llm) { this.llm = llm; }

       public TranslationResponse translate(TranslationRequest req) {
           String system = switch (req.direction()) {
               case VI_TO_ZH -> SYSTEM_PROMPT_VI_TO_ZH;
               case ZH_TO_VI -> SYSTEM_PROMPT_ZH_TO_VI;
           };
           String out = llm.chat(List.of(
               new LlmClient.LlmMessage("system", system),
               new LlmClient.LlmMessage("user", req.text())
           ));
           return new TranslationResponse(out.trim());
       }
   }
   ```
3. `TranslationController` per controller template:
   ```java
   @RestController
   @RequestMapping("/api/translation")
   @Validated
   public class TranslationController {
       private final TranslationService service;
       public TranslationController(TranslationService service) { this.service = service; }
       @PostMapping
       public ResponseEntity<TranslationResponse> translate(@Valid @RequestBody TranslationRequest req) {
           return ResponseEntity.ok(service.translate(req));
       }
   }
   ```
4. Service test: mock `LlmClient`, assert system prompt is the VI→ZH one when direction is `VI_TO_ZH`, etc.

### Frontend (mock retirement only)

5. In `frontend/src/mocks/server.ts`, remove `mock.onPost('/translation')`.
6. In `frontend/src/mocks/data.ts`, remove now-unused exports (`TRANSLATION_SAMPLES`, `mockTranslate`) and their dangling imports in `server.ts`.
7. Run the app with the backend up. `/translation` now falls through (`onNoMatch: 'passthrough'`) to the real backend — no component change needed.

## References

- `spec/05-backend.md` § Service template, Controller template
- `spec/06-frontend.md` § Pre-built frontend & the mock seam
- `spec/07-external-apis.md` §7.1 system prompts
- `spec/11-sample-content.md` §11.3 (sample pairs for manual verification)

## Verification

- [ ] `./mvnw test` passes.
- [ ] In the UI, "Tôi đang học tiếng Trung" + VI→ZH → returns "我在学中文" (or close) — a real LLM response, no longer the `[demo translation to ...]` mock stub.
- [ ] "我爱你" + ZH→VI → returns "Tôi yêu bạn" (or close).
- [ ] Empty text → Translate disabled.
- [ ] Backend logs do not echo the user text at INFO (privacy).

## When complete

1. Update Round 19 status.
2. Report: "Round 19 done. Next: Round 20 — Writing feedback feature."
3. **Stop.**
