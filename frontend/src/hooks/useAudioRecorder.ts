import { useRef, useState, useCallback } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';

export interface AudioRecorder {
  isRecording: boolean;
  start: () => Promise<void>;
  stop: () => Promise<Blob>;
  error: string | null;
}

export function useAudioRecorder(): AudioRecorder {
  const { text } = useLanguage();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function looksLikeSystemAudio(track: MediaStreamTrack): boolean {
    const label = track.label.toLowerCase();
    return [
      'stereo mix',
      'loopback',
      'monitor of',
      'system audio',
      'desktop audio',
      'what u hear',
    ].some((hint) => label.includes(hint));
  }

  const start = useCallback(async () => {
    setError(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      const message =
        text(
          'Micro chỉ hoạt động qua HTTPS. Hãy mở trang bằng địa chỉ https:// rồi thử lại.',
          'The microphone only works over HTTPS. Open the site using https:// and try again.',
        );
      setError(message);
      throw new Error(message);
    }
    if (!('MediaRecorder' in window)) {
      setError(text('Trình duyệt này không hỗ trợ ghi âm.', 'This browser does not support audio recording.'));
      throw new Error('Unsupported');
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      const track = stream.getAudioTracks()[0];
      if (!track || looksLikeSystemAudio(track)) {
        stream.getTracks().forEach((t) => t.stop());
        setError(
          text(
            'Vui lòng chọn micro thật, không dùng âm thanh hệ thống.',
            'Select a physical microphone instead of system audio.',
          ),
        );
        throw new Error('System audio input is not allowed');
      }
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
      const permissionDenied =
        e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      setError((current) =>
        current ??
        (permissionDenied
          ? text(
              'Chrome đang chặn quyền micro. Hãy cho phép Microphone trong cài đặt trang rồi thử lại.',
              'Chrome is blocking microphone access. Allow Microphone in the site settings and try again.',
            )
          : text(
              'Không thể mở micro. Hãy kiểm tra thiết bị đầu vào rồi thử lại.',
              'Could not open the microphone. Check your input device and try again.',
            )),
      );
      throw e;
    }
  }, [text]);

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
