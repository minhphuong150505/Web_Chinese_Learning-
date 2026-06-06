# 08 — Docker Compose & Environment

## `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: chinese_app
      POSTGRES_USER: chinese
      POSTGRES_PASSWORD: chinese
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U chinese -d chinese_app"]
      interval: 5s
      timeout: 5s
      retries: 10

  tts-service:
    build: ./tts-service
    ports:
      - "8001:8001"
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    depends_on:
      postgres:
        condition: service_healthy
      tts-service:
        condition: service_healthy
    environment:
      DB_URL: jdbc:postgresql://postgres:5432/chinese_app
      DB_USER: chinese
      DB_PASSWORD: chinese
      LLM_BASE_URL: ${LLM_BASE_URL:-https://api.deepseek.com}
      LLM_API_KEY: ${LLM_API_KEY}
      LLM_CHAT_MODEL: ${LLM_CHAT_MODEL:-deepseek-chat}
      TTS_BASE_URL: http://tts-service:8001
      TTS_VOICE: zh-CN-XiaoxiaoNeural
      AUDIO_STORAGE_DIR: /data/audio
      AZURE_SPEECH_KEY: ${AZURE_SPEECH_KEY:-}
      AZURE_SPEECH_REGION: ${AZURE_SPEECH_REGION:-southeastasia}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRY_DAYS: ${JWT_EXPIRY_DAYS:-7}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
    volumes:
      - audio_data:/data/audio
    ports:
      - "8080:8080"

  frontend:
    build:
      context: ./frontend
      args:
        # Vite inlines env at build time, so the client id is passed as a build arg.
        VITE_GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
    depends_on:
      - backend
    ports:
      - "5173:80"

volumes:
  postgres_data:
  audio_data:
```

## Dockerfiles

### Backend (`backend/Dockerfile`)

Multi-stage. Round 2 creates the JRE-only first version; Round 15 adds ffmpeg.

Round 2 version:
```dockerfile
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
RUN ./mvnw -q dependency:go-offline
COPY src src
RUN ./mvnw -q -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
```

Round 15 modification: replace final `FROM` line with:
```dockerfile
FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache ffmpeg
```

### Frontend (`frontend/Dockerfile`)

Multi-stage: Node build → Nginx serve.

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Google OAuth client id is inlined into the bundle at build time (public, not secret).
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Frontend `nginx.conf`

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 120s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### TTS (`tts-service/Dockerfile`)

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/
EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

## `.env.example` (project root)

```
# DeepSeek (https://api-docs.deepseek.com/)
LLM_BASE_URL=https://api.deepseek.com
LLM_API_KEY=sk-replace-me
LLM_CHAT_MODEL=deepseek-chat

# Azure Speech (Round 16+ only — leave blank otherwise)
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=southeastasia

# Auth (Round 22+). JWT_SECRET is a real secret — generate one, e.g.:
#   openssl rand -base64 48
JWT_SECRET=replace-with-a-long-random-secret-min-32-bytes
JWT_EXPIRY_DAYS=7
# Google OAuth Web client id (public). Same value used by backend + frontend.
GOOGLE_CLIENT_ID=replace-with-google-oauth-client-id.apps.googleusercontent.com
```

## Env vars table

| Var | Required for | Where used |
|-----|--------------|------------|
| `LLM_API_KEY` | Round 7+ | Backend → DeepSeek |
| `LLM_BASE_URL` | Round 7+ | Backend; default `https://api.deepseek.com` |
| `LLM_CHAT_MODEL` | Round 7+ | Backend; verify name in DeepSeek docs |
| `LLM_REASONING_MODEL` | (unused in v1) | Reserved |
| `TTS_BASE_URL` | Round 11+ | Backend → tts-service |
| `TTS_VOICE` | Round 11+ | Backend; default `zh-CN-XiaoxiaoNeural` |
| `AUDIO_STORAGE_DIR` | Round 11+ | Backend (in-container path) |
| `AZURE_SPEECH_KEY` | Round 16+ | Backend → Azure |
| `AZURE_SPEECH_REGION` | Round 16+ | Backend → Azure |
| `JWT_SECRET` | Round 22+ | Backend; signs app JWT. **Secret** — required, min 32 bytes |
| `JWT_EXPIRY_DAYS` | Round 22+ | Backend; app JWT lifetime (default 7) |
| `GOOGLE_CLIENT_ID` | Round 22+ | Backend (token audience) **and** frontend build arg `VITE_GOOGLE_CLIENT_ID`. Public, not secret |
| `DB_URL` / `DB_USER` / `DB_PASSWORD` | Round 6+ | Backend → Postgres |

## Security rules

- API keys NEVER appear in frontend source, env, or build output.
- All external API calls originate from the backend.
- `.env` is in `.gitignore`. Only `.env.example` is committed.
- Don't log property objects that contain keys (`log.info(props.toString())` is forbidden).
- `JWT_SECRET` is a real secret — never commit it, never log it, never expose it to the frontend. `GOOGLE_CLIENT_ID` is public and may appear in frontend build output.
- The app must **fail to start** if `JWT_SECRET` or `GOOGLE_CLIENT_ID` is blank (validated in `AuthProperties`), so a misconfigured public deploy can't run with auth silently disabled.

## Volumes

- `postgres_data` — DB files. Wipe with `docker compose down -v` to fully reset.
- `audio_data` — generated TTS MP3s. Demo only; no cleanup job.

## Ports (host)

| Port | Service |
|------|---------|
| 5173 | Frontend (Nginx in container) |
| 8080 | Backend |
| 8001 | TTS service |
| 5432 | PostgreSQL |
