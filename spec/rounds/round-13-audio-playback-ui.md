# Round 13 — Audio playback in chat UI

> **Milestone:** M2
> **Effort:** XS (10–15 min)
> **Prerequisites:** Round 12 complete (backend returns `audioUrl`)
> **Blocks if:** nothing

## Goal

Assistant messages auto-play their Chinese audio in the browser, controlled by a "Sound: on/off" toggle in the chat header. **This UI is already built and running against mock data** (the mock always returns `audioUrl: null`, so no player has rendered yet in dev). This round is pure verification: confirm the pre-built playback wiring lights up correctly now that the real backend returns non-null `audioUrl` values.

No frontend code changes are expected. If the checks below fail, fix the existing component to match its contract in `spec/06-frontend.md` § `MessageBubble.tsx` rather than redesigning it.

## Already built (do not recreate)

- `frontend/src/features/chat/MessageBubble.tsx` — renders, for assistant messages:
  ```tsx
  {role === 'assistant' && audioUrl && soundOn && (
    <audio src={audioUrl} controls autoPlay className="mt-2 w-full" />
  )}
  ```
- `frontend/src/features/chat/ChatTab.tsx` — owns `const [soundOn, setSoundOn] = useState(true)` and renders the "Sound: on / off" toggle (text label, no emoji).
- `frontend/src/features/chat/MessageList.tsx` — threads `soundOn` to each bubble and auto-scrolls on new messages.

## Files to create / modify

(none — verification only)

## Steps

1. With the real backend running (Round 12 merged), open the Chat tab and send a message.
2. Confirm the assistant bubble renders an `<audio>` element pointing at the backend's relative `audioUrl` (e.g. `/api/audio/...`) and that it autoplays. The dev proxy and Nginx in prod both pass this through unchanged — no `apiClient`/`vite.config` edits needed.
3. Toggle "Sound: off" / "Sound: on" and confirm the behavior described in Verification below.
4. If anything is off, fix it in place in `MessageBubble`/`ChatTab`/`MessageList` — these files are otherwise considered final.

## References

- `spec/06-frontend.md` § `MessageBubble.tsx`, § Pre-built frontend & the mock seam
- `spec/10-pitfalls.md` § Browser autoplay

## Verification

- [ ] Send "你好" → assistant bubble appears with an `<audio>` element that auto-plays Chinese audio.
- [ ] Toggle sound off → new assistant messages do not render audio. (Already-rendered bubbles keep their player; that's fine.)
- [ ] Toggle sound back on → next message plays audio again.
- [ ] Refresh page → existing assistant messages still show their audio players (since `audioUrl` is persisted server-side).
- [ ] Stop `tts-service` mid-session → next message arrives without audio; UI does not break.
- [ ] No console errors in DevTools.

## When complete

1. Update Round 13 status.
2. Report: "Round 13 done. Milestone 2 (TTS audio) complete. Next: Round 14 — Audio recorder hook + RecordButton smoke test."
3. **Stop.**
