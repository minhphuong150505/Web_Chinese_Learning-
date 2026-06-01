# Round 04 — TTS service skeleton

> **Milestone:** M0
> **Effort:** S (15–20 min)
> **Prerequisites:** Round 03 complete
> **Blocks if:** nothing

## Goal

A runnable FastAPI service with `GET /health` and `GET /tts?text=...` that returns Chinese MP3 audio from `edge-tts`.

## Files to create

- `tts-service/requirements.txt`
- `tts-service/app/main.py`
- `tts-service/Dockerfile`
- `tts-service/.gitignore` (`__pycache__/`, `.venv/`)

## Files to modify

- Replace `tts-service/.gitkeep` with the structure above.

## Steps

1. Create `requirements.txt` per `spec/07-external-apis.md` §7.3.
2. Create `app/main.py` **exactly** as written in `spec/07-external-apis.md` §7.3. No additional endpoints, no logging frameworks, no streaming.
3. Create `Dockerfile` per `spec/08-docker-and-env.md` § TTS.
4. (Optional) For local Python testing: `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --port 8001`.

## References

- `spec/07-external-apis.md` §7.3
- `spec/08-docker-and-env.md` § TTS Dockerfile

## Verification

- [ ] `docker build tts-service -t chinese-app-tts:dev` succeeds.
- [ ] `docker run --rm -p 8001:8001 chinese-app-tts:dev` boots without errors.
- [ ] `curl http://localhost:8001/health` returns `{"status":"UP"}`.
- [ ] `curl -o /tmp/test.mp3 'http://localhost:8001/tts?text=%E4%BD%A0%E5%A5%BD'` produces a non-empty MP3 file (>1 KB).
- [ ] Playing `/tmp/test.mp3` (e.g., `mpv /tmp/test.mp3`) yields Chinese audio of "你好".

## When complete

1. Update Round 04 status.
2. Report: "Round 04 done. Next: Round 05 — Docker Compose."
3. **Stop.**
