import Icon from '../../components/Icon';
import Hanzi from '../../components/Hanzi';
import { toZhTokens } from '../../lib/zh';
import type { Role } from '../../types/chat';

interface MessageBubbleProps {
  role: Role;
  content: string;
  audioUrl?: string | null;
  soundOn: boolean;
}

export default function MessageBubble({ role, content, audioUrl, soundOn }: MessageBubbleProps) {
  const isAssistant = role === 'assistant';

  return (
    <div className={'mb-4 flex items-end gap-3' + (isAssistant ? '' : ' flex-row-reverse')}>
      {isAssistant && (
        <div className="grid h-[34px] w-[34px] flex-none place-items-center rounded-full border border-indigo-100 bg-indigo-50 text-indigo-600">
          <Icon name="spark" size={16} />
        </div>
      )}
      <div className={'flex max-w-[76%] flex-col' + (isAssistant ? '' : ' items-end')}>
        <div
          className={
            'animate-rise rounded-[20px] px-[17px] py-[13px] leading-relaxed ' +
            (isAssistant
              ? 'rounded-bl-[7px] border border-slate-200 bg-white text-slate-900 shadow-sm'
              : 'rounded-br-[7px] bg-indigo-600 text-white shadow-accent')
          }
        >
          <Hanzi tokens={toZhTokens(content)} className="text-[21px]" />
        </div>
        {isAssistant && audioUrl && soundOn && (
          <audio src={audioUrl} controls autoPlay className="mt-2 w-full max-w-xs" />
        )}
      </div>
    </div>
  );
}
