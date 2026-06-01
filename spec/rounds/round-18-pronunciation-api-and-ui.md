# Round 18 — Pronunciation API + UI

> **Milestone:** M3
> **Effort:** M–L (60–90 min)
> **Prerequisites:** Round 17 complete
> **Blocks if:** nothing

## Goal

User records a sentence in the browser → blob uploads as multipart → backend returns scores → `ScorePanel` renders them.

## Files to create

- `backend/src/main/java/com/chineseapp/controller/PronunciationController.java`
- `backend/src/test/java/com/chineseapp/controller/PronunciationControllerTest.java`
- `frontend/src/types/pronunciation.ts`
- `frontend/src/hooks/usePronunciation.ts`
- `frontend/src/features/pronunciation/ScorePanel.tsx`

## Files to modify

- `frontend/src/features/pronunciation/PronunciationTab.tsx` — wire the recorded blob to the API; show `ScorePanel` when result arrives.

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

### Frontend

3. `types/pronunciation.ts` — mirror the backend DTOs.
4. `hooks/usePronunciation.ts`:
   ```ts
   export function useAssessPronunciation() {
     return useMutation({
       mutationFn: async ({ blob, referenceText }: { blob: Blob; referenceText: string }) => {
         const fd = new FormData();
         fd.append('audio', blob, 'recording.webm');
         fd.append('referenceText', referenceText);
         const r = await apiClient.post<PronunciationResponse>('/pronunciation/assess', fd, {
           headers: { 'Content-Type': 'multipart/form-data' },
         });
         return r.data;
       },
     });
   }
   ```
5. `ScorePanel.tsx` per `spec/06-frontend.md` § `ScorePanel.tsx`:
   - Four numeric cards (accuracy / fluency / completeness / prosody).
   - Per-word table with three columns: word, score, syllables (`"ni3 / hao3"`).
   - Background color rule: green ≥85, yellow 60–84, red <60.
6. `PronunciationTab.tsx`:
   ```tsx
   const REFERENCE = '你好，今天天气怎么样？';
   // ... state: lastBlob, result
   // RecordButton onComplete -> setLastBlob
   // Submit button -> mutate({ blob, referenceText: REFERENCE })
   // on success -> setResult(data)
   // <ScorePanel result={result} /> when result
   ```
   - Disable Submit when no blob or while mutation pending.

## References

- `spec/05-backend.md` § REST endpoints
- `spec/06-frontend.md` § `ScorePanel.tsx`, `RecordButton.tsx`
- `spec/10-pitfalls.md` § multipart field name mismatch

## Verification

- [ ] `./mvnw test` passes.
- [ ] Record the reference sentence well → 4 high scores + per-word table mostly green.
- [ ] Mispronounce a syllable deliberately → that word's row goes yellow/red.
- [ ] `psql ... -c "SELECT count(*) FROM pronunciation_scores"` increments by 1 per submission.
- [ ] Without mic permission → friendly error in UI (already done in Round 14).
- [ ] No console errors.

## When complete

1. Update Round 18 status.
2. Report: "Round 18 done. Milestone 3 (Pronunciation) complete. Next: Round 19 — Translation feature."
3. **Stop.**
