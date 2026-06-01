# Round 15 — ffmpeg + AudioConversionService

> **Milestone:** M3
> **Effort:** S–M (25–40 min)
> **Prerequisites:** Round 14 complete
> **Blocks if:** nothing

## Goal

Backend has ffmpeg available and an `AudioConversionService.toWav16kMono(File webm)` that produces a 16 kHz, 16-bit PCM, mono WAV file suitable for Azure. Unit test runs against a sample WebM (use a tiny fixture).

## Files to create

- `backend/src/main/java/com/chineseapp/service/AudioConversionService.java`
- `backend/src/test/java/com/chineseapp/service/AudioConversionServiceTest.java`
- `backend/src/test/resources/sample.webm` — a small WebM/Opus audio clip (≤50 KB). Generate it on demand inside the test (e.g., a 0.5s silent clip) rather than committing a binary if possible. **Alternative:** in the test, generate the WebM with ffmpeg as part of setup.

## Files to modify

- `backend/Dockerfile` — apply the Round 15 modification from `spec/08-docker-and-env.md` (add `RUN apk add --no-cache ffmpeg` to the final stage).

## Steps

1. Update `backend/Dockerfile` final stage:
   ```dockerfile
   FROM eclipse-temurin:21-jre-alpine
   RUN apk add --no-cache ffmpeg
   WORKDIR /app
   COPY --from=build /app/target/*.jar app.jar
   EXPOSE 8080
   CMD ["java", "-jar", "app.jar"]
   ```
2. Create `AudioConversionService`:
   ```java
   @Service
   public class AudioConversionService {
       private static final Logger log = LoggerFactory.getLogger(AudioConversionService.class);

       public File toWav16kMono(File input) {
           try {
               File output = File.createTempFile("audio-", ".wav");
               ProcessBuilder pb = new ProcessBuilder(
                   "ffmpeg", "-y", "-loglevel", "error",
                   "-i", input.getAbsolutePath(),
                   "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le",
                   output.getAbsolutePath()
               );
               pb.redirectErrorStream(true);
               Process p = pb.start();
               boolean finished = p.waitFor(20, TimeUnit.SECONDS);
               if (!finished) {
                   p.destroyForcibly();
                   throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Audio conversion timed out");
               }
               if (p.exitValue() != 0) {
                   String stderr = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                   log.warn("ffmpeg failed: {}", stderr);
                   throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Audio conversion failed");
               }
               return output;
           } catch (IOException | InterruptedException e) {
               Thread.currentThread().interrupt();
               throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Audio conversion error: " + e.getMessage());
           }
       }
   }
   ```
3. Write `AudioConversionServiceTest`:
   - In `@BeforeAll`, generate `sample.webm` with ffmpeg from a 0.5s silent source (skip the test gracefully if ffmpeg is absent on the host so CI on Mac/Linux works the same):
     ```bash
     ffmpeg -y -f lavfi -i anullsrc=channel_layout=mono:sample_rate=48000 -t 0.5 -c:a libopus sample.webm
     ```
   - Call `toWav16kMono(sample.webm)` → assert output file exists and `ffprobe` reports 16 kHz / mono / s16le (or assert by reading the WAV header).

## References

- `spec/07-external-apis.md` §7.2 (Audio format requirement)
- `spec/08-docker-and-env.md` § "Backend Dockerfile" (Round 15 modification)
- `spec/10-pitfalls.md` § MediaRecorder → WAV

## Verification

- [ ] `docker build backend -t chinese-app-backend:dev` succeeds and image contains ffmpeg (`docker run --rm chinese-app-backend:dev ffmpeg -version`).
- [ ] `./mvnw test` passes (or skips gracefully if ffmpeg not installed on host — log a clear skip reason).
- [ ] Manually: `docker compose exec backend ffmpeg -version` works.

## When complete

1. Update Round 15 status.
2. Report: "Round 15 done. Next: Round 16 — Azure Speech client. **STOP and ask the user for `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` before starting.**"
3. **Stop.**
