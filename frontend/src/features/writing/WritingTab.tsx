import { useState } from 'react';
import Hanzi from '../../components/Hanzi';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import { toZhTokens } from '../../lib/zh';
import { useWritingFeedback, useWritingPrompt } from '../../hooks/useWritingFeedback';
import { useLanguage, type Language } from '../../i18n/LanguageProvider';
import {
  WRITING_PROMPT_TEXT,
  WRITING_PROMPT_TOPIC,
  WRITING_PROMPT_TOPIC_VI,
  WRITING_TOPICS,
  type WritingPracticeTopic,
} from '../../lib/content';
import type { WritingPromptResponse } from '../../types/writing';
import WritingFeedbackPanel from './WritingFeedbackPanel';

const DEFAULT_WRITING_TOPIC = WRITING_TOPICS[0] as WritingPracticeTopic;

function writingTopicTitle(topic: WritingPracticeTopic, language: Language) {
  return language === 'vi' ? topic.titleVi : topic.title;
}

function writingContext(topic: WritingPracticeTopic, language: Language) {
  return language === 'vi' ? topic.contextVi : topic.context;
}

function savedWritingTitle(title: string, language: Language) {
  if (title === WRITING_PROMPT_TOPIC || title === WRITING_PROMPT_TOPIC_VI) {
    return language === 'vi' ? WRITING_PROMPT_TOPIC_VI : WRITING_PROMPT_TOPIC;
  }
  const topic = WRITING_TOPICS.find((item) => [item.title, item.titleVi].includes(title));
  return topic ? writingTopicTitle(topic, language) : title;
}

interface WritingSetupProps {
  pending: boolean;
  error?: string;
  onCreate: (topicTitle: string, context: string) => void;
  onCancel?: () => void;
}

type WritingSetupMode = 'preset' | 'custom';

function WritingSetup({ pending, error, onCreate, onCancel }: WritingSetupProps) {
  const { language, text } = useLanguage();
  const [mode, setMode] = useState<WritingSetupMode>('preset');
  const [topicId, setTopicId] = useState(DEFAULT_WRITING_TOPIC.id);
  const selectedTopic = WRITING_TOPICS.find((topic) => topic.id === topicId) ?? DEFAULT_WRITING_TOPIC;
  const [presetContext, setPresetContext] = useState(() => writingContext(selectedTopic, language));
  const [customTitle, setCustomTitle] = useState('');
  const [customContext, setCustomContext] = useState('');

  function selectTopic(topic: WritingPracticeTopic) {
    setTopicId(topic.id);
    setPresetContext(writingContext(topic, language));
  }

  function submit() {
    if (mode === 'custom') {
      const title = customTitle.trim();
      const context = customContext.trim();
      if (title && context) {
        onCreate(title, context);
      }
      return;
    }

    onCreate(selectedTopic.title, presetContext.trim() || writingContext(selectedTopic, language));
  }

  const customReady = customTitle.trim().length > 0 && customContext.trim().length > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-violet-500">
            {text('Đề viết mới', 'New writing task')}
          </div>
          <h3 className="mt-1 text-[20px] font-extrabold text-slate-900">
            {text('Chọn chủ đề và nhập bối cảnh', 'Choose a topic and enter a scenario')}
          </h3>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            aria-label={text('Đóng', 'Close')}
          >
            <Icon name="x" size={16} />
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setMode('preset')}
          aria-pressed={mode === 'preset'}
          className={
            'h-10 rounded-lg text-[13px] font-bold transition ' +
            (mode === 'preset'
              ? 'bg-white text-violet-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700')
          }
        >
          {text('Chủ đề gợi ý', 'Suggested topics')}
        </button>
        <button
          type="button"
          onClick={() => setMode('custom')}
          aria-pressed={mode === 'custom'}
          className={
            'inline-flex h-10 items-center justify-center gap-2 rounded-lg text-[13px] font-bold transition ' +
            (mode === 'custom'
              ? 'bg-white text-violet-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700')
          }
        >
          <Icon name="spark" size={14} />
          {text('Tùy chỉnh', 'Custom')}
        </button>
      </div>

      {mode === 'preset' ? (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {WRITING_TOPICS.map((topic) => {
              const active = topic.id === topicId;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => selectTopic(topic)}
                  className={
                    'min-h-[78px] rounded-xl border px-3.5 py-3 text-left transition ' +
                    (active
                      ? 'border-violet-400 bg-violet-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/50')
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13.5px] font-extrabold text-slate-900">
                      {writingTopicTitle(topic, language)}
                    </span>
                    <span className="flex-none rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      {topic.level}
                    </span>
                  </div>
                  <div className="mt-1 font-zh text-[18px] font-semibold text-slate-500">
                    {topic.zh}
                  </div>
                </button>
              );
            })}
          </div>

          <label className="mt-4 block">
            <span className="text-[12px] font-bold uppercase tracking-wide text-slate-400">
              {text('Nội dung đề viết', 'Writing prompt context')}
            </span>
            <textarea
              value={presetContext}
              onChange={(e) => setPresetContext(e.target.value)}
              maxLength={1200}
              rows={4}
              className="scroll mt-2 min-h-[116px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] leading-6 text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
            />
          </label>
        </>
      ) : (
        <div className="mt-4 space-y-4 rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
          <div>
            <label
              htmlFor="custom-writing-title"
              className="text-[12px] font-bold uppercase tracking-wide text-slate-500"
            >
              {text('Tên đề viết', 'Writing task name')}
            </label>
            <input
              id="custom-writing-title"
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              maxLength={80}
              autoFocus
              placeholder={text(
                'Ví dụ: Email xin nghỉ học',
                'Example: Asking for a school absence',
              )}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
            <div className="mt-1 text-right text-[11px] font-semibold text-slate-400">
              {customTitle.length}/80
            </div>
          </div>

          <div>
            <label
              htmlFor="custom-writing-context"
              className="text-[12px] font-bold uppercase tracking-wide text-slate-500"
            >
              {text('Mô tả chi tiết', 'Detailed description')}
            </label>
            <textarea
              id="custom-writing-context"
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              maxLength={1200}
              rows={6}
              placeholder={text(
                'Mô tả loại bài viết, người nhận/ngữ cảnh, mục tiêu luyện tập, độ khó, từ vựng hoặc cấu trúc muốn dùng...',
                'Describe the writing type, audience/context, practice goal, difficulty, useful vocabulary, or grammar patterns...',
              )}
              className="scroll mt-2 min-h-[148px] w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
            <div className="mt-1 flex items-center justify-between gap-3 text-[11px] font-semibold text-slate-400">
              <span>
                {text(
                  'LLM sẽ tạo đề viết tiếng Trung từ mô tả này.',
                  'The LLM will create a Chinese writing prompt from this context.',
                )}
              </span>
              <span className="flex-none">{customContext.length}/1200</span>
            </div>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-[12px] font-semibold text-red-600">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[12px] font-semibold text-slate-400">
          {mode === 'custom'
            ? text('Đề viết theo ngữ cảnh riêng', 'Writing task from your own context')
            : `HSK 2-3 · ${text('Đề luyện viết', 'Writing prompt')}`}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={pending || (mode === 'custom' && !customReady)}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-violet-600 px-4 text-[13px] font-bold text-white shadow-accent transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? <Spinner size={15} /> : <Icon name="spark" size={15} />}
          {text('Tạo đề viết', 'Create writing task')}
        </button>
      </div>
    </div>
  );
}

export default function WritingTab() {
  const { language, text: uiText } = useLanguage();
  const [activePrompt, setActivePrompt] = useState<WritingPromptResponse>({
    title: WRITING_PROMPT_TOPIC,
    promptText: WRITING_PROMPT_TEXT,
    level: 'HSK 2',
  });
  const [topic, setTopic] = useState(() => savedWritingTitle(activePrompt.title, language));
  const [text, setText] = useState('');
  const [setupOpen, setSetupOpen] = useState(false);
  const feedback = useWritingFeedback();
  const prompt = useWritingPrompt();

  function submit() {
    if (!text.trim() || feedback.isPending) return;
    feedback.mutate({ text: text.trim(), topic: topic.trim() || null });
  }

  function createWritingTask(topicTitle: string, context: string) {
    prompt.mutate(
      { topicTitle, context },
      {
        onSuccess: (data) => {
          setActivePrompt(data);
          setTopic(savedWritingTitle(topicTitle, language));
          setText('');
          feedback.reset();
          setSetupOpen(false);
        },
      },
    );
  }

  return (
    <div className="scroll min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[880px] px-7 pb-20 pt-[30px]">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-violet-500">
              {uiText('Nhận xét bài viết', 'Writing feedback')}
            </div>
            <h2 className="mt-1 text-[26px] font-extrabold tracking-tight text-slate-900">
              {savedWritingTitle(activePrompt.title, language)}{' '}
              <span className="font-zh text-[22px] font-semibold text-slate-400">写作</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              prompt.reset();
              setSetupOpen(true);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-violet-200 bg-white px-4 text-[13px] font-bold text-violet-700 transition hover:bg-violet-50"
          >
            <Icon name="spark" size={16} />
            {uiText('Đề mới', 'New task')}
          </button>
        </div>

        <div className="mb-6 rounded-2xl border border-violet-100 bg-violet-50 px-5 py-4 text-violet-700">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-violet-500">
              {uiText('Đề bài', 'Prompt')}
            </span>
            <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-violet-500">
              {activePrompt.level}
            </span>
          </div>
          <div className="mt-1.5 text-[16px]">
            <Hanzi tokens={toZhTokens(activePrompt.promptText)} pinyin={false} />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {uiText('Chủ đề (không bắt buộc)', 'Topic (optional)')}
              </span>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[14px] text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {uiText('Bài viết của bạn (tiếng Trung)', 'Your writing (Chinese)')}
              </span>
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
              {feedback.isPending
                ? uiText('Đang nhận xét...', 'Reviewing...')
                : uiText('Gửi bài', 'Submit')}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            {feedback.isPending && (
              <p className="text-sm text-slate-400">
                {uiText('Đang nhận xét bài viết...', 'Reviewing your writing...')}
              </p>
            )}
            {feedback.isError && <p className="text-sm text-red-600">{(feedback.error as Error).message}</p>}
            {feedback.data && <WritingFeedbackPanel result={feedback.data} />}
            {!feedback.isPending && !feedback.data && !feedback.isError && (
              <p className="text-sm text-slate-400">
                {uiText(
                  'Bản sửa và nhận xét sẽ xuất hiện tại đây.',
                  'Your corrected text and feedback will appear here.',
                )}
              </p>
            )}
          </div>
        </div>
      </div>
      {setupOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/35 px-4 py-6">
          <div className="scroll max-h-full w-full max-w-[860px] overflow-y-auto">
            <WritingSetup
              pending={prompt.isPending}
              error={prompt.isError ? prompt.error.message : undefined}
              onCreate={createWritingTask}
              onCancel={() => {
                prompt.reset();
                setSetupOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
