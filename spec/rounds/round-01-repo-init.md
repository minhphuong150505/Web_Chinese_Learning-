# Round 01 — Repo init

> **Milestone:** M0 (Scaffolding)
> **Effort:** S (15–20 min)
> **Prerequisites:** none
> **Blocks if:** nothing

## Goal

Create the empty repo skeleton: `.gitignore`, `README.md`, `.env.example`, and empty placeholder directories so subsequent rounds can drop files into known locations.

## Files to create

- `.gitignore`
- `.env.example`
- `README.md`
- Empty placeholder directories (use `.gitkeep`):
  - `backend/`
  - `frontend/`
  - `tts-service/`

## Files to modify

(none)

## Steps

1. Create `.gitignore` at project root with rules for Java, Node, Python, IDE files, and `.env`:
   - Java: `target/`, `*.class`, `*.jar`, `.mvn/wrapper/maven-wrapper.jar` if checked separately, `HELP.md`
   - Node: `node_modules/`, `dist/`, `.vite/`
   - Python: `__pycache__/`, `*.pyc`, `.venv/`
   - IDE: `.idea/`, `.vscode/`, `*.iml`, `.DS_Store`
   - Env: `.env`, `*.env.local`
2. Create `.env.example` per `spec/08-docker-and-env.md` §".env.example".
3. Create `README.md` with **only**:
   - Project title (one line).
   - Quick-start: `docker compose up --build` then list URLs (frontend `:5173`, backend `:8080`, TTS `:8001`).
   - Pointer: "See `spec/` for design and `spec/rounds/` for the implementation plan."
   - Note: real `.env` required for chat (see `.env.example`).
4. Create empty directories `backend/`, `frontend/`, `tts-service/` each containing one `.gitkeep` file (so they're committable but empty).

## References

- `spec/03-folder-structure.md`
- `spec/08-docker-and-env.md` (§".env.example")

## Verification

- [ ] `ls` at project root shows: `Claude.md`, `PROMPT_CLAUDE_CODE.md`, `SPEC.md`, `README.md`, `.gitignore`, `.env.example`, `spec/`, `backend/`, `frontend/`, `tts-service/`.
- [ ] `cat .gitignore` shows entries for Java + Node + Python + IDE + `.env`.
- [ ] `cat .env.example` shows `LLM_API_KEY=` placeholder.
- [ ] `README.md` is ≤ 30 lines and contains the quick-start.
- [ ] `find backend frontend tts-service -type f` lists only `.gitkeep` files.

## When complete

1. Update status of Round 01 in `spec/rounds/README.md` to `[x]`.
2. Report: "Round 01 done. Next: Round 02 — Backend skeleton."
3. **Stop.**
