import { useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/Icon';
import { useLanguage } from '../../../i18n/LanguageProvider';
import type { HskLevelData, VocabEntry } from '../types';

type Mode = 'flashcards' | 'quiz';

function shuffle<T>(items: T[]): T[] {
  return items
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

export default function VocabPanel({ level }: { level: HskLevelData }) {
  const { text } = useLanguage();
  const [mode, setMode] = useState<Mode>('flashcards');
  const [lessonFilter, setLessonFilter] = useState<number | 'all'>('all');

  const lessonNumbers = useMemo(
    () => Array.from(new Set(level.vocab.map((v) => v.lesson))).sort((a, b) => a - b),
    [level],
  );

  const pool = useMemo(
    () => (lessonFilter === 'all' ? level.vocab : level.vocab.filter((v) => v.lesson === lessonFilter)),
    [level, lessonFilter],
  );

  if (level.vocab.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-6 text-[14px] text-amber-800">
        <p className="font-semibold">{text('Từ vựng đang được số hóa', 'Vocabulary is being digitised')}</p>
        <p className="mt-1 text-amber-700">
          {text(
            `Lộ trình ${level.lessons.length} bài và toàn bộ sách của HSK ${level.level} đã sẵn sàng ở tab Lộ trình và Tài liệu. Phần thẻ từ & trắc nghiệm cho cấp độ này sẽ được bổ sung từ chính 词语总表 (bảng từ vựng) trong sách — không tự bịa.`,
            `The ${level.lessons.length}-lesson roadmap and the full HSK ${level.level} books are ready in the Roadmap and Materials tabs. Flashcards & quizzes for this level will be added from the book's own 词语总表 (vocabulary master list) — nothing invented.`,
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
          {(['flashcards', 'quiz'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={
                'inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[13.5px] font-semibold transition-colors ' +
                (mode === m ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-900')
              }
            >
              <Icon name={m === 'flashcards' ? 'cards' : 'spark'} size={15} />
              {m === 'flashcards' ? text('Thẻ từ', 'Flashcards') : text('Trắc nghiệm', 'Quiz')}
            </button>
          ))}
        </div>

        <select
          value={lessonFilter}
          onChange={(e) => setLessonFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13.5px] font-medium text-slate-700"
        >
          <option value="all">{text('Tất cả bài', 'All lessons')}</option>
          {lessonNumbers.map((no) => (
            <option key={no} value={no}>
              {text(`Bài ${no}`, `Lesson ${no}`)}
            </option>
          ))}
        </select>
      </div>

      {mode === 'flashcards' ? <Flashcards pool={pool} /> : <Quiz pool={pool} all={level.vocab} />}
    </div>
  );
}

function Flashcards({ pool }: { pool: VocabEntry[] }) {
  const { text } = useLanguage();
  const [order, setOrder] = useState<VocabEntry[]>(pool);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setOrder(pool);
    setIndex(0);
    setRevealed(false);
  }, [pool]);

  const card = order[index];
  if (!card) return null;

  function go(delta: number) {
    setRevealed(false);
    setIndex((i) => (i + delta + order.length) % order.length);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="flex min-h-[240px] w-full max-w-xl flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm transition-shadow hover:shadow-md"
      >
        <span className="text-6xl font-semibold text-slate-800 sm:text-7xl" lang="zh">
          {card.hanzi}
        </span>
        {revealed ? (
          <div className="flex flex-col items-center gap-1">
            <span className="text-xl font-medium text-violet-600">{card.pinyin}</span>
            <span className="text-[15px] text-slate-700">
              {card.pos && <em className="not-italic text-slate-400">{card.pos} </em>}
              {card.meaningVi}
            </span>
          </div>
        ) : (
          <span className="text-[13px] font-medium text-slate-400">{text('Nhấn để xem nghĩa', 'Tap to reveal')}</span>
        )}
      </button>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => go(-1)}
          className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          aria-label={text('Trước', 'Previous')}
        >
          <Icon name="chevR" size={18} className="rotate-180" />
        </button>
        <span className="min-w-[72px] text-center text-[13.5px] font-semibold text-slate-500">
          {index + 1} / {order.length}
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          aria-label={text('Sau', 'Next')}
        >
          <Icon name="chevR" size={18} />
        </button>
        <button
          type="button"
          onClick={() => {
            setOrder((o) => shuffle(o));
            setIndex(0);
            setRevealed(false);
          }}
          className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-600 hover:border-slate-300"
        >
          <Icon name="refresh" size={15} /> {text('Xáo trộn', 'Shuffle')}
        </button>
      </div>
    </div>
  );
}

interface Question {
  word: VocabEntry;
  options: string[];
}

function buildQuestion(pool: VocabEntry[], all: VocabEntry[]): Question | null {
  const word = pool[Math.floor(Math.random() * pool.length)];
  if (!word) return null;
  const distractors = shuffle(all.filter((v) => v.meaningVi !== word.meaningVi))
    .slice(0, 3)
    .map((v) => v.meaningVi);
  return { word, options: shuffle([word.meaningVi, ...distractors]) };
}

function Quiz({ pool, all }: { pool: VocabEntry[]; all: VocabEntry[] }) {
  const { text } = useLanguage();
  const [question, setQuestion] = useState<Question | null>(() => buildQuestion(pool, all));
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    setQuestion(buildQuestion(pool, all));
    setPicked(null);
    setScore({ correct: 0, total: 0 });
  }, [pool, all]);

  function pick(option: string) {
    if (picked || !question) return;
    setPicked(option);
    setScore((s) => ({
      correct: s.correct + (option === question.word.meaningVi ? 1 : 0),
      total: s.total + 1,
    }));
  }

  function next() {
    setQuestion(buildQuestion(pool, all));
    setPicked(null);
  }

  if (!question) return null;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="text-[13px] font-semibold text-slate-500">
        {text('Điểm', 'Score')}: {score.correct}/{score.total}
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-5xl font-semibold text-slate-800 sm:text-6xl" lang="zh">
          {question.word.hanzi}
        </span>
        <span className="text-lg font-medium text-violet-600">{question.word.pinyin}</span>
      </div>

      <div className="grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-2">
        {question.options.map((option) => {
          const isCorrect = option === question.word.meaningVi;
          const state = !picked
            ? 'idle'
            : isCorrect
              ? 'correct'
              : option === picked
                ? 'wrong'
                : 'dim';
          return (
            <button
              key={option}
              type="button"
              onClick={() => pick(option)}
              disabled={!!picked}
              className={
                'rounded-xl border px-4 py-3 text-left text-[14.5px] font-medium transition-colors ' +
                {
                  idle: 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50/40',
                  correct: 'border-emerald-400 bg-emerald-50 text-emerald-700',
                  wrong: 'border-rose-400 bg-rose-50 text-rose-700',
                  dim: 'border-slate-200 bg-white text-slate-400',
                }[state]
              }
            >
              {option}
            </button>
          );
        })}
      </div>

      {picked && (
        <button
          type="button"
          onClick={next}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-violet-700"
        >
          {text('Câu tiếp theo', 'Next question')} <Icon name="chevR" size={16} />
        </button>
      )}
    </div>
  );
}
