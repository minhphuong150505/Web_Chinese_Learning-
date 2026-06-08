import { useRef, useState, type KeyboardEvent } from 'react';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import Hanzi from '../../components/Hanzi';
import { toZhTokens } from '../../lib/zh';

interface MessageComposerProps {
  onSend: (content: string) => void;
  pending: boolean;
  suggestions: string[];
}

export default function MessageComposer({ onSend, pending, suggestions }: MessageComposerProps) {
  const [text, setText] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  function submit(content?: string) {
    const value = (content ?? text).trim();
    if (!value || pending) return;
    onSend(value);
    setText('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex-none border-t border-slate-200 bg-white px-7 py-4">
      <div className="mx-auto flex max-w-[820px] flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Try:</span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              disabled={pending}
              onClick={() => submit(s)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-[13px] font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Hanzi tokens={toZhTokens(s)} pinyin={false} />
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2.5">
          <textarea
            ref={taRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type in Chinese…  (⌘/Ctrl + Enter to send)"
            className="scroll min-h-[44px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="button"
            onClick={() => submit()}
            disabled={pending || !text.trim()}
            className="inline-flex h-[44px] items-center gap-2 rounded-2xl bg-indigo-600 px-5 text-[14px] font-semibold text-white shadow-accent transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? <Spinner size={16} /> : <Icon name="send" size={16} />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
