# Round 06 — DB schema V1 + entities

> **Milestone:** M1 (Text chat)
> **Effort:** M (30–45 min)
> **Prerequisites:** Round 05 complete; `docker compose up` works
> **Blocks if:** nothing

## Goal

Flyway creates `conversations` and `messages` tables on backend start; JPA entities + repositories compile and pass a basic integration test against Testcontainers Postgres.

## Files to create

- `backend/src/main/resources/db/migration/V1__init_schema.sql`
- `backend/src/main/java/com/chineseapp/entity/Conversation.java`
- `backend/src/main/java/com/chineseapp/entity/Message.java`
- `backend/src/main/java/com/chineseapp/repository/ConversationRepository.java`
- `backend/src/main/java/com/chineseapp/repository/MessageRepository.java`
- `backend/src/test/java/com/chineseapp/repository/MessageRepositoryTest.java`

## Files to modify

- `backend/src/main/resources/application.yml` — **remove** the `autoconfigure.exclude` block added in Round 2 so JPA + Flyway autoconfigure now run.

## Steps

1. Create `V1__init_schema.sql` **exactly** as in `spec/04-database.md` § V1.
2. Create JPA entities per `spec/04-database.md` § "JPA entity pattern":
   - `Conversation`: id (UUID), title, createdAt, updatedAt. Setters only for `title` and `updatedAt`.
   - `Message`: id (UUID), conversation (`@ManyToOne(fetch = LAZY)` → Conversation, joined on `conversation_id`), role, content, audioPath (nullable), createdAt. No setters.
   - Use `@Entity`, `@Table(name = "...")`, `@Id` (no generator — app sets UUID), `@Column(name = "...")`.
3. Create repositories:
   ```java
   public interface ConversationRepository extends JpaRepository<Conversation, UUID> { }

   public interface MessageRepository extends JpaRepository<Message, UUID> {
       List<Message> findByConversationOrderByCreatedAtAsc(Conversation conversation);
   }
   ```
4. Remove the `autoconfigure.exclude` lines from `application.yml`. Verify the rest of the file still matches `spec/05-backend.md`.
5. Write `MessageRepositoryTest` using Testcontainers Postgres (`@SpringBootTest` + `@Testcontainers`):
   - Save a `Conversation`.
   - Save 2 `Message`s.
   - Assert `findByConversationOrderByCreatedAtAsc` returns them in insertion order.

## References

- `spec/04-database.md`
- `spec/05-backend.md` § layered architecture rules (entities stay in entity package)

## Verification

- [ ] `cd backend && ./mvnw test` passes (including `MessageRepositoryTest`).
- [ ] `docker compose up --build backend` — backend boots without Flyway errors.
- [ ] `psql -h localhost -U chinese -d chinese_app -c "\dt"` lists `conversations`, `messages`, `flyway_schema_history`.
- [ ] `psql -h localhost -U chinese -d chinese_app -c "SELECT * FROM flyway_schema_history;"` shows `V1` as `success`.
- [ ] No JPA validation warnings in backend logs.

## When complete

1. Update Round 06 status.
2. Report: "Round 06 done. Next: Round 07 — LLM client. **Requires `LLM_API_KEY` in `.env`.**"
3. **Stop.**
