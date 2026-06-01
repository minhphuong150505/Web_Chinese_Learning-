# Round 21 — Final polish

> **Milestone:** Finalization
> **Effort:** S–M (30–45 min)
> **Prerequisites:** Rounds 01–20 complete and verified
> **Blocks if:** nothing

## Goal

Cold-start verification on a clean machine: `docker compose down -v && docker compose up --build` produces a fully working app. README is sufficient for a new user to do that. No dead code or orphan files remain.

## Files to create

(none)

## Files to modify

- `README.md` — expand the quick-start to cover all four features and required env vars.
- `spec/rounds/README.md` — mark Round 21 done; mark all prior rounds as `[x]` if not already.

## Steps

1. Cold-start verification on the dev machine:
   ```bash
   docker compose down -v
   docker compose up --build
   ```
   Wait until all services are healthy. Run every verification step from each round's "Verification" section.
2. Update `README.md` to include:
   - One-paragraph project description (from `spec/00-overview-and-decisions.md`).
   - Prerequisites: Docker + `.env` based on `.env.example`.
   - Quick-start:
     ```bash
     cp .env.example .env
     # edit .env to add LLM_API_KEY, AZURE_SPEECH_KEY, AZURE_SPEECH_REGION
     docker compose up --build
     # open http://localhost:5173
     ```
   - Feature list (chat, pronunciation, translation, writing).
   - "How to reset everything": `docker compose down -v`.
   - Pointer: "See `spec/` for design and `spec/rounds/` for the round-by-round implementation guide."
3. Code-review pass — for each backend package and feature folder:
   - Verify no `// TODO` / `console.log` / `System.out` left over.
   - Verify no `CommandLineRunner` smoke runners committed.
   - Verify no unused imports.
   - Verify no orphan files (e.g., the initial `.gitkeep` files inside `backend/`, `frontend/`, `tts-service/` should be gone now that real files exist).
4. Confirm `.env` is gitignored and not staged.
5. Confirm `.env.example` is up-to-date with every variable actually read by the app.
6. Final verification checklist (combined from all rounds):
   - [ ] Health: `/api/health` and `/health` (tts) both `UP`.
   - [ ] Chat round-trip works with audio autoplay.
   - [ ] Pronunciation works end-to-end with per-word scoring.
   - [ ] Translation VI↔ZH works.
   - [ ] Writing feedback returns parseable JSON and renders.
   - [ ] No API keys visible in browser Network/Sources.
   - [ ] Stopping `tts-service` alone leaves chat functional (no audio).
   - [ ] `docker compose down -v && docker compose up --build` reproduces a working app.

## References

- All previous round files.
- `spec/15-...` does not exist — combined checklist lives here.

## When complete

1. Mark Round 21 done in `spec/rounds/README.md`. The whole tracker should now be `[x]` end-to-end.
2. Report to user: "All 21 rounds complete. Cold-start verified. App is feature-complete per spec."
3. Hand off — no further rounds.
