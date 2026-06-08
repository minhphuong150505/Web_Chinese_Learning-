# Round 22 — Auth foundation (deps + User + V3 + security)

> **Milestone:** M5
> **Effort:** L (60–90 min)
> **Prerequisites:** Round 20 complete (all feature rounds done except Round 21 finalization)
> **Blocks if:** `JWT_SECRET` or `GOOGLE_CLIENT_ID` not provided by the operator — **stop and ask** (see `09-coding-standards.md` stop-and-ask #1).

## Goal

Add Spring Security, JWT, and Google-token-verify dependencies; create the `User` entity + `users` table (V3); stand up a **stateless** security filter chain that authenticates requests via an app JWT. After this round the API rejects unauthenticated calls (except `/api/health`, `/api/auth/google`, and `/api/audio/**`) with 401, but no login endpoint exists yet (Round 23).

## Files to create

- `backend/src/main/resources/db/migration/V3__users.sql` — per `spec/04-database.md` § V3.
- `backend/src/main/java/com/chineseapp/entity/User.java` — `@Entity` per `spec/04-database.md` JPA pattern. Fields: `id`, `email`, `googleSub`, `displayName`, `createdAt`. No password.
- `backend/src/main/java/com/chineseapp/repository/UserRepository.java` — `findByGoogleSub(String)`, `findByEmail(String)`.
- `backend/src/main/java/com/chineseapp/config/AuthProperties.java` — `@ConfigurationProperties("app.auth")`; nested `jwt.secret`, `jwt.expiryDays`, `google.clientId`. `@NotBlank` on `jwt.secret` and `google.clientId` so the app **fails to start** if blank, **plus `@Size(min = 32)` on `jwt.secret`** so a too-short HS256 key fails fast at startup instead of throwing `WeakKeyException` at the first login. Do not add `@Component`; `@ConfigurationPropertiesScan` was enabled in Round 7.
- `backend/src/main/java/com/chineseapp/security/CurrentUser.java` — `record CurrentUser(UUID id, String email, String displayName) {}`.
- `backend/src/main/java/com/chineseapp/security/JwtService.java` — issue + verify app JWT (HS256).
- `backend/src/main/java/com/chineseapp/security/GoogleTokenVerifier.java` — wraps `GoogleIdTokenVerifier`; `Optional<GoogleProfile> verify(String idToken)`.
- `backend/src/main/java/com/chineseapp/security/JwtAuthFilter.java` — `OncePerRequestFilter`.
- `backend/src/main/java/com/chineseapp/config/SecurityConfig.java` — filter chain per `spec/05-backend.md` § Security.
- `backend/src/test/java/com/chineseapp/security/JwtServiceTest.java`
- `backend/src/test/resources/application.yml` — supplies a dummy ≥32-byte `app.auth.jwt.secret` and dummy `app.auth.google.client-id` so the context boots in tests (per `spec/05-backend.md` § Testing with auth).
- `backend/src/test/java/com/chineseapp/security/WithMockCurrentUser.java` — `@WithSecurityContext` test annotation injecting a `CurrentUser`, per `spec/05-backend.md` § Testing with auth.

## Files to modify

- `backend/pom.xml` — add `spring-boot-starter-security`, `io.jsonwebtoken:jjwt-api/jjwt-impl/jjwt-jackson:0.12.6`, `com.google.api-client:google-api-client:2.7.0` (versions per `spec/01-tech-stack.md`).
- `backend/src/main/resources/application.yml` — confirm the `app.auth` block is present per `spec/05-backend.md`. It already ships in the full `application.yml` copied in Round 2 (it was inert until now because no `@ConfigurationProperties` class read it); add it here only if it is missing. The real new work this round is binding it via `AuthProperties`.
- `.env.example` and `docker-compose.yml` — add `JWT_SECRET`, `JWT_EXPIRY_DAYS`, `GOOGLE_CLIENT_ID` per `spec/08-docker-and-env.md` (backend env + frontend build arg).
- **Existing tests broken by adding security** (per `spec/05-backend.md` § Testing with auth) — make them green again:
  - `ChineseAppApplicationTests` (the default `contextLoads()` from Round 2) — now relies on the new `application-test` props; confirm it boots.
  - `MessageRepositoryTest` (Round 6, `@SpringBootTest` + Testcontainers) — confirm context boots with the test props.
  - `ConversationControllerTest` (Round 9, `@WebMvcTest`) — import `SecurityConfig` + provide/stub `JwtService`/`JwtAuthFilter`; annotate authed cases with `@WithMockCurrentUser`. (Method-signature changes come later in Round 24.)
  - `TtsControllerTest` (Round 12, `@WebMvcTest`) — `/api/audio/**` is public, but the security filter is now active; ensure the test still passes (no token needed for audio).

## Steps

1. **Stop and ask** the operator for `JWT_SECRET` (≥32 bytes; suggest `openssl rand -base64 48`) and `GOOGLE_CLIENT_ID`. Do not invent values; do not commit real secrets.
2. Add the dependencies to `pom.xml`. Run `./mvnw -q dependency:resolve` to confirm they download.
3. Create V3 migration + `User` entity + `UserRepository`.
4. Create `AuthProperties` with fail-fast validation (`@Validated` + `@NotBlank`).
5. Create `JwtService` (`issue(User)`, `verify(String) → Optional<UUID>`) per `spec/05-backend.md` § Security. Build the signing key from `secret` bytes; never log the secret.
6. Create `GoogleTokenVerifier` per `spec/07-external-apis.md` §7.4.
7. Create `JwtAuthFilter`: parse `Bearer` token → `verify` → load `User` → set `CurrentUser` principal in `SecurityContext`. On any failure, leave the context empty (do not throw).
8. Create `SecurityConfig` exactly per `spec/05-backend.md` § Security (stateless, CSRF off, public routes, filter before `UsernamePasswordAuthenticationFilter`).
9. Wire env vars into `application.yml`, `.env.example`, `docker-compose.yml`.
10. Add the test fixtures **before re-running the suite**: `src/test/resources/application.yml` (dummy auth props) and the `@WithMockCurrentUser` annotation (per `spec/05-backend.md` § Testing with auth). Then fix the existing tests listed under "Files to modify" so the suite is green again — do not leave red tests "to fix later".

## References

- `spec/04-database.md` § V3, JPA pattern
- `spec/05-backend.md` § Security
- `spec/07-external-apis.md` §7.4 Google OAuth
- `spec/08-docker-and-env.md` env table

## Verification

- [ ] `./mvnw test` passes — **including the previously-written tests from Rounds 2/6/9/12**, now updated for auth (test props + `@WithMockCurrentUser`). No test is left red or `@Disabled`.
- [ ] `JwtServiceTest` passes (round-trip issue→verify; expired/garbage token → empty).
- [ ] App refuses to start when `JWT_SECRET` is blank (manually confirm: blank value → startup fails with a clear message).
- [ ] `GET /api/health` → 200 without a token.
- [ ] `GET /api/conversations` → **401** without a token.
- [ ] `flyway` applies V3; `users` table exists with the columns from `spec/04-database.md` and no password column.

## When complete

1. Update Round 22 status in `spec/rounds/README.md`.
2. Report: "Round 22 done. Verified: <list>. Next: Round 23 — Google login + JWT issue."
3. **Stop.**
