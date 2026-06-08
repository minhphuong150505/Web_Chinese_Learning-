import { useRef, useState, useCallback } from 'react';

export interface AudioRecorder {
  isRecording: boolean;
  start: () => Promise<void>;
  stop: () => Promise<Blob>;
  error: string | null;
}

export function useAudioRecorder(): AudioRecorder {
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
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
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
        streamRef.current?.getTracks().forEach((t) => t.stop());
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
