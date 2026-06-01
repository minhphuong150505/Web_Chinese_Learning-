# Round 13 — Audio playback in chat UI

> **Milestone:** M2
> **Effort:** S (20–30 min)
> **Prerequisites:** Round 12 complete (backend returns `audioUrl`)
> **Blocks if:** nothing

## Goal

Assistant messages auto-play their Chinese audio in the browser. A simple "Sound on/off" toggle in the chat header controls whether audio renders.

## Files to create

(none)

## Files to modify

- `frontend/src/features/chat/MessageBubble.tsx` — render `<audio>` for assistant messages with `audioUrl`.
- `frontend/src/features/chat/ChatTab.tsx` — add sound on/off toggle in the header area; pass `soundOn` down via prop drilling (no context needed for one boolean).
- `frontend/src/features/chat/MessageList.tsx` — pass `soundOn` to each `MessageBubble`.

## Steps

1. Update `MessageBubble` props to add `soundOn: boolean`. Inside the component:
   ```tsx
   {role === 'assistant' && audioUrl && soundOn && (
     <audio src={audioUrl} controls autoPlay className="mt-2 w-full" />
   )}
   ```
   - When `soundOn` is false: render nothing (the audio is fully omitted, so no autoplay is triggered).
   - The `audioUrl` from the backend is a relative path (`/api/audio/...`); the dev proxy and Nginx in prod both handle it without changes.
2. Update `ChatTab`:
   - Local state: `const [soundOn, setSoundOn] = useState(true);`.
   - Add a small toggle button at the top right of the chat area: "🔊 Sound: On / Off" (text only, no emoji if user objects later — see Claude.md emoji rule; **use text label "Sound: on / off"** instead).
3. Update `MessageList` to thread `soundOn` to each bubble.
4. Auto-scroll fix: when a new assistant message arrives, the audio element may shift the layout — ensure `MessageList` scrolls to bottom on `messages.length` change (probably already done in Round 10; reverify).

## References

- `spec/06-frontend.md` § `MessageBubble.tsx`
- `spec/10-pitfalls.md` § Browser autoplay

## Verification

- [ ] Send "你好" → assistant bubble appears with an `<audio>` element that auto-plays Chinese audio.
- [ ] Toggle sound off → new assistant messages do not render audio. (Already-rendered bubbles keep their player; that's fine.)
- [ ] Toggle sound back on → next message plays audio again.
- [ ] Refresh page → existing assistant messages still show their audio players (since `audioUrl` is persisted).
- [ ] Stop `tts-service` mid-session → next message arrives without audio; UI does not break.
- [ ] No console errors in DevTools.

## When complete

1. Update Round 13 status.
2. Report: "Round 13 done. Milestone 2 (TTS audio) complete. Next: Round 14 — Audio recorder hook + RecordButton. **Round 16 will require Azure key.**"
3. **Stop.**
