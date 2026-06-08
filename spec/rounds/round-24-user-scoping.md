# Round 24 — Per-user data (V4 + scope conversation & pronunciation services)

> **Milestone:** M5
> **Effort:** L (60–90 min)
> **Prerequisites:** Round 23 complete
> **Blocks if:** nothing

## Goal

Make the owned data per-user. Add `user_id` to `conversations` and `pronunciation_scores` (V4), set it from the authenticated user on every write, and filter every read by it. After this round a user can only ever see and modify their own conversations and pronunciation history. Translation and writing endpoints (no DB rows) only gain the auth requirement at the controller — no scoping needed.

## Files to create

- `backend/src/main/resources/db/migration/V4__add_user_id.sql` — per `spec/04-database.md` § V4.

## Files to modify

- `entity/Conversation.java`, `entity/PronunciationScore.java` — add a `userId` (`UUID`) column (`@Column(name = "user_id")`). Set via constructor on creation.
- `repository/ConversationRepository.java` — add `Optional<Conversation> findByIdAndUserId(UUID id, UUID userId)` and `List<Conversation> findByUserIdOrderByUpdatedAtDesc(UUID userId)`.
- `repository/PronunciationScoreRepository.java` — add `findTop20ByUserIdOrderByCreatedAtDesc(UUID userId)` (the user-scoped replacement for Round 17's `findTop20ByOrderByCreatedAtDesc`).
- `service/ConversationService.java` + `service/impl/ConversationServiceImpl.java` — add leading `UUID userId` param to every method; scope all queries by it per `spec/05-backend.md` § Service template.
- `service/PronunciationService.java` + `service/impl/PronunciationServiceImpl.java` — `assess(UUID userId, ...)` sets `userId` on the saved score; rename `historyTop20()` → `historyTop20(UUID userId)` so it filters by user (no `limit` param — the endpoint returns the caller's latest 20).
- `controller/ConversationController.java`, `controller/PronunciationController.java` — add `@AuthenticationPrincipal CurrentUser user` and pass `user.id()` into the service.
- `controller/TranslationController.java`, `controller/WritingController.java` — add `@AuthenticationPrincipal CurrentUser user` so the route requires auth, even though the user id isn't used downstream.
- Existing service tests (`ConversationServiceImplTest`, `PronunciationServiceImplTest`) — pass a test `userId`; add a cross-user isolation test (a conversation owned by user A is a 404 for user B).
- Existing controller tests (`ConversationControllerTest` from Round 9, `PronunciationControllerTest` from Round 18) — the controller methods now take `@AuthenticationPrincipal CurrentUser`; annotate the test cases with `@WithMockCurrentUser` and assert the resolved `user.id()` is forwarded to the service (per `spec/05-backend.md` § Testing with auth).

## Steps

1. Create the V4 migration (nullable `user_id`, FK to `users`, indexes) per `spec/04-database.md`.
2. Add `userId` to the two entities; ensure it is set on every newly created row.
3. Add the scoped repository finder methods.
4. Update the service interfaces (signatures gain `UUID userId`) and the impls (queries use the user-scoped finders). A row that isn't the caller's must be a **404, not 403**.
5. Update the controllers to inject `CurrentUser` and forward `user.id()`.
6. Update tests: thread a `userId` through the service tests + add the cross-user isolation assertion; update the controller tests (`@WithMockCurrentUser`, assert `user.id()` reaches the service). Keep the whole suite green.

## References

- `spec/04-database.md` § V4
- `spec/05-backend.md` § Service template (user scoping), § REST endpoints

## Verification

- [ ] `./mvnw test` passes incl. the new cross-user isolation test.
- [ ] `flyway` applies V4; `conversations` and `pronunciation_scores` have a `user_id` column + FK.
- [ ] Manual with two different app JWTs (two Google accounts): user A's `GET /api/conversations` never returns user B's conversations; `GET /api/conversations/{B's id}/messages` as user A → 404.
- [ ] No service method reads an owned row without a `userId` filter (code review).

## When complete

1. Update Round 24 status.
2. Report: "Round 24 done. Next: Round 25 — Frontend auth."
3. **Stop.**
