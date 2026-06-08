import { useEffect, useRef } from 'react';
import Icon from '../../components/Icon';
import MessageBubble from './MessageBubble';
import type { MessageDto } from '../../types/chat';

interface MessageListProps {
  messages: MessageDto[];
  soundOn: boolean;
  pending: boolean;
  autoPlayMessageId: string | null;
  onAudioAutoPlayAttempt: () => void;
}

export default function MessageList({
  messages,
  soundOn,
  pending,
  autoPlayMessageId,
  onAudioAutoPlayAttempt,
}: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, pending]);

  return (
    <div ref={listRef} className="scroll min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[820px] px-7 pb-7 pt-2.5">
        <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-[13px] font-medium leading-relaxed text-violet-700">
          <Icon name="spark" size={15} className="mt-0.5 flex-none" />
          <span>
            You&rsquo;re at a small restaurant in China. Your AI partner is the server — order in
            Chinese and they&rsquo;ll reply naturally.
          </span>
        </div>

        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            role={m.role}
            content={m.content}
            audioUrl={m.audioUrl}
            soundOn={soundOn}
            autoPlayAudio={m.id === autoPlayMessageId}
            onAudioAutoPlayAttempt={onAudioAutoPlayAttempt}
          />
        ))}

        {pending && (
          <div className="mb-4 flex items-end gap-3">
            <div className="grid h-[34px] w-[34px] flex-none place-items-center rounded-full border border-violet-100 bg-violet-50 text-violet-600">
              <Icon name="spark" size={16} />
            </div>
            <div className="rounded-[20px] rounded-bl-[7px] border border-slate-200 bg-white px-[17px] py-[15px] shadow-sm">
              <span className="typing">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
