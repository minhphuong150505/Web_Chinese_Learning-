# Round 17 — Pronunciation domain (V2 + service)

> **Milestone:** M3
> **Effort:** M–L (60–90 min)
> **Prerequisites:** Round 16 complete
> **Blocks if:** nothing

## Goal

V2 migration creates `pronunciation_scores`. JPA entity + repo + DTOs. `PronunciationService` ties together upload → conversion → Azure → JSON parsing → persistence.

## Files to create

- `backend/src/main/resources/db/migration/V2__pronunciation_scores.sql`
- `backend/src/main/java/com/chineseapp/entity/PronunciationScore.java`
- `backend/src/main/java/com/chineseapp/repository/PronunciationScoreRepository.java`
- `backend/src/main/java/com/chineseapp/dto/pronunciation/PronunciationResponse.java`
- `backend/src/main/java/com/chineseapp/dto/pronunciation/WordScore.java`
- `backend/src/main/java/com/chineseapp/service/PronunciationService.java` (interface)
- `backend/src/main/java/com/chineseapp/service/impl/PronunciationServiceImpl.java` (`@Service`)
- `backend/src/test/java/com/chineseapp/service/PronunciationServiceImplTest.java`

## Files to modify

(none)

## Steps

1. Create `V2__pronunciation_scores.sql` **exactly** as in `spec/04-database.md` § V2.
2. Create entity `PronunciationScore`:
   - Fields per migration. For `word_details` (`JSONB`), use:
     ```java
     @JdbcTypeCode(SqlTypes.JSON)
     @Column(name = "word_details", nullable = false, columnDefinition = "jsonb")
     private String wordDetailsJson;
     ```
   - The service is responsible for serializing the `List<WordScore>` to JSON before save and deserializing on read.
3. Create repo:
   ```java
   public interface PronunciationScoreRepository extends JpaRepository<PronunciationScore, UUID> {
       List<PronunciationScore> findTop20ByOrderByCreatedAtDesc();
   }
   ```
4. Create DTOs (records):
   ```java
   public record WordScore(
       String word,
       double accuracyScore,
       String errorType,
       List<SyllableScore> syllables,
       List<PhonemeScore> phonemes
   ) {
       public record SyllableScore(String syllable, double accuracyScore) {}
       public record PhonemeScore(String phoneme, double accuracyScore) {}
   }

   public record PronunciationResponse(
       UUID id,
       String referenceText,
       String recognizedText,
       double accuracy,
       double fluency,
       double completeness,
       Double prosody,
       double pronScore,
       List<WordScore> words,
       Instant createdAt
   ) {}
   ```
5. Create the `PronunciationService` interface and `PronunciationServiceImpl` (`@Service`, `implements PronunciationService`) per `spec/05-backend.md` § "Service interface pattern". The method `assess(MultipartFile audio, String referenceText)` (Round 24 adds a leading `UUID userId` param + sets it on the saved score):
   - Constructor injects: `AudioConversionService`, `AzureSpeechClient`, `PronunciationScoreRepository`, `ObjectMapper` (Spring's default Jackson bean).
   - Steps:
     1. Save the multipart file to a temp WebM file (`File.createTempFile`).
     2. `File wav = audioConv.toWav16kMono(webm);`
     3. `AssessmentRawResult raw = azure.assess(wav, referenceText);`
     4. Parse `raw.detailedJson` → walk the NBest tree to extract per-word scores into `List<WordScore>`. Helper method `parseWordScores(String detailedJson)` returning the list. Reference the JSON shape in `spec/04-database.md` § "word_details JSON shape".
     5. Build `PronunciationScore` entity with `UUID.randomUUID()`, serialize the word list to JSON via `objectMapper.writeValueAsString(words)`, save.
     6. Return `PronunciationResponse`.
   - Cleanup: `webm.delete()`, `wav.delete()` in a finally block. Ignore failures.
   - Wrap parse errors as `ApiException(HttpStatus.BAD_GATEWAY, "Azure response unparseable")`.
6. Add `historyTop20()` method returning `List<PronunciationResponse>` from the repo.
7. Write `PronunciationServiceTest`:
   - Mock `AudioConversionService` and `AzureSpeechClient`.
   - Provide a captured-shape Azure JSON sample as a test resource (`src/test/resources/azure-sample.json`) — extract from Azure docs or a one-time real call.
   - Assert `WordScore` count and first word's `accuracyScore` match the sample.
   - Assert one row saved.

## References

- `spec/04-database.md` § V2 + `word_details` JSON shape
- `spec/05-backend.md` § Service template
- `spec/07-external-apis.md` §7.2

## Verification

- [ ] `./mvnw test` passes including parse test.
- [ ] `docker compose up backend` boots, Flyway applies V2, `\dt` lists `pronunciation_scores`.
- [ ] Manually call service via temp `CommandLineRunner` with a recorded WebM (from Round 14 console log → save the blob via DevTools) → row appears in DB and JSON shape matches.

## When complete

1. Update Round 17 status.
2. Report: "Round 17 done. Next: Round 18 — Pronunciation API + UI."
3. **Stop.**
