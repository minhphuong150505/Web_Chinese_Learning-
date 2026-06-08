# Round 11 — Backend TTS client + service

> **Milestone:** M2 (TTS audio)
> **Effort:** S–M (25–40 min)
> **Prerequisites:** Round 10 complete; tts-service running in compose
> **Blocks if:** nothing

## Goal

Backend can call `tts-service`, save the returned MP3 to disk under `AUDIO_STORAGE_DIR`, and return the relative filename. Pure service logic — not yet wired into chat (that's Round 12) and not yet served to the frontend.

## Files to create

- `backend/src/main/java/com/chineseapp/config/TtsProperties.java`
- `backend/src/main/java/com/chineseapp/client/EdgeTtsClient.java`
- `backend/src/main/java/com/chineseapp/service/TtsService.java` (interface)
- `backend/src/main/java/com/chineseapp/service/impl/TtsServiceImpl.java` (`@Service`)
- `backend/src/test/java/com/chineseapp/service/TtsServiceImplTest.java`

## Files to modify

(none)

## Steps

1. Create `TtsProperties` `@ConfigurationProperties("app.tts")`:
   - Fields: `baseUrl` (String), `voice` (String), `storageDir` (String).
   - `@NotBlank` on each.
   - Do not add `@Component`; `@ConfigurationPropertiesScan` was enabled in Round 7.
2. Create `EdgeTtsClient`:
   ```java
   @Component
   public class EdgeTtsClient {
       private final WebClient webClient;
       private final TtsProperties props;

       public EdgeTtsClient(WebClient webClient, TtsProperties props) {
           this.webClient = webClient;
           this.props = props;
       }

       public byte[] synthesize(String text) {
           return webClient.get()
               .uri(URI.create(props.getBaseUrl() + "/tts?text=" +
                   URLEncoder.encode(text, StandardCharsets.UTF_8) +
                   "&voice=" + URLEncoder.encode(props.getVoice(), StandardCharsets.UTF_8)))
               .retrieve()
               .bodyToMono(byte[].class)
               .block(Duration.ofSeconds(30));
       }
   }
   ```
3. Create the `TtsService` interface (`String synthesize(String text)`) and `TtsServiceImpl` (`@Service`, `implements TtsService`) per `spec/05-backend.md` § "Service interface pattern". `synthesize`:
   - Calls `EdgeTtsClient.synthesize(text)`.
   - Generates UUID filename: `<uuid>.mp3`.
   - Writes bytes to `${storageDir}/<filename>`. Use `Files.write(Path.of(storageDir, filename), bytes)`.
   - Returns the filename (not full path).
   - On any exception: log a warning with the text length (not the text itself) and return `null`. The caller treats `null` as "no audio".
   - Ensure `storageDir` exists at startup using `@PostConstruct`:
     ```java
     @PostConstruct
     void init() throws IOException {
         Files.createDirectories(Path.of(props.getStorageDir()));
     }
     ```
4. Write `TtsServiceImplTest`:
   - Mock `EdgeTtsClient` to return fixed bytes.
   - Use a temp directory (`@TempDir`) as `storageDir`.
   - Assert file is created and filename returned matches `^[a-f0-9-]+\.mp3$`.
   - Mock client to throw → assert `null` returned and no file created.

## References

- `spec/05-backend.md` § Client interface pattern
- `spec/07-external-apis.md` §7.3
- `spec/10-pitfalls.md` § path traversal

## Verification

- [ ] `./mvnw test` passes.
- [ ] Manually call `TtsService.synthesize("你好")` via a temporary `CommandLineRunner` (delete before commit) → file appears under `/data/audio/` in the backend container and plays correctly.
- [ ] Killing `tts-service` container then calling synthesize → service returns `null` and logs a warning; backend stays up.

## When complete

1. Update Round 11 status.
2. Report: "Round 11 done. Next: Round 12 — Audio file endpoint + wire into chat."
3. **Stop.**
