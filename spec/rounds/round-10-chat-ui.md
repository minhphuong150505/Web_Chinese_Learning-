# Round 10 — Chat UI

> **Milestone:** M1
> **Effort:** L (60–90 min)
> **Prerequisites:** Round 09 complete (backend chat working via curl)
> **Blocks if:** nothing

## Goal

Browser-based chat works: user types Chinese, sees their bubble, AI reply appears as another bubble. History persists across page refreshes. No audio yet (Round 13).

## Files to create

- `frontend/src/types/chat.ts`
- `frontend/src/lib/apiClient.ts`
- `frontend/src/lib/queryClient.ts`
- `frontend/src/hooks/useConversation.ts`
- `frontend/src/hooks/useSendMessage.ts`
- `frontend/src/components/Layout.tsx`
- `frontend/src/components/TabBar.tsx`
- `frontend/src/components/Spinner.tsx`
- `frontend/src/features/chat/ChatTab.tsx`
- `frontend/src/features/chat/MessageList.tsx`
- `frontend/src/features/chat/MessageBubble.tsx`
- `frontend/src/features/chat/MessageComposer.tsx`

## Files to modify

- `frontend/src/App.tsx` — replace placeholder with the chat tab layout.
- `frontend/src/main.tsx` — wrap `<App />` with `<QueryClientProvider>`.

## Steps

1. Create `types/chat.ts` mirroring backend DTOs:
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
2. Create `lib/apiClient.ts` and `lib/queryClient.ts` exactly per `spec/06-frontend.md` § "API client" and "TanStack Query setup".
3. Wrap app in `main.tsx`:
   ```tsx
   import { QueryClientProvider } from '@tanstack/react-query';
   import { queryClient } from './lib/queryClient';

   createRoot(document.getElementById('root')!).render(
     <QueryClientProvider client={queryClient}>
       <App />
     </QueryClientProvider>
   );
   ```
4. Create `hooks/useConversation.ts`:
   - Query: list conversations.
   - On mount with empty list → create one via mutation, then invalidate.
   - Expose current conversation id + messages query.
   ```ts
   export function useConversation() {
     const qc = useQueryClient();
     const list = useQuery({
       queryKey: ['conversations'],
       queryFn: () => apiClient.get<ConversationDto[]>('/conversations').then(r => r.data),
     });
     // auto-create if empty
     useEffect(() => {
       if (list.data && list.data.length === 0) {
         apiClient.post<ConversationDto>('/conversations').then(() =>
           qc.invalidateQueries({ queryKey: ['conversations'] })
         );
       }
     }, [list.data, qc]);
     const current = list.data?.[0];
     const messages = useQuery({
       queryKey: ['messages', current?.id],
       queryFn: () => apiClient.get<MessageDto[]>(`/conversations/${current!.id}/messages`).then(r => r.data),
       enabled: !!current,
     });
     return { conversation: current, messages };
   }
   ```
5. Create `hooks/useSendMessage.ts`:
   ```ts
   export function useSendMessage(conversationId: string | undefined) {
     const qc = useQueryClient();
     return useMutation({
       mutationFn: (content: string) =>
         apiClient.post<ChatResponse>(`/conversations/${conversationId}/messages`, { content })
                  .then(r => r.data),
       onSuccess: () => qc.invalidateQueries({ queryKey: ['messages', conversationId] }),
     });
   }
   ```
6. Build components:
   - `Layout.tsx`: container with header "Chinese Learning App" + children.
   - `TabBar.tsx`: 4 tabs; only "Chat" enabled; others tooltipped "Coming in Round N".
   - `MessageBubble.tsx`: per `spec/06-frontend.md` § "Component contracts". For now audio playback is a no-op (will be revisited in Round 13 — keep the `audioUrl` prop in the type even if unused).
   - `MessageList.tsx`: maps messages to bubbles. Auto-scroll to bottom on update.
   - `MessageComposer.tsx`: textarea + Send button. Disables send while mutation pending. Submit on Cmd/Ctrl+Enter.
   - `ChatTab.tsx`: composes the above.
   - `Spinner.tsx`: simple Tailwind spinner; shown while `isPending`.
7. Update `App.tsx`:
   ```tsx
   import { useState } from 'react';
   import { Layout } from './components/Layout';
   import { TabBar } from './components/TabBar';
   import { ChatTab } from './features/chat/ChatTab';

   type Tab = 'chat' | 'pronounce' | 'translate' | 'write';

   export default function App() {
     const [tab, setTab] = useState<Tab>('chat');
     return (
       <Layout>
         <TabBar active={tab} onChange={setTab}
           enabled={{ chat: true, pronounce: false, translate: false, write: false }} />
         {tab === 'chat' && <ChatTab />}
       </Layout>
     );
   }
   ```

## References

- `spec/06-frontend.md`
- `spec/05-backend.md` § REST endpoints (for DTO shapes)
- `spec/10-pitfalls.md` § CORS, Tailwind JIT

## Verification

- [ ] `npm run dev` (Vite) + backend running in compose → open `http://localhost:5173`.
- [ ] First load: empty state shows; one conversation is auto-created.
- [ ] Type "你好" → after a short wait, two bubbles appear (user + assistant in Chinese).
- [ ] Refresh page → both bubbles still visible (history persists).
- [ ] Empty message can't be sent (Send button disabled).
- [ ] DevTools → Network: no requests to `api.deepseek.com` from frontend (all go via `/api/` to backend).
- [ ] DevTools → Sources: searching for "Bearer" or `LLM_API_KEY` finds nothing.
- [ ] `npm run build` succeeds with no TS errors.

## When complete

1. Update Round 10 status.
2. Report: "Round 10 done. Milestone 1 (Text chat) complete. Next: Round 11 — Backend TTS client + service."
3. **Stop.**
