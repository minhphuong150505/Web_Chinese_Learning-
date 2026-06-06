# 07 — External APIs

## 7.1 DeepSeek (LLM)

- **Base URL**: `https://api.deepseek.com`
- **Endpoint**: `POST /chat/completions`
- **Auth**: header `Authorization: Bearer ${LLM_API_KEY}`
- **Docs to verify before Round 7**: https://api-docs.deepseek.com/

### Request shape (OpenAI-compatible)

```json
{
  "model": "deepseek-chat",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "temperature": 0.7,
  "max_tokens": 1024
}
```

### Response shape

Standard OpenAI completion. Extract `choices[0].message.content`.

### System prompts

Define these as `private static final String` constants inside their respective services.

#### `ConversationService.SYSTEM_PROMPT`

```
You are a friendly Mandarin Chinese conversation partner for a learner.
Rules:
1. Reply in simplified Chinese (简体中文) by default. If the learner writes in another language, reply in Chinese first, then a brief English clarification in parentheses.
2. Keep replies short (1-3 sentences) and at the learner's level.
3. If the learner's Chinese has a clear mistake, gently correct it in one sentence before continuing.
4. Always end with a small question to keep the conversation going.
```

#### `TranslationService.SYSTEM_PROMPT_VI_TO_ZH`

```
You translate Vietnamese to Simplified Chinese.
- Output ONLY the Chinese translation, no commentary.
- Use natural modern Mandarin (Mainland), not Classical Chinese.
```

#### `TranslationService.SYSTEM_PROMPT_ZH_TO_VI`

```
You translate Simplified Chinese to Vietnamese.
- Output ONLY the Vietnamese translation, no commentary.
- Use natural modern Vietnamese.
```

#### `WritingFeedbackService.SYSTEM_PROMPT`

```
You are a Chinese writing tutor. Given a learner's Chinese text, return strict JSON:
{
  "correctedText": "<full corrected text>",
  "comments": [
    { "issue": "<what is wrong>", "suggestion": "<how to fix>", "severity": "info|warn|error" }
  ]
}
Do not include any text outside the JSON.
```

Implementer note: when calling DeepSeek for writing feedback, also set `response_format: { "type": "json_object" }` in the request body if the model supports it. Verify in DeepSeek docs.

## 7.2 Azure Speech — Pronunciation Assessment (Round 16+)

- **Java SDK**: `com.microsoft.cognitiveservices.speech:client-sdk:1.40.0`
- **Auth**: subscription key + region.
- **Language**: `zh-CN`.

### Usage skeleton

```java
SpeechConfig config = SpeechConfig.fromSubscription(key, region);
AudioConfig audio = AudioConfig.fromWavFileInput(wavPath);
SpeechRecognizer recognizer = new SpeechRecognizer(config, "zh-CN", audio);

PronunciationAssessmentConfig assess = new PronunciationAssessmentConfig(
    referenceText,
    PronunciationAssessmentGradingSystem.HundredMark,
    PronunciationAssessmentGranularity.Phoneme,
    /* enableMiscue */ true);
assess.applyTo(recognizer);

SpeechRecognitionResult result = recognizer.recognizeOnceAsync().get(30, TimeUnit.SECONDS);
PronunciationAssessmentResult pron = PronunciationAssessmentResult.fromResult(result);

// Detailed JSON for per-word/syllable/phoneme:
String json = result.getProperties().getProperty(PropertyId.SpeechServiceResponse_JsonResult);
```

### Audio format requirement

Azure expects **16 kHz, 16-bit PCM, mono WAV**. The backend converts the browser's WebM via ffmpeg:

```bash
ffmpeg -y -i input.webm -ar 16000 -ac 1 -c:a pcm_s16le output.wav
```

ffmpeg is installed in the backend Docker image (Round 15).

### Credentials handling

- Implementer MUST stop at the start of Round 16 and ask the user for `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`.
- Do not invent values. Do not commit real keys.
- Free tier (F0) gives 5 hours of pronunciation assessment per month — enough for demo.

## 7.3 edge-tts (TTS micro-service)

The TTS micro-service wraps the `edge-tts` Python library and exposes a simple HTTP endpoint.

### `tts-service/app/main.py`

```python
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import Response
import edge_tts

app = FastAPI()

DEFAULT_VOICE = "zh-CN-XiaoxiaoNeural"

@app.get("/health")
async def health():
    return {"status": "UP"}

@app.get("/tts")
async def tts(text: str = Query(..., min_length=1, max_length=2000),
              voice: str = Query(DEFAULT_VOICE)):
    try:
        communicate = edge_tts.Communicate(text, voice)
        buf = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buf.extend(chunk["data"])
        return Response(content=bytes(buf), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"TTS failed: {e}")
```

### `tts-service/requirements.txt`

```
fastapi==0.115.4
uvicorn[standard]==0.32.0
edge-tts==6.1.12
```

### Voices (zh-CN samples)

- `zh-CN-XiaoxiaoNeural` — female, natural.
- `zh-CN-YunxiNeural` — male.
- `zh-CN-XiaoyiNeural` — female, younger.

Default: `zh-CN-XiaoxiaoNeural`. Configurable via `TTS_VOICE` env.

### `EdgeTtsClient` (Java side)

Just a `WebClient` GET to `${tts.base-url}/tts?text=...&voice=...` returning `byte[]`. Service writes bytes to disk and returns the relative filename.

## 7.4 Google OAuth (sign-in, Round 22+)

Sign-in uses Google Identity Services. The frontend obtains a **Google ID token** (a JWT signed by Google); the backend verifies it and issues its own app JWT. No OAuth authorization-code/redirect flow, no Google API scopes beyond basic profile.

### Setup (one-time, by the operator)

1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID** → type **Web application**.
2. Authorized JavaScript origins: `http://localhost:5173` (dev) and the public origin when deployed.
3. Copy the **Client ID** → set as `GOOGLE_CLIENT_ID` (backend) and `VITE_GOOGLE_CLIENT_ID` (frontend). They must be the **same** value.
4. No client secret is needed (ID-token verification only).

### Frontend

- `@react-oauth/google`: wrap the app in `<GoogleOAuthProvider clientId={...}>`, render `<GoogleLogin onSuccess={...}/>`.
- `onSuccess` gives `credentialResponse.credential` — that string is the Google ID token. POST it to `/api/auth/google`.

### Backend verification (`GoogleTokenVerifier`)

```java
GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(transport, jsonFactory)
    .setAudience(Collections.singletonList(googleClientId))   // app.auth.google.client-id
    .build();

GoogleIdToken token = verifier.verify(idTokenString);          // null if invalid/expired
if (token == null) return Optional.empty();
GoogleIdToken.Payload p = token.getPayload();
// p.getSubject() = google_sub, p.getEmail(), (String) p.get("name")
```

- The library checks signature (against Google's rotating certs), expiry, issuer (`accounts.google.com`), and audience.
- **Credentials handling:** `GOOGLE_CLIENT_ID` is a public identifier, not a secret. `JWT_SECRET` **is** secret (signs your app tokens) — never commit it; the implementer MUST stop at the start of Round 22 and ask the operator for `JWT_SECRET` and `GOOGLE_CLIENT_ID`.

### App JWT (issued by `JwtService`)

- Algorithm HS256, signed with `JWT_SECRET`.
- Claims: `sub` = `user.id` (UUID), `email`, `name`; `exp` = now + `JWT_EXPIRY_DAYS`.
- Verified on every request by `JwtAuthFilter` (see `05-backend.md` § Security).
