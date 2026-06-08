import { useState } from 'react';
import Hanzi from '../../components/Hanzi';
import Spinner from '../../components/Spinner';
import { toZhTokens } from '../../lib/zh';
import { useWritingFeedback } from '../../hooks/useWritingFeedback';
import { WRITING_PROMPT_TEXT, WRITING_PROMPT_TOPIC } from '../../lib/content';
import WritingFeedbackPanel from './WritingFeedbackPanel';

export default function WritingTab() {
  const [topic, setTopic] = useState(WRITING_PROMPT_TOPIC);
  const [text, setText] = useState('');
  const feedback = useWritingFeedback();

  function submit() {
    if (!text.trim() || feedback.isPending) return;
    feedback.mutate({ text: text.trim(), topic: topic.trim() || null });
  }

  return (
    <div className="scroll min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[880px] px-7 pb-20 pt-[30px]">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-violet-500">Writing feedback</div>
          <h2 className="mt-1 text-[26px] font-extrabold tracking-tight text-slate-900">
            Write <span className="font-zh text-[22px] font-semibold text-slate-400">写作</span>
          </h2>
        </div>

        <div className="mb-6 rounded-2xl border border-violet-100 bg-violet-50 px-5 py-4 text-violet-700">
          <span className="text-xs font-semibold uppercase tracking-wide text-violet-500">Prompt</span>
          <div className="mt-1.5 text-[16px]">
            <Hanzi tokens={toZhTokens(WRITING_PROMPT_TEXT)} pinyin={false} />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Topic (optional)</span>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[14px] text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your writing (Chinese)</span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={9}
                placeholder="写下你的句子……"
                className="font-zh scroll min-h-[200px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[16px] text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
              />
            </label>
            <button
              type="button"
              onClick={submit}
              disabled={feedback.isPending || !text.trim()}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-violet-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-accent transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {feedback.isPending && <Spinner size={16} />}
              {feedback.isPending ? 'Reviewing…' : 'Submit'}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            {feedback.isPending && <p className="text-sm text-slate-400">Reviewing your writing…</p>}
            {feedback.isError && <p className="text-sm text-red-600">{(feedback.error as Error).message}</p>}
            {feedback.data && <WritingFeedbackPanel result={feedback.data} />}
            {!feedback.isPending && !feedback.data && !feedback.isError && (
              <p className="text-sm text-slate-400">Your corrected text and feedback will appear here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
