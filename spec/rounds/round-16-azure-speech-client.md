# Round 16 — Azure Speech client

> **Milestone:** M3
> **Effort:** M (45–60 min)
> **Prerequisites:** Round 15 complete
> **BLOCKED until** the user provides `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` in `.env`. **Do not begin this round before that.**

## Pre-round checklist

1. Ask the user: "Do you have an Azure Speech resource? Free tier (F0) gives 5h/month. If yes, paste the key + region; if no, here is how to create one: https://learn.microsoft.com/azure/ai-services/speech-service/get-started-pronunciation-assessment ."
2. Once provided, the user updates `.env`:
   ```
   AZURE_SPEECH_KEY=<key>
   AZURE_SPEECH_REGION=<e.g. southeastasia>
   ```
3. Restart compose: `docker compose up -d backend`.

## Goal

`AzureSpeechClient` calls Azure Pronunciation Assessment on a WAV file and returns a structured result (top-level scores + raw NBest JSON). Standalone smoke test against the real service succeeds.

## Files to create

- `backend/src/main/java/com/chineseapp/config/AzureSpeechProperties.java`
- `backend/src/main/java/com/chineseapp/client/AzureSpeechClient.java`
- `backend/src/test/java/com/chineseapp/client/AzureSpeechClientSmokeTest.java` (real call; `@EnabledIfEnvironmentVariable(named = "AZURE_SPEECH_KEY", matches = ".+")`)

## Files to modify

- `backend/pom.xml` — add `com.microsoft.cognitiveservices.speech:client-sdk:1.40.0`.

## Steps

1. Add the Azure dependency to `pom.xml`:
   ```xml
   <dependency>
     <groupId>com.microsoft.cognitiveservices.speech</groupId>
     <artifactId>client-sdk</artifactId>
     <version>1.40.0</version>
   </dependency>
   ```
2. Create `AzureSpeechProperties` `@ConfigurationProperties("app.azure-speech")`:
   - `key`, `region`, `language` (default `zh-CN`).
   - Do not add `@Component`; `@ConfigurationPropertiesScan` was enabled in Round 7.
3. Create `AzureSpeechClient`:
   ```java
   @Component
   public class AzureSpeechClient {
       private final AzureSpeechProperties props;

       public AzureSpeechClient(AzureSpeechProperties props) {
           this.props = props;
       }

       public AssessmentRawResult assess(File wav, String referenceText) {
           try (SpeechConfig sc = SpeechConfig.fromSubscription(props.getKey(), props.getRegion());
                AudioConfig ac = AudioConfig.fromWavFileInput(wav.getAbsolutePath());
                SpeechRecognizer recognizer = new SpeechRecognizer(sc, props.getLanguage(), ac);
                PronunciationAssessmentConfig pac = new PronunciationAssessmentConfig(
                    referenceText,
                    PronunciationAssessmentGradingSystem.HundredMark,
                    PronunciationAssessmentGranularity.Phoneme,
                    true)) {

               pac.enableProsodyAssessment();   // REQUIRED: prosody score is null/0 without this
               pac.applyTo(recognizer);
               SpeechRecognitionResult result = recognizer.recognizeOnceAsync().get(30, TimeUnit.SECONDS);
               PronunciationAssessmentResult par = PronunciationAssessmentResult.fromResult(result);
               String detailedJson = result.getProperties()
                   .getProperty(PropertyId.SpeechServiceResponse_JsonResult);
               return new AssessmentRawResult(
                   result.getText(),
                   par.getAccuracyScore(),
                   par.getFluencyScore(),
                   par.getCompletenessScore(),
                   par.getProsodyScore(),
                   par.getPronunciationScore(),
                   detailedJson
               );
           } catch (TimeoutException e) {
               throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "Azure Speech timed out");
           } catch (Exception e) {
               throw new ApiException(HttpStatus.BAD_GATEWAY, "Azure Speech failed: " + e.getMessage());
           }
       }

       public record AssessmentRawResult(
           String recognizedText,
           double accuracy, double fluency, double completeness,
           Double prosody, double pron,
           String detailedJson
       ) {}
   }
   ```
   - Use try-with-resources for all SDK objects to avoid native handle leaks.
   - Prosody: `enableProsodyAssessment()` (step above) is what makes Azure return a prosody score — without it `getProsodyScore()` is always 0. Note `getProsodyScore()` returns a primitive `double`, so it autoboxes into the `Double prosody` field (never literally `null`); the field stays `Double` only so the rest of the chain (DTO, DB `NUMERIC(5,2)` nullable, UI) can still represent "no prosody" defensively.
4. Write `AzureSpeechClientSmokeTest`:
   - Only runs when `AZURE_SPEECH_KEY` is set (`@EnabledIfEnvironmentVariable`).
   - Use a short 16 kHz mono WAV containing spoken Mandarin from a local test fixture, or generate one from TTS during test setup and convert it to WAV. Do not use pure silence as the main smoke fixture because Azure may return an empty or non-assessment result.
   - Asserts `AssessmentRawResult` is non-null and `detailedJson` is non-blank.
5. **Do not commit a hardcoded key in this test.**

## References

- `spec/07-external-apis.md` §7.2
- `spec/10-pitfalls.md` § recognizeOnceAsync hangs

## Verification

- [ ] `./mvnw -Dtest=AzureSpeechClientSmokeTest test` passes with the key in env.
- [ ] Backend logs do not contain the Azure key.
- [ ] Image still boots without the key (smoke test is skipped; client wired but not called yet).

## When complete

1. Update Round 16 status.
2. Report: "Round 16 done. Next: Round 17 — Pronunciation domain (V2 + service)."
3. **Stop.**
