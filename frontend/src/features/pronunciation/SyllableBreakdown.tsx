import { MANDARIN_TONE_VI, numericPinyin } from '../../lib/zh';
import type { WordScore } from '../../types/pronunciation';

// We deliberately show only signals we can stand behind: Azure's per-syllable
// accuracy (which already folds tone correctness into the score) and the target
// tone the syllable should have (from the text). The experimental F0 tone engine
// (detectedTone/toneScore) is computed and stored but NOT shown as a verdict — it
// is not yet reliable enough to tell a beginner "you said the wrong tone" without
// false alarms on correct speech. See tts-service/scripts/calibrate_tone.py.

const TONE_TEXT: Record<number, string> = {
  0: 'text-tone-0',
  1: 'text-tone-1',
  2: 'text-tone-2',
  3: 'text-tone-3',
  4: 'text-tone-4',
};

const ACC_WEAK = 60;

function accBand(score: number): string {
  if (score >= 85) return 'text-score-good';
  if (score >= ACC_WEAK) return 'text-score-mid';
  return 'text-score-bad';
}

interface SyllableView {
  pinyin: string;
  expectedTone: number;
  accuracy: number;
}

function flatten(words: WordScore[]): SyllableView[] {
  const out: SyllableView[] = [];
  for (const w of words) {
    for (const s of w.syllables) {
      if (!s.syllable.trim()) continue;
      const { pinyin, tone } = numericPinyin(s.syllable);
      out.push({ pinyin, expectedTone: s.expectedTone ?? tone, accuracy: s.accuracyScore });
    }
  }
  return out;
}

/** Tips anchored on the target tone + Azure accuracy — both trustworthy signals. */
export function toneTips(words: WordScore[]): string[] {
  const tips: string[] = [];
  for (const s of flatten(words)) {
    if (s.accuracy >= ACC_WEAK) continue;
    tips.push(
      `“${s.pinyin}”: cần đọc ${MANDARIN_TONE_VI[s.expectedTone]} — âm tiết này mới đạt ${Math.round(
        s.accuracy,
      )}/100, luyện thêm.`,
    );
  }
  return tips;
}

export default function SyllableBreakdown({ words }: { words: WordScore[] }) {
  const syllables = flatten(words);
  if (syllables.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {syllables.map((s, i) => (
        <div
          key={i}
          className="flex min-w-[72px] flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2"
        >
          <span className={'text-[17px] font-bold ' + (TONE_TEXT[s.expectedTone] ?? 'text-slate-700')}>
            {s.pinyin || '—'}
          </span>
          <span className={'text-[12px] font-bold ' + accBand(s.accuracy)}>{Math.round(s.accuracy)}</span>
        </div>
      ))}
    </div>
  );
}
