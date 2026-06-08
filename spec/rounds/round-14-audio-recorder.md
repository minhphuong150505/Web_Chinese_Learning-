# Round 14 — Audio recorder smoke test

> **Milestone:** M3 (Pronunciation)
> **Effort:** XS (10–15 min)
> **Prerequisites:** Round 13 complete
> **Blocks if:** nothing (no API needed yet — just records a blob and confirms it's non-empty)

## Goal

Confirm the frontend can capture microphone audio via `MediaRecorder` and produce a non-empty WebM/Opus blob. **`useAudioRecorder`, `RecordButton`, and the full `PronunciationTab` (including the `ScorePanel` originally scoped for Round 18) are already built and running against mock data** — see `spec/06-frontend.md` § Pre-built frontend & the mock seam. This round is a manual smoke test of the recorder with no backend dependency; it doesn't touch the API at all, so there's nothing to "wire up" yet.

No frontend code changes are expected.

## Already built (do not recreate)

- `frontend/src/hooks/useAudioRecorder.ts` — `{ isRecording, start, stop, error }`, exactly per `spec/06-frontend.md` § `useAudioRecorder` hook.
- `frontend/src/features/pronunciation/RecordButton.tsx` — `idle | recording | processing` states; `{ onComplete: (blob: Blob) => void; disabled?: boolean }`.
- `frontend/src/features/pronunciation/PronunciationTab.tsx` — already shows the reference sentence, `RecordButton`, `ScorePanel`, and attempt history wired to mock data (`usePronunciation.ts`, retired in Round 18).
- The Pronounce tab is already enabled in `App.tsx`.

## Files to create / modify

(none — manual smoke test only)

## Steps

1. Open the Pronounce tab. Reference sentence `我想买一杯热茶和两个包子。` and Record button should already be visible (per `spec/11-sample-content.md` §11.2).
2. Click Record → grant the mic permission prompt → button should switch to "Stop".
3. Open DevTools console; temporarily add a `console.log('blob size:', b.size)` at the call site if you want to eyeball the byte count (`onComplete` receives the `Blob`) — or just trust `RecordButton`'s internal `processing` → `idle` transition, which only fires once a non-empty blob resolves.
4. Click Stop → confirm the recorder produces a blob (size > 1000 bytes for a few seconds of speech) and the mic indicator in the browser disappears afterward (tracks released).
5. Deny the permission once (in a fresh context/incognito or by revoking the site permission) → confirm the friendly inline error renders beneath the button with no thrown exceptions.

## References

- `spec/06-frontend.md` § `useAudioRecorder` hook, `RecordButton`, § Pre-built frontend & the mock seam
- `spec/10-pitfalls.md` § Mic permission denied

## Verification

- [ ] Open Pronounce tab → reference sentence visible, Record button shown.
- [ ] Click Record → browser shows mic permission prompt. Grant → button label changes to "Stop".
- [ ] Click Stop → recorder yields a non-empty blob (a few seconds of audio, well over 1 KB); button returns to "Record" once `onComplete` resolves.
- [ ] Deny permission → friendly error message shown beneath the button; no console exceptions.
- [ ] After stop, mic indicator in browser disappears (tracks are released).

## When complete

1. Update Round 14 status.
2. Report: "Round 14 done. Next: Round 15 — ffmpeg + AudioConversionService."
3. **Stop.**
