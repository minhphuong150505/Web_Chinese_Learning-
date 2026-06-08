import { useEffect, useRef } from 'react';
import Icon from '../../components/Icon';
import Hanzi from '../../components/Hanzi';
import { toZhTokens } from '../../lib/zh';
import type { Role } from '../../types/chat';

interface MessageBubbleProps {
  role: Role;
  content: string;
  audioUrl?: string | null;
  soundOn: boolean;
  autoPlayAudio?: boolean;
  onAudioAutoPlayAttempt?: () => void;
}

function pauseOtherChatAudio(current: HTMLAudioElement) {
  document.querySelectorAll<HTMLAudioElement>('audio[data-chat-audio="true"]').forEach((audio) => {
    if (audio !== current) {
      audio.pause();
      audio.currentTime = 0;
    }
  });
}

export default function MessageBubble({
  role,
  content,
  audioUrl,
  soundOn,
  autoPlayAudio = false,
  onAudioAutoPlayAttempt,
}: MessageBubbleProps) {
  const isAssistant = role === 'assistant';
  const audioRef = useRef<HTMLAudioElement>(null);
  const didAttemptAutoPlay = useRef(false);

  useEffect(() => {
    if (!autoPlayAudio || !audioUrl || !soundOn || didAttemptAutoPlay.current) return;

    didAttemptAutoPlay.current = true;
    const audio = audioRef.current;
    if (audio) {
      pauseOtherChatAudio(audio);
      void audio.play().catch(() => undefined);
    }
    onAudioAutoPlayAttempt?.();
  }, [audioUrl, autoPlayAudio, onAudioAutoPlayAttempt, soundOn]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
    };
  }, []);

  function handleAudioPlay() {
    const audio = audioRef.current;
    if (audio) pauseOtherChatAudio(audio);
  }

  return (
    <div className={'mb-4 flex items-end gap-3' + (isAssistant ? '' : ' flex-row-reverse')}>
      {isAssistant && (
        <div className="grid h-[34px] w-[34px] flex-none place-items-center rounded-full border border-violet-100 bg-violet-50 text-violet-600">
          <Icon name="spark" size={16} />
        </div>
      )}
      <div className={'flex max-w-[76%] flex-col' + (isAssistant ? '' : ' items-end')}>
        <div
          className={
            'animate-rise rounded-[20px] px-[17px] py-[13px] leading-relaxed ' +
            (isAssistant
              ? 'rounded-bl-[7px] border border-slate-200 bg-white text-slate-900 shadow-sm'
              : 'rounded-br-[7px] bg-violet-600 text-white shadow-accent')
          }
        >
          <Hanzi tokens={toZhTokens(content)} className="text-[21px]" />
        </div>
        {isAssistant && audioUrl && soundOn && (
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            preload="none"
            data-chat-audio="true"
            onPlay={handleAudioPlay}
            className="mt-2 w-full max-w-xs"
          />
        )}
      </div>
    </div>
  );
}
