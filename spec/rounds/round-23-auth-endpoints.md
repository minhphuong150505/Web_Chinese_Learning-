# Round 23 — Google login + JWT issue (AuthService + AuthController)

> **Milestone:** M5
> **Effort:** M (45–60 min)
> **Prerequisites:** Round 22 complete
> **Blocks if:** nothing (deps + security already in place)

## Goal

Implement the two auth endpoints: `POST /api/auth/google` (verify Google ID token → find-or-create `User` → issue app JWT) and `GET /api/auth/me` (current user). After this round a real Google ID token can be exchanged for an app JWT, and that JWT unlocks the rest of the API.

## Files to create

- `backend/src/main/java/com/chineseapp/dto/auth/GoogleLoginRequest.java` — `record GoogleLoginRequest(@NotBlank String idToken) {}`.
- `backend/src/main/java/com/chineseapp/dto/auth/UserDto.java` — `record UserDto(UUID id, String email, String displayName)` + `static from(User)`.
- `backend/src/main/java/com/chineseapp/dto/auth/AuthResponse.java` — `record AuthResponse(String token, UserDto user) {}`.
- `backend/src/main/java/com/chineseapp/service/AuthService.java` — interface: `AuthResponse loginWithGoogle(String idToken)`, `UserDto me(UUID userId)`.
- `backend/src/main/java/com/chineseapp/service/impl/AuthServiceImpl.java` — `@Service`, per `spec/05-backend.md` § Security flow.
- `backend/src/main/java/com/chineseapp/controller/AuthController.java`
- `backend/src/test/java/com/chineseapp/service/AuthServiceImplTest.java`

## Files to modify

(none)

## Steps

1. Create the auth DTOs as records.
2. Create the `AuthService` interface + `AuthServiceImpl` (`@Service`, `implements AuthService`) per `spec/05-backend.md` § Security (`AuthServiceImpl` flow):
   - `loginWithGoogle`: verify via `GoogleTokenVerifier`; empty → `ApiException(UNAUTHORIZED, "Invalid Google token")`.
   - Find by `googleSub`; if absent, create + save a new `User` (`UUID.randomUUID()`, email, sub, name, `Instant.now()`).
   - Issue app JWT via `JwtService.issue(user)`; return `AuthResponse`.
   - `me(userId)`: load user → `UserDto.from`, or `ApiException(NOT_FOUND)`.
3. Create `AuthController` per `spec/05-backend.md` controller template:
   - `POST /api/auth/google` — `@Valid @RequestBody GoogleLoginRequest` → `service.loginWithGoogle(req.idToken())`. **No** `@AuthenticationPrincipal` (this route is public).
   - `GET /api/auth/me` — `@AuthenticationPrincipal CurrentUser user` → `service.me(user.id())`.
4. Write `AuthServiceImplTest`: mock `GoogleTokenVerifier` + `JwtService` + `UserRepository`.
   - New user → `save` invoked once, token returned.
   - Existing user (found by sub) → `save` NOT invoked, token returned.
   - Invalid Google token → `ApiException(UNAUTHORIZED)`.

## References

- `spec/05-backend.md` § Security (`AuthService` flow), controller template
- `spec/07-external-apis.md` §7.4

## Verification

- [ ] `./mvnw test` passes incl. `AuthServiceImplTest`.
- [ ] `AuthController` depends on the `AuthService` **interface**; `@Service` is on `AuthServiceImpl`.
- [ ] Manual (or test with a mocked verifier): `POST /api/auth/google` returns `{ token, user }`; the returned token then passes `GET /api/auth/me` (200) and a no-token call to `/api/auth/me` is 401.
- [ ] Logging in twice with the same Google identity does not create a duplicate `users` row.

## When complete

1. Update Round 23 status.
2. Report: "Round 23 done. Next: Round 24 — Per-user data scoping."
3. **Stop.**
