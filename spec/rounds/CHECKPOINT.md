# Round Checkpoint

This file is the compact handoff used by the auto-continue workflow. All 25 rounds are
now complete and verified — the project is feature-complete per spec.

## Status: COMPLETE

- All rounds 01–25 are `[x]` in `spec/rounds/README.md`.
- Final round completed: Round 21 — Finalization (cold-start verification + README polish).

## Final Verification

- Backend: `DOCKER_HOST=unix:///var/run/docker.sock env -u AZURE_SPEECH_KEY -u AZURE_SPEECH_REGION ./mvnw test` → **36 tests, 0 failures, 0 errors, 1 skipped** (Azure smoke; needs a live key).
- Frontend: `npm run build` (tsc strict + vite) → green, 163 modules.
- All three Docker images build via `docker compose build` (`web_chinese_learning--{backend,tts-service,frontend}`). Backend builds via in-Docker `mvnw package`; frontend via in-Docker `npm ci && npm run build` (lockfile in sync).
- Live runtime smoke on the built images (isolated docker network, because host port 5432 is occupied by an unrelated `hub-postgres` container so the default `docker compose up` cannot bind it):
  - `GET /api/health` → 200 `{"status":"UP"}` (public, no token).
  - `GET /api/conversations` and `GET /api/auth/me` (no token) → **401**.
  - `POST /api/auth/google` with a garbage token → **401** (reaches the controller; verifier returns empty → `ApiException(UNAUTHORIZED)`; NOT firewall-blocked).
  - Blank `JWT_SECRET` → container exits code 1, "APPLICATION FAILED TO START / Binding to target AuthProperties failed: app.auth.jwt.secret" (fail-fast works).
  - Flyway applied V1–V4: `users` (no password column; `email`/`google_sub` unique), `conversations`, `pronunciation_scores`; `user_id` columns present on the two owned tables.
  - Frontend nginx serves the SPA (200, `<div id="root">` + hashed assets) and proxies `/api/health` → backend → 200. Full browser→nginx→backend chain confirmed.
  - UI render (headless Chromium against the built `dist` via `npm run preview`): React mounts (`#root` innerHTML = 3549 chars, not blank), `LoginScreen` renders (brand 学中文, "Chinese Learning", Google button, "Google sign-in only"), no app tabs leak (logged-out gate works), no app-level runtime errors. The only console errors are Google's own GSI rejecting the deliberately-fake `verify-dummy` client id (`The given client ID is not found`) — expected; the real `GOOGLE_CLIENT_ID` makes the button live.

## Not Automatable (require human-in-the-loop; documented, not faked)

- Real Google sign-in end-to-end (`GoogleIdTokenVerifier` needs a genuine signed Google JWT). The login + find-or-create + user-scoping LOGIC is fully covered by deterministic unit tests (mocked verifier, cross-user isolation test).
- Mic recording → Azure pronunciation scoring against a real key; real LLM chat/translation/writing round-trips. Every code seam (multipart wiring, JSON→DTO parsing, prompt selection, schema/boot) is covered by deterministic tests.

## Key Notes For Future Work

- Docker socket: `unix:///var/run/docker.sock` (NOT the default Docker-Desktop socket). Export `DOCKER_HOST` for Testcontainers/compose.
- `.env` holds real secrets and is gitignored (confirmed); never print or commit values.
- To run the real stack, free host port 5432 (stop the unrelated `hub-postgres`) then `docker compose up --build`.
- Round 21 relocated live UI content (`CHAT_SUGGESTIONS`, `WRITING_PROMPT_*`) from the deleted `frontend/src/mocks/data.ts` into `frontend/src/lib/content.ts`; deleted the `mocks/` seam, the orphaned `components/GoogleG.tsx`, and `axios-mock-adapter`.
