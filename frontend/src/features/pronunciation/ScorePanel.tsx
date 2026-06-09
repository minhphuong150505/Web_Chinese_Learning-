import { useLanguage } from '../../i18n/LanguageProvider';
import { MANDARIN_TONE_EN, MANDARIN_TONE_VI } from '../../lib/zh';
import type { PronunciationResponse } from '../../types/pronunciation';
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

  const tips = toneTips(result.words, language);
  const toneNames = language === 'vi' ? MANDARIN_TONE_VI : MANDARIN_TONE_EN;

  return (
    <div className="animate-rise space-y-5">
      <div
        className={
          'grid grid-cols-2 gap-3 ' + (metrics.length >= 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3')
        }
      >
        {metrics.map((m) => (
          <BigMetric key={m.label} label={m.label} value={m.value} hint={m.hint} />
        ))}
      </div>

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
