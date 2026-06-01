# 01 — Tech Stack & Versions

> If a version listed here cannot be obtained, ask the user before substituting.

## Backend (Spring Boot)

| Item | Version | Notes |
|------|---------|-------|
| JDK | Temurin **21** (LTS) | Required by Spring Boot 3.3. |
| Spring Boot | **3.3.5** | Latest stable 3.3.x. Verify on start.spring.io if substituting. |
| Build tool | Maven **3.9+** (wrapper committed) | Generated via `mvn -N wrapper:wrapper`. |
| Starters | `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-validation`, `spring-boot-starter-webflux` (for `WebClient` only) | |
| DB driver | `org.postgresql:postgresql` | |
| Migrations | `flyway-core` + `flyway-database-postgresql` | |
| Azure Speech SDK | `com.microsoft.cognitiveservices.speech:client-sdk:1.40.0` | Added in Round 16 (M3). |
| Lombok | **Excluded** | Use records + explicit getters. |
| Tests | `spring-boot-starter-test`, `org.testcontainers:postgresql` | |

## Frontend (React + Vite)

| Item | Version | Notes |
|------|---------|-------|
| Node | **20 LTS** | Container base image. |
| React | **18.3.x** | |
| Vite | **5.x** | |
| TypeScript | **5.5+** | `strict: true`, `noUncheckedIndexedAccess: true`. |
| TanStack Query | **5.x** (`@tanstack/react-query`) | Server state. |
| Axios | **1.x** | HTTP client. |
| Tailwind CSS | **3.4.x** | |
| Router | None | Tabs only. |

## TTS service (Python)

| Item | Version | Notes |
|------|---------|-------|
| Python | **3.12** | |
| FastAPI | **0.115+** | |
| Uvicorn | **0.32+** | ASGI server. |
| edge-tts | **6.1.x** | Wraps Edge online TTS. Free, no key. |

## Database

| Item | Version | Notes |
|------|---------|-------|
| PostgreSQL | **16** | Image `postgres:16-alpine`. |

## Dev tools (host)

- Docker + Docker Compose (the only host requirement for running the app).
- `psql` (optional, for verification).
- `curl` (used by verification steps).
- `ffmpeg` is **inside the backend container only** — not required on host.
