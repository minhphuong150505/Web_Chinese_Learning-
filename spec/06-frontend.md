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

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 90_000,
});

apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg = err.response?.data?.message ?? err.message;
    return Promise.reject(new Error(msg));
  }
);
```

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

## Styling

- Tailwind utility classes only.
- Custom CSS limited to `src/index.css` (font import, body background).
- Palette: indigo primary, slate neutrals, red/yellow/green for scores.
- No component library (no MUI, Chakra, Radix) — keeps bundle small.

## Environment

`frontend/.env.example`:

```
VITE_API_BASE_URL=http://localhost:8080/api
```

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
