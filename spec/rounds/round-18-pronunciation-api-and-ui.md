# Round 18 — Pronunciation API

> **Milestone:** M3
> **Effort:** M (45–60 min)
> **Prerequisites:** Round 17 complete
> **Blocks if:** nothing

## Goal

User records a sentence in the browser → blob uploads as multipart → backend returns scores → the already-built `ScorePanel` renders them.

The UI side of this feature — types, hook, `ScorePanel`, and the wired-up `PronunciationTab` — is **already built and running against mock data** (see `spec/06-frontend.md` § Pre-built frontend & the mock seam). This round is almost entirely backend: build the controller, then retire the two pronunciation mock handlers so the existing screen talks to it.

## Files to create

- `backend/src/main/java/com/chineseapp/controller/PronunciationController.java`
- `backend/src/test/java/com/chineseapp/controller/PronunciationControllerTest.java`

## Already built (do not recreate)

- `frontend/src/types/pronunciation.ts` — mirrors the backend DTOs (`PronunciationResponse`, `WordScore`, `SyllableScore`, `PhonemeScore`).
- `frontend/src/hooks/usePronunciation.ts` — `useAssessPronunciation()` (multipart `FormData` mutation to `/pronunciation/assess`) and `usePronunciationHistory()`.
- `frontend/src/features/pronunciation/ScorePanel.tsx` — four metric cards (accuracy / fluency / completeness / prosody) + per-word table (word, score, syllables as `"ni3 / hao3"`), band-colored green ≥85 / amber 60–84 / red <60.
- `frontend/src/features/pronunciation/PronunciationTab.tsx` — records via `RecordButton`, submits `{ blob, referenceText: REFERENCE }`, renders `ScorePanel` on success, lists recent attempts.

If your backend `PronunciationResponse` shape differs from `frontend/src/types/pronunciation.ts`, **adjust the backend DTO to match** — that's the contract the UI was built against.

## Files to modify

- `frontend/src/mocks/server.ts` — delete the pronunciation mock handlers.
- `frontend/src/mocks/data.ts` — delete fixtures that become unused once those handlers are gone.

## Steps

### Backend

1. Create `PronunciationController`:
   ```java
   @RestController
   @RequestMapping("/api/pronunciation")
   @Validated
   public class PronunciationController {

       private final PronunciationService service;

       public PronunciationController(PronunciationService service) {
           this.service = service;
       }

       @PostMapping("/assess")
       public ResponseEntity<PronunciationResponse> assess(
           @RequestParam("audio") MultipartFile audio,
           @RequestParam("referenceText") @NotBlank String referenceText) {
           if (audio.isEmpty()) {
               throw new ApiException(HttpStatus.BAD_REQUEST, "Empty audio");
           }
           return ResponseEntity.ok(service.assess(audio, referenceText));
       }

       @GetMapping("/history")
       public ResponseEntity<List<PronunciationResponse>> history() {
           return ResponseEntity.ok(service.historyTop20());
       }
   }
   ```
2. Controller test:
   - Missing `audio` field → 400.
   - Empty multipart → 400.
   - Happy path with mocked service → returns expected `PronunciationResponse`.

### Frontend (mock retirement only)

3. In `frontend/src/mocks/server.ts`, remove:
   - `mock.onPost('/pronunciation/assess')`
   - `mock.onGet('/pronunciation/history')`
4. In `frontend/src/mocks/data.ts`, remove now-unused exports (`makePronunciationResult`, `makePronunciationHistory`, `PRONUNCIATION_REFERENCE_TEXT` if the tab hardcodes its own copy) and their dangling imports in `server.ts`.
5. Run the app with the backend up. `/pronunciation/assess` and `/pronunciation/history` now fall through (`onNoMatch: 'passthrough'`) to the real backend — no component change needed.

## References

- `spec/05-backend.md` § REST endpoints
- `spec/06-frontend.md` § `ScorePanel.tsx`, `RecordButton.tsx`, § Pre-built frontend & the mock seam
- `spec/10-pitfalls.md` § multipart field name mismatch
- `spec/11-sample-content.md` §11.2 (reference sentence)

## Verification

- [ ] `./mvnw test` passes.
- [ ] Record the reference sentence well → 4 high scores + per-word table mostly green, sourced from the real Azure-backed assessment (no longer the scripted mock numbers).
- [ ] Mispronounce a syllable deliberately → that word's row goes amber/red.
- [ ] `psql ... -c "SELECT count(*) FROM pronunciation_scores"` increments by 1 per submission.
- [ ] "Recent attempts" list reflects real history from `/pronunciation/history`, persists across refresh.
- [ ] Without mic permission → friendly error in UI (already verified in Round 14).
- [ ] No console errors.

## When complete

1. Update Round 18 status.
2. Report: "Round 18 done. Milestone 3 (Pronunciation) complete. Next: Round 19 — Translation feature."
3. **Stop.**
