# Round 10 — Chat UI

> **Milestone:** M1
> **Effort:** S (20–30 min)
> **Prerequisites:** Round 09 complete (backend chat working via curl)
> **Blocks if:** nothing

## Goal

Browser-based chat works against the **real backend**: user types Chinese, sees their bubble, AI reply appears as another bubble. History persists across page refreshes. No audio yet (Round 13).

The chat UI — types, API client, query setup, hooks, and every component listed below — is **already built and running against mock data** (see `spec/06-frontend.md` § Pre-built frontend & the mock seam). This round does not write any new frontend UI; it retires the chat mock handlers so the existing screen talks to the backend you just built.

## Already built (do not recreate)

- `frontend/src/types/chat.ts`
- `frontend/src/lib/apiClient.ts`, `frontend/src/lib/queryClient.ts`
- `frontend/src/hooks/useConversation.ts`, `frontend/src/hooks/useSendMessage.ts`
- `frontend/src/components/Layout.tsx`, `TabBar.tsx`, `Spinner.tsx`
- `frontend/src/features/chat/ChatTab.tsx`, `MessageList.tsx`, `MessageBubble.tsx`, `MessageComposer.tsx`
- `frontend/src/main.tsx` (already wraps the tree in `<QueryClientProvider>`)
- `frontend/src/App.tsx` (chat tab already wired and active by default)

Confirm `types/chat.ts` matches the backend DTOs you just shipped:

```ts
export type Role = 'user' | 'assistant' | 'system';

export interface MessageDto {
  id: string;
  role: Role;
  content: string;
  audioUrl: string | null;
  createdAt: string;
}

export interface ConversationDto {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatResponse {
  userMessage: MessageDto;
  assistantMessage: MessageDto;
}
```

If your backend DTOs differ, **change the backend to match this contract** (it's the one the whole frontend was built against) rather than editing frontend types.

## Files to modify

- `frontend/src/mocks/server.ts` — delete the chat mock handlers.
- `frontend/src/mocks/data.ts` — delete fixtures that become unused once those handlers are gone.

## Steps

1. In `frontend/src/mocks/server.ts`, remove these handlers (and the in-closure `messages`/`conversationCreated` state they use):
   - `mock.onGet('/conversations')`
   - `mock.onPost('/conversations')`
   - `mock.onGet(/\/conversations\/[\w-]+\/messages/)`
   - `mock.onPost(/\/conversations\/[\w-]+\/messages/)`
2. In `frontend/src/mocks/data.ts`, remove now-unused exports (`CHAT_GREETING`, `CHAT_SCENARIO_EN`, `nextAssistantReply`, `CHAT_SUGGESTIONS`, `MOCK_CONVERSATION`, `mockId` if nothing else uses it) and their now-dangling imports in `server.ts`.
   - **Keep** anything still used by pronunciation/translation/writing/auth mocks (those handlers retire in later rounds).
3. Run `npm run dev` with the backend up. Requests to `/conversations` and `/conversations/:id/messages` now fall through (`onNoMatch: 'passthrough'`) to the real backend — no main.tsx or component change needed.

## References

- `spec/06-frontend.md` § Pre-built frontend & the mock seam, § API client, § TanStack Query setup
- `spec/05-backend.md` § REST endpoints (for DTO shapes)
- `spec/10-pitfalls.md` § CORS, Tailwind JIT

## Verification

- [ ] `npm run dev` (Vite) + backend running in compose → open `http://localhost:5173`.
- [ ] First load: empty state shows; one conversation is auto-created (via the real `POST /conversations`).
- [ ] Type "你好" → after a short wait, two bubbles appear (user + assistant in Chinese), driven by the real `LlmClient`-backed reply (no longer the scripted mock turns).
- [ ] Refresh page → both bubbles still visible (history persists in Postgres, not localStorage).
- [ ] Empty message can't be sent (Send button disabled).
- [ ] DevTools → Network: requests to `/conversations*` show `200` from `localhost` (backend), not the 500 ms mock delay; no requests to `api.deepseek.com` directly from the frontend.
- [ ] DevTools → Sources: searching for "Bearer" or `LLM_API_KEY` finds nothing.
- [ ] `npm run build` succeeds with no TS errors.

## When complete

1. Update Round 10 status.
2. Report: "Round 10 done. Milestone 1 (Text chat) complete. Next: Round 11 — Backend TTS client + service."
3. **Stop.**
