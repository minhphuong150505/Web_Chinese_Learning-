import { useRef, useState, type KeyboardEvent } from 'react';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import Hanzi from '../../components/Hanzi';
import { toZhTokens } from '../../lib/zh';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

interface MessageComposerProps {
  onSend: (content: string) => void;
  pending: boolean;
  suggestions: string[];
}

export default function MessageComposer({ onSend, pending, suggestions }: MessageComposerProps) {
  const [text, setText] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);
  const speechBaseRef = useRef('');
  const speech = useSpeechRecognition({
    onTranscript: (transcript) => {
      const base = speechBaseRef.current.trimEnd();
      const needsSpace =
        base.length > 0 &&
        transcript.length > 0 &&
        !/[\u3400-\u9fff]$/.test(base) &&
        !/^[\u3400-\u9fff，。！？]/.test(transcript);
      setText(`${base}${needsSpace ? ' ' : ''}${transcript}`);
    },
  });

  function submit(content?: string) {
    const value = (content ?? text).trim();
    if (!value || pending) return;
    if (speech.isListening) speech.cancel();
    onSend(value);
    setText('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.altKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    submit();
  }

  function toggleVoiceInput() {
    if (pending) return;
    if (speech.isListening) {
      speech.stop();
      return;
    }
    speechBaseRef.current = text;
    speech.start();
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
              className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-[13px] font-medium text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Hanzi tokens={toZhTokens(s)} pinyin={false} />
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2.5">
          <button
            type="button"
            onClick={toggleVoiceInput}
            disabled={pending}
            className={
              'tip relative grid h-[44px] w-[44px] flex-none place-items-center rounded-2xl border transition disabled:cursor-not-allowed disabled:opacity-50 ' +
              (speech.isListening
                ? 'border-violet-600 bg-violet-600 text-white shadow-accent'
                : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700')
            }
            data-tip={
              speech.isListening
                ? 'Stop voice input'
                : speech.supported
                  ? 'Speak in Chinese'
                  : 'Voice input requires Chrome or Edge'
            }
            aria-label={speech.isListening ? 'Stop voice input' : 'Start voice input'}
          >
            <Icon name={speech.isListening ? 'square' : 'mic'} size={18} />
            {speech.isListening && (
              <span className="absolute inset-0 -z-10 animate-ping rounded-2xl bg-violet-400 opacity-40" />
            )}
          </button>
          <textarea
            ref={taRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type in Chinese... Enter to send, Alt + Enter for a new line"
            className="scroll min-h-[44px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
          />
          <button
            type="button"
            onClick={() => submit()}
            disabled={pending || !text.trim()}
            className="inline-flex h-[44px] items-center gap-2 rounded-2xl bg-violet-600 px-5 text-[14px] font-semibold text-white shadow-accent transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? <Spinner size={16} /> : <Icon name="send" size={16} />}
            Send
          </button>
        </div>
        {speech.error && (
          <p className="text-[12px] font-semibold text-red-600">{speech.error}</p>
        )}
      </div>
    </div>
  );
}
