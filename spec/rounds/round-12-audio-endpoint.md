# Round 12 — Audio file endpoint + wire into chat

> **Milestone:** M2
> **Effort:** S–M (25–40 min)
> **Prerequisites:** Round 11 complete
> **Blocks if:** nothing

## Goal

Backend exposes `GET /api/audio/{filename}` to serve generated MP3s. `ConversationService` calls `TtsService` after each assistant reply and persists the resulting filename as `audio_path`. End-to-end: send a message → DB row has `audio_path` populated → curl the URL → MP3 bytes returned.

## Files to create

- `backend/src/main/java/com/chineseapp/controller/TtsController.java`
- `backend/src/test/java/com/chineseapp/controller/TtsControllerTest.java`

## Files to modify

- `backend/src/main/java/com/chineseapp/service/impl/ConversationServiceImpl.java` — inject `TtsService`, call `synthesize(...)` for assistant messages, set `audioPath`.
- `backend/src/test/java/com/chineseapp/service/ConversationServiceImplTest.java` — update to mock `TtsService`.

## Steps

1. Create `TtsController` serving files from `AUDIO_STORAGE_DIR`:
   ```java
   @RestController
   @RequestMapping("/api/audio")
   public class TtsController {

       private static final Pattern SAFE = Pattern.compile("^[a-f0-9-]+\\.mp3$");

       private final TtsProperties props;

       public TtsController(TtsProperties props) {
           this.props = props;
       }

       @GetMapping("/{filename}")
       public ResponseEntity<Resource> get(@PathVariable String filename) {
           if (!SAFE.matcher(filename).matches()) {
               throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid filename");
           }
           Path path = Path.of(props.getStorageDir(), filename).normalize();
           if (!path.startsWith(Path.of(props.getStorageDir()).normalize())) {
               throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid path");
           }
           if (!Files.exists(path)) {
               throw new ApiException(HttpStatus.NOT_FOUND, "Audio not found");
           }
           return ResponseEntity.ok()
               .contentType(MediaType.valueOf("audio/mpeg"))
               .body(new FileSystemResource(path));
       }
   }
   ```
2. Inject `TtsService` into `ConversationServiceImpl` constructor. In `sendMessage`:
   - After persisting the **user** message and getting the assistant text from `LlmClient`, call `String audioPath = tts.synthesize(assistantText);`.
   - Set `audioPath` on the assistant `Message` before saving.
   - `MessageDto.from(...)` already builds the `audioUrl` from `audioPath` per Round 8.
3. Update `ConversationServiceImplTest`:
   - Mock `TtsService.synthesize(any())` to return `"abc.mp3"`.
   - Assert assistant message has `audioPath = "abc.mp3"` and `MessageDto.audioUrl = "/api/audio/abc.mp3"`.
   - One additional test: when `TtsService` returns `null` → assistant message saved with `audioPath = null`.
4. Write `TtsControllerTest` with `@WebMvcTest`:
   - Valid filename `abc-def.mp3` and existing file → 200 + content-type `audio/mpeg`.
   - Path traversal `../../etc/passwd` → 400 + `Invalid filename`.
   - Non-existent file → 404.

## References

- `spec/05-backend.md` § REST endpoints (`/api/audio/{filename}`)
- `spec/10-pitfalls.md` § path traversal

## Verification

- [ ] `./mvnw test` passes.
- [ ] `curl -X POST -H 'Content-Type: application/json' -d '{"content":"你好"}' http://localhost:8080/api/conversations/<id>/messages` → response includes `assistantMessage.audioUrl` like `/api/audio/<uuid>.mp3`.
- [ ] `curl -o /tmp/r.mp3 http://localhost:8080<audioUrl>` produces a non-empty MP3 (>1 KB), plays Chinese audio.
- [ ] `curl -i http://localhost:8080/api/audio/../../etc/passwd` returns 400.
- [ ] If `tts-service` is stopped: chat still works, `audioUrl` is `null`, backend logs a warning.

## When complete

1. Update Round 12 status.
2. Report: "Round 12 done. Next: Round 13 — Audio playback in chat UI."
3. **Stop.**
