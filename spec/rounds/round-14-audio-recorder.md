# Round 14 — Audio recorder hook + RecordButton

> **Milestone:** M3 (Pronunciation)
> **Effort:** M (40–60 min)
> **Prerequisites:** Round 13 complete
> **Blocks if:** nothing (no API needed yet — just records a blob and logs its size)

## Goal

Frontend can capture microphone audio via `MediaRecorder`, produce a WebM/Opus blob, and surface it via a `RecordButton` component. No backend call yet — just confirm the blob is non-empty.

## Files to create

- `frontend/src/hooks/useAudioRecorder.ts`
- `frontend/src/features/pronunciation/RecordButton.tsx`
- `frontend/src/features/pronunciation/PronunciationTab.tsx` (minimal placeholder for this round)

## Files to modify

- `frontend/src/App.tsx` — enable the "Pronounce" tab and route to `PronunciationTab`.

## Steps

1. Implement `useAudioRecorder` per `spec/06-frontend.md` § `useAudioRecorder` hook:
   ```ts
   import { useRef, useState, useCallback } from 'react';

   export function useAudioRecorder() {
     const recorderRef = useRef<MediaRecorder | null>(null);
     const chunksRef = useRef<Blob[]>([]);
     const streamRef = useRef<MediaStream | null>(null);
     const [isRecording, setRecording] = useState(false);
     const [error, setError] = useState<string | null>(null);

     const start = useCallback(async () => {
       setError(null);
       if (!('MediaRecorder' in window)) {
         setError('Audio recording is not supported in this browser.');
         throw new Error('Unsupported');
       }
       try {
         const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
         streamRef.current = stream;
         const recorder = new MediaRecorder(stream);
         chunksRef.current = [];
         recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
         recorder.start();
         recorderRef.current = recorder;
         setRecording(true);
       } catch (e: unknown) {
         setError('Microphone permission denied or unavailable.');
         throw e;
       }
     }, []);

     const stop = useCallback(() => {
       return new Promise<Blob>((resolve, reject) => {
         const recorder = recorderRef.current;
         if (!recorder) return reject(new Error('Not recording'));
         recorder.onstop = () => {
           const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
           streamRef.current?.getTracks().forEach(t => t.stop());
           streamRef.current = null;
           recorderRef.current = null;
           setRecording(false);
           resolve(blob);
         };
         recorder.stop();
       });
     }, []);

     return { isRecording, start, stop, error };
   }
   ```
2. Build `RecordButton`:
   - Props: `{ onComplete: (blob: Blob) => void; disabled?: boolean }`.
   - States: `idle | recording | processing`.
   - Click idle → `start()` → state `recording`. Click recording → `stop()` → state `processing` → call `onComplete(blob)` → state `idle`.
   - Visible label changes per state: "Record" / "Stop" / "Processing...".
   - Display `error` inline (red text) when set.
3. Build `PronunciationTab` (placeholder for this round):
   - Hardcoded reference text on screen: `你好，今天天气怎么样？`
   - `<RecordButton onComplete={(b) => console.log('blob size:', b.size)} />`
   - "Score panel coming in Round 18." note.
4. Update `App.tsx`:
   - Enable `pronounce: true` in TabBar.
   - `{tab === 'pronounce' && <PronunciationTab />}`.

## References

- `spec/06-frontend.md` § `useAudioRecorder` hook, `RecordButton`
- `spec/10-pitfalls.md` § Mic permission denied

## Verification

- [ ] Open Pronounce tab → reference sentence visible, Record button shown.
- [ ] Click Record → browser shows mic permission prompt. Grant → button label changes to "Stop".
- [ ] Click Stop → DevTools console shows `blob size: <N>` with N > 1000 (a few seconds of audio).
- [ ] Deny permission → friendly error message shown beneath the button; no console exceptions.
- [ ] After stop, mic indicator in browser disappears (tracks are released).

## When complete

1. Update Round 14 status.
2. Report: "Round 14 done. Next: Round 15 — ffmpeg + AudioConversionService."
3. **Stop.**
