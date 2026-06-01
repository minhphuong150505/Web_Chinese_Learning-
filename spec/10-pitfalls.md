# 10 — Common Pitfalls

| Pitfall | Mitigation |
|---------|------------|
| DeepSeek model name silently changes | Always read model name from env (`LLM_CHAT_MODEL`). Re-verify at https://api-docs.deepseek.com/ at the start of each LLM-related round. |
| Browser autoplay policy blocks `<audio autoPlay>` | The first assistant audio plays after the user's "send" gesture, which satisfies most browsers. If blocked, the user clicks the audio's play control — acceptable. |
| MediaRecorder produces WebM but Azure wants WAV 16k mono | Convert in backend via ffmpeg (Round 15). Never trust the browser to produce WAV directly. |
| CORS blocks frontend | `CorsConfig` allows `http://localhost:5173` in dev. In containers, Nginx proxies same-origin so CORS doesn't apply. |
| Flyway checksum mismatch after editing a migration | Never edit a committed migration. Add a new `V<n+1>__*.sql`. |
| `ddl-auto: update` corrupts the schema | We use `validate`. Flyway is the only schema authority. |
| LLM latency causes UI spinner forever | Backend timeout 60s; frontend axios timeout 90s; show explicit error toast on failure. |
| Generated audio files balloon the `audio_data` volume | Demo only — ignore. Cleanup is out of scope. If volume fills, `docker compose down -v` to reset. |
| API key accidentally logged | Never `log.info(props)` on `LlmProperties` / `AzureSpeechProperties`. Mask in any debug output. |
| Path traversal on `/api/audio/{filename}` | Enforce regex `^[a-f0-9-]+\.mp3$` (UUID-style only). |
| `recognizeOnceAsync().get()` hangs on bad audio | Use `get(30, TimeUnit.SECONDS)` and throw on timeout. |
| `ApiException` becomes "INTERNAL_ERROR" because handler order is wrong | The most-specific `@ExceptionHandler` wins; just make sure `ApiException.class` and `MethodArgumentNotValidException.class` handlers exist alongside the catch-all. |
| Hibernate complains about missing public no-arg constructor on entities | Use `protected NoArgConstructor() {}` — Hibernate is fine with non-public. |
| `application.yml` placeholders break when env is unset | Always provide defaults: `${VAR:default}`. |
| Backend container starts before Postgres is accepting connections | `depends_on: condition: service_healthy` on the Postgres healthcheck — already in `08-docker-and-env.md`. |
| Frontend dev server can't reach backend at `localhost:8080` because backend is in container | Either run frontend in the container too (`docker compose up`) or expose backend port 8080 to host — already done in compose. |
| Mic permission denied → confusing error | Hook `useAudioRecorder` should set `error` to a friendly message; UI renders it inline. |
| `multipart/form-data` field name mismatch | Backend expects `audio` (file) + `referenceText` (string). Frontend FormData keys must match exactly. |
| Tailwind not picking up classes in JIT mode | Verify `content` glob in `tailwind.config.js` covers `./src/**/*.{ts,tsx}`. |
| TanStack Query refetches on tab focus and breaks UX | Disabled globally via `refetchOnWindowFocus: false` in `queryClient.ts`. |
| Writing-feedback LLM returns text wrapped in markdown fences instead of bare JSON | Set `response_format: json_object` on DeepSeek request, AND strip ``` fences defensively before `JSON.parse`. |
| `Instant.now()` differs between containers if clocks drift | Demo-acceptable. If you see flaky tests, use Testcontainers' suggested time freeze; otherwise ignore. |
