import { useEffect, useState } from 'react';
import Hanzi from '../../components/Hanzi';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import HskBadge from '../../components/HskBadge';
import { toZhTokens } from '../../lib/zh';
import { useWritingFeedback, useWritingPrompt } from '../../hooks/useWritingFeedback';
import { useLanguage, type Language } from '../../i18n/LanguageProvider';
import { useTargetLanguage } from '../../i18n/TargetLanguageProvider';
import {
  WRITING_MOCK_TESTS,
  WRITING_PROMPT_TEXT,
  WRITING_PROMPT_TOPIC,
  WRITING_PROMPT_TOPIC_VI,
  WRITING_TOPICS,
  type WritingPracticeTopic,
} from '../../lib/content';
import HskLessonPicker from '../hsk/components/HskLessonPicker';
import { lessonWritingRequest, type HskPracticeLesson } from '../hsk/lib/practiceTree';
import type { CreateWritingPromptRequest, WritingPromptResponse } from '../../types/writing';
import WritingFeedbackPanel from './WritingFeedbackPanel';

function writingTopicTitle(topic: WritingPracticeTopic, language: Language) {
  return language === 'vi' ? topic.titleVi : topic.title;
}

function savedWritingTitle(title: string, language: Language) {
  if (title === WRITING_PROMPT_TOPIC || title === WRITING_PROMPT_TOPIC_VI) {
    return language === 'vi' ? WRITING_PROMPT_TOPIC_VI : WRITING_PROMPT_TOPIC;
  }
  const topic = WRITING_TOPICS.find((item) => [item.title, item.titleVi].includes(title));
  return topic ? writingTopicTitle(topic, language) : title;
}

const EN_DEFAULT_PROMPT: WritingPromptResponse = {
  title: 'A short workplace email',
  promptText:
    'Write a short email (3-5 sentences) to a coworker to reschedule a meeting. Explain why, and suggest a new time.',
  level: 'TOEIC',
};

/** The starting prompt shown before the learner generates their own task. */
function defaultWritingPrompt(target: string): WritingPromptResponse {
  return target === 'en'
    ? EN_DEFAULT_PROMPT
    : { title: WRITING_PROMPT_TOPIC, promptText: WRITING_PROMPT_TEXT, level: 'HSK 2' };
}

/** Either generate a prompt via the LLM (HSK lessons + custom), or use a fixed
 * exam prompt directly (mock tests, which must keep their exact exam format). */
type WritingCreate =
  | { kind: 'api'; title: string; request: CreateWritingPromptRequest }
  | { kind: 'static'; title: string; prompt: WritingPromptResponse };

interface WritingSetupProps {
  pending: boolean;
  error?: string;
  onCreate: (payload: WritingCreate) => void;
  onCancel?: () => void;
}

type WritingSetupMode = 'hsk' | 'custom' | 'mock';

function WritingSetup({ pending, error, onCreate, onCancel }: WritingSetupProps) {
  const { language, text } = useLanguage();
  const { target } = useTargetLanguage();
  // English writing has no HSK lessons or HSK mock tests — only free tasks.
  const isZh = target === 'zh';
  const [mode, setMode] = useState<WritingSetupMode>(isZh ? 'hsk' : 'custom');
  const [lesson, setLesson] = useState<HskPracticeLesson | null>(null);
  const [mockId, setMockId] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customContext, setCustomContext] = useState('');

  function submit() {
    if (mode === 'hsk') {
      if (lesson) {
        const request = lessonWritingRequest(lesson);
        onCreate({ kind: 'api', title: request.topicTitle, request });
      }
      return;
    }
    if (mode === 'mock') {
      const test = WRITING_MOCK_TESTS.find((item) => item.id === mockId);
      if (test) {
        const title = language === 'vi' ? test.titleVi : test.title;
        onCreate({
          kind: 'static',
          title,
          prompt: { title, promptText: test.promptText, level: test.level },
        });
      }
      return;
    }
    const title = customTitle.trim();
    const context = customContext.trim();
    if (title && context) {
      onCreate({ kind: 'api', title, request: { topicTitle: title, context, lang: target } });
    }
  }

  const ready =
    mode === 'hsk'
      ? !!lesson
      : mode === 'mock'
        ? !!mockId
        : customTitle.trim().length > 0 && customContext.trim().length > 0;

  const footerNote =
    mode === 'hsk'
      ? text('Đề viết bám sát bài học HSK', 'Writing task tied to an HSK lesson')
      : mode === 'mock'
        ? text('Thi thử viết theo định dạng HSK', 'HSK-format writing mock test')
        : text('Đề viết theo ngữ cảnh riêng', 'Writing task from your own context');

  const TAB: Array<{ id: WritingSetupMode; labelVi: string; labelEn: string; icon: 'book' | 'spark' | 'cards' }> = [
    { id: 'hsk', labelVi: 'Theo bài HSK', labelEn: 'HSK lessons', icon: 'book' },
    { id: 'custom', labelVi: 'Tự tạo', labelEn: 'Custom', icon: 'spark' },
    { id: 'mock', labelVi: 'Đề thi thử', labelEn: 'Mock test', icon: 'cards' },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-violet-500">
            {text('Đề viết mới', 'New writing task')}
          </div>
          <h3 className="mt-1 text-[20px] font-extrabold text-slate-900">
            {text('Chọn cách luyện viết', 'Choose how to practice writing')}
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

      {isZh && (
        <div className="mt-4 grid grid-cols-3 rounded-xl bg-slate-100 p-1">
          {TAB.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              aria-pressed={mode === item.id}
              className={
                'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg text-[13px] font-bold transition ' +
                (mode === item.id ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')
              }
            >
              <Icon name={item.icon} size={14} />
              {language === 'vi' ? item.labelVi : item.labelEn}
            </button>
          ))}
        </div>
      )}

      {mode === 'hsk' && (
        <div className="mt-4">
          <p className="mb-2 text-[12.5px] text-slate-500">
            {text(
              'Chọn một bài HSK. Đề viết sẽ bám đúng chủ đề và trình độ từ vựng của bài.',
              'Pick an HSK lesson. The task stays on that lesson’s topic and vocabulary level.',
            )}
          </p>
          <HskLessonPicker selectedLessonId={lesson?.id ?? null} onSelectLesson={setLesson} />
          {lesson && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2.5">
              <HskBadge level={lesson.level} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-700">
                {text('Bài', 'Lesson')} {lesson.no} · <span className="font-zh">{lesson.zh}</span> · {lesson.titleVi}
              </span>
            </div>
          )}
        </div>
      )}

      {mode === 'mock' && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {WRITING_MOCK_TESTS.map((test) => {
            const active = test.id === mockId;
            return (
              <button
                key={test.id}
                type="button"
                onClick={() => setMockId(test.id)}
                className={
                  'rounded-xl border px-3.5 py-3 text-left transition ' +
                  (active
                    ? 'border-violet-400 bg-violet-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/50')
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13.5px] font-extrabold text-slate-900">
                    {language === 'vi' ? test.titleVi : test.title}
                  </span>
                  <HskBadge level={test.hskLevel} label={test.level} />
                </div>
                <div className="mt-1 text-[12px] text-slate-500">
                  <span className="font-zh font-semibold text-slate-600">{test.part}</span> ·{' '}
                  {language === 'vi' ? test.partVi : test.part}
                </div>
                <div className="mt-1 text-[11.5px] leading-4 text-slate-400">{test.descriptionVi}</div>
              </button>
            );
          })}
        </div>
      )}

      {mode === 'custom' && (
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
              placeholder={text('Ví dụ: Email xin nghỉ học', 'Example: Asking for a school absence')}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
            <div className="mt-1 text-right text-[11px] font-semibold text-slate-400">{customTitle.length}/80</div>
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
                {isZh
                  ? text(
                      'LLM sẽ tạo đề viết tiếng Trung từ mô tả này.',
                      'The LLM will create a Chinese writing prompt from this context.',
                    )
                  : text(
                      'LLM sẽ tạo đề viết tiếng Anh (TOEIC) từ mô tả này.',
                      'The LLM will create an English (TOEIC) writing prompt from this context.',
                    )}
              </span>
              <span className="flex-none">{customContext.length}/1200</span>
            </div>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-[12px] font-semibold text-red-600">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[12px] font-semibold text-slate-400">{footerNote}</div>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !ready}
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
  const { target } = useTargetLanguage();
  const isZh = target === 'zh';
  const [activePrompt, setActivePrompt] = useState<WritingPromptResponse>(() => defaultWritingPrompt(target));
  const [topic, setTopic] = useState(() => savedWritingTitle(activePrompt.title, language));
  const [text, setText] = useState('');
  const [setupOpen, setSetupOpen] = useState(false);
  const feedback = useWritingFeedback();
  const prompt = useWritingPrompt();

  // Switching practice language swaps to that language's starter prompt and clears the draft.
  useEffect(() => {
    const next = defaultWritingPrompt(target);
    setActivePrompt(next);
    setTopic(savedWritingTitle(next.title, language));
    setText('');
    feedback.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  function submit() {
    if (!text.trim() || feedback.isPending) return;
    feedback.mutate({ text: text.trim(), topic: topic.trim() || null, lang: target });
  }

  function applyPrompt(data: WritingPromptResponse, title: string) {
    setActivePrompt(data);
    setTopic(savedWritingTitle(title, language));
    setText('');
    feedback.reset();
    setSetupOpen(false);
  }

  function createWritingTask(payload: WritingCreate) {
    if (payload.kind === 'static') {
      applyPrompt(payload.prompt, payload.title);
      return;
    }
    prompt.mutate(
      { ...payload.request, lang: payload.request.lang ?? target },
      { onSuccess: (data) => applyPrompt(data, payload.title) },
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
            <h2 className="mt-1 flex items-center gap-2 text-[26px] font-extrabold tracking-tight text-slate-900">
              {savedWritingTitle(activePrompt.title, language)}
              <HskBadge label={activePrompt.level} />
              {isZh && <span className="font-zh text-[22px] font-semibold text-slate-400">写作</span>}
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
            <HskBadge label={activePrompt.level} />
          </div>
          <div className="mt-1.5 space-y-1 text-[16px]">
            {activePrompt.promptText.split('\n').map((line, index) =>
              isZh ? (
                <Hanzi key={index} tokens={toZhTokens(line)} pinyin={false} className="block" />
              ) : (
                <p key={index} className="block">
                  {line}
                </p>
              ),
            )}
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
                {isZh
                  ? uiText('Bài viết của bạn (tiếng Trung)', 'Your writing (Chinese)')
                  : uiText('Bài viết của bạn (tiếng Anh)', 'Your writing (English)')}
              </span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={9}
                placeholder={isZh ? '写下你的句子……' : uiText('Viết bài của bạn ở đây…', 'Write your text here…')}
                className={
                  (isZh ? 'font-zh ' : '') +
                  'scroll min-h-[200px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[16px] text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100'
                }
              />
            </label>
            <button
              type="button"
              onClick={submit}
              disabled={feedback.isPending || !text.trim()}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-violet-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-accent transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {feedback.isPending && <Spinner size={16} />}
              {feedback.isPending ? uiText('Đang nhận xét...', 'Reviewing...') : uiText('Gửi bài', 'Submit')}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            {feedback.isPending && (
              <p className="text-sm text-slate-400">{uiText('Đang nhận xét bài viết...', 'Reviewing your writing...')}</p>
            )}
            {feedback.isError && <p className="text-sm text-red-600">{(feedback.error as Error).message}</p>}
            {feedback.data && <WritingFeedbackPanel result={feedback.data} />}
            {!feedback.isPending && !feedback.data && !feedback.isError && (
              <p className="text-sm text-slate-400">
                {uiText('Bản sửa và nhận xét sẽ xuất hiện tại đây.', 'Your corrected text and feedback will appear here.')}
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
