# Round 02 — Backend skeleton

> **Milestone:** M0
> **Effort:** M (30–45 min)
> **Prerequisites:** Round 01 complete
> **Blocks if:** nothing

## Goal

A runnable Spring Boot app that serves `GET /api/health` returning `{"status":"UP"}`. No DB connection yet (DB is wired in Round 6).

## Files to create

- `backend/pom.xml`
- `backend/mvnw`, `backend/mvnw.cmd`, `backend/.mvn/wrapper/maven-wrapper.properties`
- `backend/Dockerfile` (Round 2 version per `spec/08-docker-and-env.md`)
- `backend/src/main/java/com/chineseapp/ChineseAppApplication.java`
- `backend/src/main/java/com/chineseapp/controller/HealthController.java`
- `backend/src/main/resources/application.yml` (full version from `spec/05-backend.md` §"application.yml")
- `backend/.gitignore` (Maven-specific, if any)

## Files to modify

- Replace `backend/.gitkeep` with the structure above.

## Steps

1. Generate `pom.xml` matching `spec/01-tech-stack.md` § Backend:
   - `<parent>` Spring Boot **3.3.5**.
   - `<java.version>21</java.version>`.
   - Dependencies: `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-validation`, `spring-boot-starter-webflux`, `postgresql`, `flyway-core`, `flyway-database-postgresql`. (Azure SDK is added in Round 16.)
   - Test deps: `spring-boot-starter-test`, `org.testcontainers:postgresql`.
   - **Do not** add Lombok.
2. Generate the Maven wrapper (`mvn -N wrapper:wrapper`). Commit `mvnw`, `mvnw.cmd`, and `.mvn/wrapper/maven-wrapper.properties`. Add `.mvn/wrapper/maven-wrapper.jar` to `.gitignore` if your version downloads it on first run.
3. Create the application class:
   ```java
   package com.chineseapp;

   import org.springframework.boot.SpringApplication;
   import org.springframework.boot.autoconfigure.SpringBootApplication;

   @SpringBootApplication
   public class ChineseAppApplication {
       public static void main(String[] args) {
           SpringApplication.run(ChineseAppApplication.class, args);
       }
   }
   ```
4. Create `HealthController`:
   ```java
   package com.chineseapp.controller;

   import org.springframework.web.bind.annotation.GetMapping;
   import org.springframework.web.bind.annotation.RequestMapping;
   import org.springframework.web.bind.annotation.RestController;
   import java.util.Map;

   @RestController
   @RequestMapping("/api")
   public class HealthController {
       @GetMapping("/health")
       public Map<String, String> health() {
           return Map.of("status", "UP");
       }
   }
   ```
5. Copy the full `application.yml` from `spec/05-backend.md`. **Note:** that file already contains the `app.llm`, `app.tts`, `app.azure-speech`, and `app.auth` blocks. They are inert placeholders here — nothing binds them until their `@ConfigurationProperties` class is created in a later round (`app.llm` in Round 7, `app.tts` in Round 11, `app.azure-speech` in Round 16, `app.auth` in Round 22) — so copying them now is fine and Round 22 does **not** re-add the auth block. **Important:** with no Postgres yet, JPA auto-config will fail at boot. To allow the skeleton to run without a DB, add these two lines under `spring:`:
   ```yaml
   autoconfigure:
     exclude:
       - org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration
       - org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration
   ```
   **Note:** Round 6 will remove these two excludes when Postgres + Flyway are wired in.
6. Create `backend/Dockerfile` per `spec/08-docker-and-env.md` § "Backend (Round 2 version)".

## References

- `spec/01-tech-stack.md` § Backend
- `spec/05-backend.md` § "application.yml"
- `spec/08-docker-and-env.md` § Backend Dockerfile

## Verification

- [ ] `cd backend && ./mvnw -q -DskipTests package` produces `target/*.jar` without errors.
- [ ] `cd backend && ./mvnw spring-boot:run` boots without exceptions; logs show `Tomcat started on port 8080`.
- [ ] `curl http://localhost:8080/api/health` returns `{"status":"UP"}`.
- [ ] `docker build backend -t chinese-app-backend:dev` succeeds.

## When complete

1. Update Round 02 status in `spec/rounds/README.md`.
2. Report: "Round 02 done. Next: Round 03 — Frontend skeleton."
3. **Stop.**
