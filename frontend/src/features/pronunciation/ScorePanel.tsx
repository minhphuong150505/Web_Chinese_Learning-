import type { PronunciationResponse } from '../../types/pronunciation';

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

const BAND_BG: Record<string, string> = {
  good: 'bg-score-good-bg border-score-good-bd',
  mid: 'bg-score-mid-bg border-score-mid-bd',
  bad: 'bg-score-bad-bg border-score-bad-bd',
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
      <div className={'mt-1 text-[28px] font-extrabold ' + BAND_TEXT[b]}>{value}</div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <span className={'block h-full rounded-full ' + BAND_BAR[b]} style={{ width: `${value}%` }} />
      </div>
      <div className="mt-1.5 text-xs text-slate-400">{hint}</div>
    </div>
  );
}

export default function ScorePanel({ result }: ScorePanelProps) {
  return (
    <div className="animate-rise space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <BigMetric label="Accuracy" value={result.accuracy} hint="Right sounds" />
        <BigMetric label="Fluency" value={result.fluency} hint="Smoothness" />
        <BigMetric label="Completeness" value={result.completeness} hint="Words read" />
        <BigMetric label="Prosody" value={result.prosody ?? 0} hint="Tones & rhythm" />
      </div>

      <div>
        <div className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Per-word breakdown
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full border-collapse text-left text-[14px]">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2.5">Word</th>
                <th className="px-4 py-2.5">Score</th>
                <th className="px-4 py-2.5">Syllables</th>
              </tr>
            </thead>
            <tbody>
              {result.words.map((w, i) => {
                const b = band(w.accuracyScore);
                return (
                  <tr key={i} className={'border-t border-slate-100 ' + BAND_BG[b]}>
                    <td className="font-zh px-4 py-2.5 text-[18px] font-medium text-slate-900">{w.word}</td>
                    <td className={'px-4 py-2.5 font-bold ' + BAND_TEXT[b]}>{Math.round(w.accuracyScore)}</td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {w.syllables.map((s) => s.syllable).join(' / ') || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-2.5 flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full bg-score-good" /> ≥ 85</span>
          <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full bg-score-mid" /> 60–84</span>
          <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full bg-score-bad" /> &lt; 60</span>
        </div>
      </div>
    </div>
  );
}
