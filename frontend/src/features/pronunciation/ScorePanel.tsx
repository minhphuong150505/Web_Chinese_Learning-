import { useLanguage } from '../../i18n/LanguageProvider';
import { MANDARIN_TONE_EN, MANDARIN_TONE_VI } from '../../lib/zh';
import type { PronunciationResponse, WordScore } from '../../types/pronunciation';
import SyllableBreakdown, { toneTips } from './SyllableBreakdown';

interface ScorePanelProps {
  result: PronunciationResponse;
}

function band(score: number): 'good' | 'mid' | 'bad' {
  if (score >= 85) return 'good';
  if (score >= 60) return 'mid';
  return 'bad';
}

const BAND_TEXT: Record<string, string> = {
  good: 'text-score-good',
  mid: 'text-score-mid',
  bad: 'text-score-bad',
};

const BAND_BAR: Record<string, string> = {
  good: 'bg-score-good',
  mid: 'bg-score-mid',
  bad: 'bg-score-bad',
};

function BigMetric({ label, value, hint }: { label: string; value: number; hint: string }) {
  const b = band(value);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-semibold text-slate-400">{label}</span>
        <span className={'h-2 w-2 rounded-full ' + BAND_BAR[b]} />
      </div>
      <div className={'mt-1 text-[28px] font-extrabold ' + BAND_TEXT[b]}>{Math.round(value)}</div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <span className={'block h-full rounded-full ' + BAND_BAR[b]} style={{ width: `${value}%` }} />
      </div>
      <div className="mt-1.5 text-xs text-slate-400">{hint}</div>
    </div>
  );
}

const BAND_WORD_BG: Record<string, string> = {
  good: '',
  mid: 'bg-amber-50',
  bad: 'bg-red-50',
};

/** Replays the sentence with each word tinted by its accuracy so the learner can
 * see at a glance where they went wrong: red = many errors, amber = minor, green = correct. */
function SentenceHighlight({ words, isZh }: { words: WordScore[]; isZh: boolean }) {
  const { text } = useLanguage();
  const spoken = words.filter((w) => w.word.trim());
  if (spoken.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {text('Chỗ đọc sai', 'Where you went wrong')}
        </span>
        <span className="text-[11px] text-slate-400">
          {text('Màu = độ chính xác của từ', 'Color = per-word accuracy')}
        </span>
      </div>
      <div className={(isZh ? 'font-zh ' : '') + 'text-[26px] leading-[1.7]'}>
        {spoken.map((w, i) => {
          const b = band(w.accuracyScore);
          return (
            <span
              key={i}
              title={`${Math.round(w.accuracyScore)}/100`}
              className={'rounded px-0.5 font-semibold ' + BAND_TEXT[b] + ' ' + BAND_WORD_BG[b]}
            >
              {i > 0 && !isZh ? ' ' : ''}
              {w.word}
            </span>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2 w-2 rounded-full bg-score-bad" /> {text('Sai nhiều', 'Many errors')} &lt; 60
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2 w-2 rounded-full bg-score-mid" /> {text('Sai ít', 'Minor')} 60-84
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2 w-2 rounded-full bg-score-good" /> {text('Đúng', 'Correct')} ≥ 85
        </span>
      </div>
    </div>
  );
}

const TONE_LEGEND = [1, 2, 3, 4, 0] as const;
const TONE_LEGEND_TEXT: Record<number, string> = {
  0: 'text-tone-0',
  1: 'text-tone-1',
  2: 'text-tone-2',
  3: 'text-tone-3',
  4: 'text-tone-4',
};

export default function ScorePanel({ result }: ScorePanelProps) {
  const { language, text } = useLanguage();
  const metrics: Array<{ label: string; value: number; hint: string }> = [
    {
      label: text('Chính xác', 'Accuracy'),
      value: result.accuracy,
      hint: text('Đúng trên cả câu', 'Whole-sentence accuracy'),
    },
    {
      label: text('Trôi chảy', 'Fluency'),
      value: result.fluency,
      hint: text('Độ mượt', 'Speech flow'),
    },
  ];
  if (result.completeness !== null) {
    metrics.push({
      label: text('Đầy đủ', 'Completeness'),
      value: result.completeness,
      hint: text('Đọc đủ chữ', 'All words spoken'),
    });
  }
  if (result.prosody !== null) {
    metrics.push({
      label: text('Ngữ điệu', 'Prosody'),
      value: result.prosody,
      hint: text('Thanh điệu và nhịp', 'Tones and rhythm'),
    });
  }

  // Pinyin/tone breakdown only applies to Mandarin; non-tonal languages (English)
  // show just the Azure metrics and the per-word accuracy highlight.
  const isZh = result.lang === 'zh';
  const tips = isZh ? toneTips(result.words, language) : [];
  const toneNames = language === 'vi' ? MANDARIN_TONE_VI : MANDARIN_TONE_EN;

  const overallBand = band(result.pronScore);

  return (
    <div className="animate-rise space-y-5">
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col">
          <span className="text-[12.5px] font-semibold uppercase tracking-wide text-slate-400">
            {text('Điểm tổng', 'Overall score')}
          </span>
          <span className={'text-[44px] font-extrabold leading-none ' + BAND_TEXT[overallBand]}>
            {Math.round(result.pronScore)}
          </span>
        </div>
        <p className="flex-1 text-[12.5px] leading-5 text-slate-500">
          {text(
            'Tính theo công thức chính thức của Azure: điểm yếu nhất trong các tiêu chí bên dưới được tính trọng số cao nhất, nên một tiêu chí kém sẽ kéo điểm tổng xuống.',
            'Uses Azure’s official formula: your weakest criterion below is weighted the most, so one weak area pulls the overall down.',
          )}
        </p>
      </div>

      {result.scripted && <SentenceHighlight words={result.words} isZh={isZh} />}

      <div
        className={
          'grid grid-cols-2 gap-3 ' + (metrics.length >= 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3')
        }
      >
        {metrics.map((m) => (
          <BigMetric key={m.label} label={m.label} value={m.value} hint={m.hint} />
        ))}
      </div>

      {isZh && (
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {text('Chi tiết từng âm tiết', 'Syllable details')}
            </span>
            <span className="text-[11px] text-slate-400">
              {text('Màu = thanh điệu cần đọc', 'Color = target tone')}
            </span>
          </div>
          <SyllableBreakdown words={result.words} />
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            {TONE_LEGEND.map((t) => (
              <span key={t} className="flex items-center gap-1">
                <i className={'font-bold ' + TONE_LEGEND_TEXT[t]}>●</i>
                {toneNames[t]}
              </span>
            ))}
          </div>
        </div>
      )}

      {tips.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-amber-600">
            {text('Âm tiết cần luyện thêm', 'Syllables to practice')}
          </div>
          <ul className="mt-2 space-y-1.5 text-[13.5px] font-medium leading-6 text-amber-900">
            {tips.map((tip, i) => (
              <li key={i}>• {tip}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2 w-2 rounded-full bg-score-good" /> ≥ 85{' '}
          {text('tốt', 'good')}
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2 w-2 rounded-full bg-score-mid" /> 60-84{' '}
          {text('khá', 'fair')}
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2 w-2 rounded-full bg-score-bad" /> &lt; 60{' '}
          {text('cần luyện', 'needs practice')}
        </span>
      </div>
    </div>
  );
}
