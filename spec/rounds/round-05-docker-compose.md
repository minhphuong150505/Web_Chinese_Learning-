# Round 05 — Docker Compose wiring

> **Milestone:** M0
> **Effort:** S (15–25 min)
> **Prerequisites:** Rounds 02–04 complete
> **Blocks if:** nothing (DeepSeek key NOT required yet — chat isn't built until M1)

## Goal

`docker compose up --build` starts Postgres, backend, tts-service, and frontend; all health checks pass; the three URLs respond.

## Files to create

- `docker-compose.yml` at project root

## Files to modify

(none)

## Steps

1. Create `docker-compose.yml` **exactly** as written in `spec/08-docker-and-env.md` § "`docker-compose.yml`".
2. Confirm `.env.example` is at the project root from Round 01. If a `.env` already exists, leave it; if not, **do not create one** — chat doesn't run yet and a missing `LLM_API_KEY` is fine for M0.
3. (Optional) Verify that `postgres`, `backend`, `tts-service`, `frontend` are the exact service names — they're referenced by other rounds.

## References

- `spec/08-docker-and-env.md` § `docker-compose.yml`

## Verification

- [ ] `docker compose up --build` exits cleanly to "running" state with no error logs.
- [ ] `docker compose ps` shows all four services as `running` and Postgres + tts-service as `healthy`.
- [ ] `curl http://localhost:8080/api/health` → `{"status":"UP"}`.
- [ ] `curl http://localhost:8001/health` → `{"status":"UP"}`.
- [ ] Browser at `http://localhost:5173` shows the placeholder page (served by Nginx).
- [ ] `psql -h localhost -U chinese -d chinese_app -c "\dt"` lists no tables (Flyway hasn't been wired yet — that's Round 6).
- [ ] `docker compose down` cleanly tears everything down.

## When complete

1. Update Round 05 status.
2. Report: "Round 05 done. Milestone 0 (Scaffolding) complete. Next: Round 06 — DB schema V1 + entities. **Note:** Round 7 will require `LLM_API_KEY` in `.env`."
3. **Stop.**
