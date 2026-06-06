# 06 — Frontend Design

## Top-level layout

```
┌────────────────────────────────────────────────┐
│  Chinese Learning App                           │
├────────────────────────────────────────────────┤
│  [Chat] [Pronounce] [Translate] [Write]        │  ← TabBar
├────────────────────────────────────────────────┤
│                                                 │
│       <active tab content>                      │
│                                                 │
└────────────────────────────────────────────────┘
```

Single page. `App.tsx` owns active tab in `useState<TabName>`. No router.

The whole app is **gated behind sign-in** (Milestone 5):

```
main.tsx
 └─ GoogleOAuthProvider (clientId = VITE_GOOGLE_CLIENT_ID)
     └─ QueryClientProvider
         └─ AuthProvider                     # restores token from localStorage on load
             └─ App
                 ├─ if !user → <LoginScreen/> (just the Google button)
                 └─ if  user → <Layout/> with TabBar + active tab
```

A small header shows the signed-in user's name + a "Sign out" button (clears token, returns to `LoginScreen`).

## Component contracts

### `MessageBubble.tsx`
- Props: `{ role: 'user' | 'assistant'; content: string; audioUrl?: string }`
- If `role === 'assistant'` and `audioUrl` is set → render `<audio src={audioUrl} controls autoPlay />`.
- Right-aligned bubble for user, left-aligned for assistant. Long text wraps.

### `RecordButton.tsx`
- Props: `{ onComplete: (blob: Blob) => void; disabled?: boolean }`
- States: `idle | recording | processing`. Click toggles. Uses `useAudioRecorder`.

### `ScorePanel.tsx`
- Props: `{ result: PronunciationResponse }`
- Four big numeric scores (accuracy / fluency / completeness / prosody).
- Per-word table with color-coded background by `accuracyScore`:
  - green ≥ 85, yellow 60–84, red < 60.

### `TabBar.tsx`
- Props: `{ active: TabName; onChange: (t: TabName) => void; enabled: Record<TabName, boolean> }`
- Disabled tabs show a tooltip ("Coming in Round N").

## `useAudioRecorder` hook

```ts
type Recorder = {
  isRecording: boolean;
  start: () => Promise<void>;
  stop: () => Promise<Blob>;        // resolves with WebM/Opus blob
  error: string | null;
};
```

Requirements:
- Request `getUserMedia({ audio: true })` lazily on first `start()`.
- Use default `MediaRecorder` mime (`audio/webm;codecs=opus`).
- Throw a clear error if `MediaRecorder` is unsupported.
- Release `MediaStreamTrack`s on `stop`.

## API client

`src/lib/apiClient.ts`:

```ts
import axios from 'axios';
import { getToken, clearToken } from './authStorage';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 90_000,
});

// Attach the app JWT to every request (Milestone 5).
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    // A 401 means the token is missing/expired → drop it so the app falls back to LoginScreen.
    if (err.response?.status === 401) clearToken();
    const msg = err.response?.data?.message ?? err.message;
    return Promise.reject(new Error(msg));
  }
);
```

`src/lib/authStorage.ts` is a thin wrapper over `localStorage` (`getToken`, `setToken`, `clearToken`) under a single key (`cl_app_token`). It is the **only** module that touches `localStorage` for auth.

## TanStack Query setup

`src/lib/queryClient.ts`:

```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});
```

Pattern:
- Components do not call `apiClient` directly.
- Hooks named `useXxx` wrap queries/mutations; components consume hooks.

Example mutation hook:

```ts
export function useSendMessage(conversationId: string) {
  return useMutation({
    mutationFn: (content: string) =>
      apiClient
        .post<ChatResponse>(`/conversations/${conversationId}/messages`, { content })
        .then((r) => r.data),
  });
}
```

## Auth (Milestone 5)

### `auth/AuthProvider.tsx`

Holds auth state and exposes it via context:

```ts
type AuthState = {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;  // persists token, sets state
  logout: () => void;                            // clears token + state
};
```

- On mount: if `authStorage.getToken()` returns a token, call `GET /api/auth/me` to rehydrate `user`. If that 401s, clear the token and stay logged out.
- `login` is called by `useGoogleLogin` after a successful `POST /api/auth/google`.

### `hooks/useAuth.ts`

```ts
export function useAuth(): AuthState; // throws if used outside <AuthProvider>
```

### `hooks/useGoogleLogin.ts`

Wraps the `POST /api/auth/google` mutation. On success, calls `auth.login(res.token, res.user)`.

### `features/auth/LoginScreen.tsx`

- Centered card: app title + the `<GoogleLogin>` button from `@react-oauth/google`.
- `onSuccess` → take the Google `credential` (ID token) → `useGoogleLogin().mutate(credential)`.
- Shows an inline error if login fails. No password fields (Google-only).

### Hook → endpoint guard

All feature hooks (`useConversation`, `useSendMessage`, `usePronunciation`, …) already go through `apiClient`, so they automatically carry the token. They are only ever mounted **inside** the authenticated branch of `App`, so they never fire while logged out.

## Styling

- Tailwind utility classes only.
- Custom CSS limited to `src/index.css` (font import, body background).
- Palette: indigo primary, slate neutrals, red/yellow/green for scores.
- No component library (no MUI, Chakra, Radix) — keeps bundle small.

## Environment

`frontend/.env.example`:

```
VITE_API_BASE_URL=http://localhost:8080/api
VITE_GOOGLE_CLIENT_ID=replace-with-google-oauth-client-id.apps.googleusercontent.com
```

- `VITE_GOOGLE_CLIENT_ID` is **not a secret** — it's a public OAuth client id, safe to ship in frontend build output. The backend independently verifies the Google token against the same client id (`GOOGLE_CLIENT_ID`).

- **Dev**: Vite dev server proxies `/api` → `http://localhost:8080` via `vite.config.ts`.
- **Container**: served by Nginx; Nginx proxies `/api` → `backend:8080` (see Round 3 `nginx.conf`).

## TypeScript rules

- `strict: true`, `noUncheckedIndexedAccess: true`.
- Functional components only. No class components.
- One component per file. File name matches the default export.
- No `any`. Use `unknown` and narrow.
- Import order: stdlib/3rd-party → absolute (`@/`) → relative (`./`).

## File-naming

- Components: `PascalCase.tsx`
- Hooks: `camelCase.ts` (`useFoo.ts`)
- Plain modules: `camelCase.ts`
- Types: `camelCase.ts` (one type file per feature in `types/`)
