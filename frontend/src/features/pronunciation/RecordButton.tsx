import { useState } from 'react';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useLanguage, type Language } from '../../i18n/LanguageProvider';

type RecordState = 'idle' | 'recording' | 'processing';

interface RecordButtonProps {
  onComplete: (blob: Blob) => void;
  onStart?: () => void;
  disabled?: boolean;
}

const STATUS_TEXT: Record<RecordState, Record<Language, string>> = {
  idle: {
    vi: 'Bấm để ghi âm, sau đó đọc to câu mẫu',
    en: 'Tap to record, then read the sentence aloud',
  },
  recording: {
    vi: 'Đang nghe... bấm lần nữa để dừng',
    en: 'Listening... tap again to stop',
  },
  processing: {
    vi: 'Đang chấm phát âm...',
    en: 'Scoring your pronunciation...',
  },
};

export default function RecordButton({ onComplete, onStart, disabled }: RecordButtonProps) {
  const { language } = useLanguage();
  const recorder = useAudioRecorder();
  const [state, setState] = useState<RecordState>('idle');

  async function click() {
    if (disabled) return;
    if (state === 'idle') {
      setState('recording');
      try {
        onStart?.();
        await recorder.start();
      } catch {
        setState('idle');
      }
      return;
    }
    if (state === 'recording') {
      setState('processing');
      try {
        const blob = await recorder.stop();
        onComplete(blob);
      } finally {
        setState('idle');
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={click}
        disabled={disabled || state === 'processing'}
        className={
          'relative grid h-20 w-20 place-items-center rounded-full text-white shadow-accent transition disabled:cursor-progress ' +
          (state === 'recording' ? 'bg-red-500' : 'bg-violet-600 hover:bg-violet-700')
        }
      >
        {state === 'processing' ? (
          <Spinner size={26} />
        ) : (
          <Icon name={state === 'recording' ? 'square' : 'mic'} size={26} />
        )}
        {state === 'recording' && (
          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-red-400 opacity-50" />
        )}
      </button>
      <p className="text-[13.5px] font-medium text-slate-500">
        {STATUS_TEXT[state][language]}
      </p>
      {recorder.error && <p className="text-[13px] font-medium text-red-600">{recorder.error}</p>}
    </div>
  );
}
