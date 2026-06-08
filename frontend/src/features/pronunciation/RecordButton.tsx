import { useState } from 'react';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';

type RecordState = 'idle' | 'recording' | 'processing';

interface RecordButtonProps {
  onComplete: (blob: Blob) => void;
  disabled?: boolean;
}

const STATUS_TEXT: Record<RecordState, string> = {
  idle: 'Tap to record, then read the sentence aloud',
  recording: 'Listening… tap again to stop',
  processing: 'Scoring your pronunciation…',
};

export default function RecordButton({ onComplete, disabled }: RecordButtonProps) {
  const recorder = useAudioRecorder();
  const [state, setState] = useState<RecordState>('idle');

  async function click() {
    if (disabled) return;
    if (state === 'idle') {
      setState('recording');
      try {
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
          (state === 'recording' ? 'bg-red-500' : 'bg-indigo-600 hover:bg-indigo-700')
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
      <p className="text-[13.5px] font-medium text-slate-500">{STATUS_TEXT[state]}</p>
      {recorder.error && <p className="text-[13px] font-medium text-red-600">{recorder.error}</p>}
    </div>
  );
}
