# Round 19 — Translation feature

> **Milestone:** M4 (Translation & Writing feedback)
> **Effort:** M (40–60 min)
> **Prerequisites:** Round 18 complete
> **Blocks if:** nothing (uses the same `LLM_API_KEY` already in `.env`)

## Goal

User types Vietnamese or Chinese, picks direction, clicks Translate, sees the result. No persistence.

## Files to create

- `backend/src/main/java/com/chineseapp/dto/translation/TranslationRequest.java`
- `backend/src/main/java/com/chineseapp/dto/translation/TranslationResponse.java`
- `backend/src/main/java/com/chineseapp/service/TranslationService.java` (interface)
- `backend/src/main/java/com/chineseapp/service/impl/TranslationServiceImpl.java` (`@Service`)
- `backend/src/main/java/com/chineseapp/controller/TranslationController.java`
- `backend/src/test/java/com/chineseapp/service/TranslationServiceImplTest.java`
- `frontend/src/types/translation.ts`
- `frontend/src/hooks/useTranslation.ts`
- `frontend/src/features/translation/TranslationTab.tsx`
- `frontend/src/features/translation/TranslationForm.tsx`

## Files to modify

- `frontend/src/App.tsx` — enable Translate tab; route to `TranslationTab`.

## Steps

### Backend

1. DTOs:
   ```java
   public enum Direction { VI_TO_ZH, ZH_TO_VI }

   public record TranslationRequest(@NotBlank String text, @NotNull Direction direction) {}
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

       public TranslationService(LlmClient llm) { this.llm = llm; }

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

### Frontend

5. `types/translation.ts`:
   ```ts
   export type Direction = 'VI_TO_ZH' | 'ZH_TO_VI';
   export interface TranslationResponse { translation: string }
   ```
6. `useTranslation.ts` — mutation hook posting to `/translation`.
7. `TranslationForm.tsx`:
   - Two-pane layout: left = textarea + direction selector, right = output read-only.
   - Direction toggle (radio or two buttons): "VI → ZH" / "ZH → VI".
   - Translate button calls the mutation; output appears on success.
8. `TranslationTab.tsx`: wraps the form with a heading.
9. Enable `translate: true` in `App.tsx` TabBar.

## References

- `spec/05-backend.md` § Service template, Controller template
- `spec/07-external-apis.md` §7.1 system prompts

## Verification

- [ ] `./mvnw test` passes.
- [ ] In the UI, "Tôi đang học tiếng Trung" + VI→ZH → returns "我在学中文" (or close).
- [ ] "我爱你" + ZH→VI → returns "Tôi yêu bạn" (or close).
- [ ] Empty text → Translate disabled.
- [ ] Backend logs do not echo the user text at INFO (privacy).

## When complete

1. Update Round 19 status.
2. Report: "Round 19 done. Next: Round 20 — Writing feedback feature."
3. **Stop.**
