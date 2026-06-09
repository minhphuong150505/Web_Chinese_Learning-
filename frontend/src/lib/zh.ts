import { getNumOfTone, segment } from 'pinyin-pro';

export interface ZhToken {
  hz: string;
  py: string | null;
  tone: number;
}

/**
 * Converts plain text into context-aware word segments. Segmenting the full
 * sentence preserves polyphonic readings such as 银行 (yínháng) and 长大
 * (zhǎngdà), which are often wrong when each character is converted alone.
 */
export function toZhTokens(text: string): ZhToken[] {
  return segment(text, { toneType: 'symbol', toneSandhi: false }).map(({ origin, result }) => {
    if (origin === result) return { hz: origin, py: null, tone: 0 };
    const tone = Number.parseInt(getNumOfTone(result), 10) || 0;
    return { hz: origin, py: result, tone };
  });
}

/**
 * Parses the compact `汉|pīnyīn|tone` notation used for hand-authored sample
 * content (spec/11-sample-content.md), e.g. `"学|xué|2 中|zhōng|1 文|wén|2"`.
 */
export function parseZh(compact: string): ZhToken[] {
  return compact.split(' ').filter(Boolean).map((part) => {
    const [hz, py, toneStr] = part.split('|');
    if (hz === undefined) return { hz: part, py: null, tone: 0 };
    if (py === undefined) return { hz, py: null, tone: 0 };
    return { hz, py, tone: Number.parseInt(toneStr ?? '0', 10) || 0 };
  });
}

const PINYIN_PUNCTUATION: Record<string, string> = {
  '，': ',',
  '。': '.',
  '！': '!',
  '？': '?',
  '；': ';',
  '：': ':',
  '、': ',',
  '“': '“',
  '”': '”',
  '‘': '‘',
  '’': '’',
};

const CLOSING_PUNCTUATION = new Set([',', '.', '!', '?', ';', ':', '”', '’']);
const OPENING_PUNCTUATION = new Set(['“', '‘']);

/**
 * Formats tokens as the compact pinyin line used by Hanzii: word-level pinyin,
 * tone marks, spaces between segments, and western sentence punctuation.
 */
export function toPinyinLine(tokens: ZhToken[]): string {
  let output = '';
  let hasPinyin = false;

  for (const token of tokens) {
    if (token.py) {
      const lastCharacter = output.charAt(output.length - 1);
      if (output && !output.endsWith(' ') && !OPENING_PUNCTUATION.has(lastCharacter)) {
        output += ' ';
      }
      output += token.py.toLowerCase();
      hasPinyin = true;
      continue;
    }

    if (!hasPinyin || token.hz.length !== 1) continue;
    const punctuation = PINYIN_PUNCTUATION[token.hz];
    if (!punctuation) continue;

    if (CLOSING_PUNCTUATION.has(punctuation)) {
      output = output.trimEnd() + punctuation;
    } else {
      if (output && !output.endsWith(' ')) output += ' ';
      output += punctuation;
    }
  }

  return output.trim();
}

/** Mandarin tone names in learner-friendly Vietnamese. Index 0 = neutral. */
export const MANDARIN_TONE_VI: Record<number, string> = {
  0: 'thanh nhẹ',
  1: 'thanh 1 (cao - ngang)',
  2: 'thanh 2 (lên)',
  3: 'thanh 3 (xuống rồi lên)',
  4: 'thanh 4 (xuống mạnh)',
};

/** Mandarin tone names in learner-friendly English. Index 0 = neutral. */
export const MANDARIN_TONE_EN: Record<number, string> = {
  0: 'neutral tone',
  1: 'tone 1 (high and level)',
  2: 'tone 2 (rising)',
  3: 'tone 3 (falling then rising)',
  4: 'tone 4 (sharp falling)',
};

const TONE_MARKS: Record<string, string[]> = {
  a: ['a', 'ā', 'á', 'ǎ', 'à'],
  e: ['e', 'ē', 'é', 'ě', 'è'],
  i: ['i', 'ī', 'í', 'ǐ', 'ì'],
  o: ['o', 'ō', 'ó', 'ǒ', 'ò'],
  u: ['u', 'ū', 'ú', 'ǔ', 'ù'],
  ü: ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

/**
 * Converts Azure's numeric pinyin ("hao3", "lv3", "shi4") into diacritic pinyin
 * ("hǎo", "lǚ", "shì") plus the tone number. Tone 5 and 0 are neutral (no mark).
 * Placement follows the standard rule: a > e > the o in "ou" > last vowel.
 */
export function numericPinyin(raw: string): { pinyin: string; tone: number } {
  if (!raw) return { pinyin: '', tone: 0 };
  let tone = 0;
  let base = raw;
  if (/[0-5]$/.test(raw)) {
    tone = Number(raw[raw.length - 1]);
    base = raw.slice(0, -1);
  }
  base = base.toLowerCase().replace(/u:/g, 'ü').replace(/v/g, 'ü');
  if (tone === 0 || tone === 5) return { pinyin: base, tone: 0 };

  let idx = base.indexOf('a');
  if (idx < 0) idx = base.indexOf('e');
  if (idx < 0 && base.includes('ou')) idx = base.indexOf('o');
  if (idx < 0) {
    for (let i = base.length - 1; i >= 0; i -= 1) {
      const c = base[i];
      if (c && 'aeiouü'.includes(c)) {
        idx = i;
        break;
      }
    }
  }
  if (idx < 0) return { pinyin: base, tone };

  const vowel = base[idx] ?? '';
  const marked = (TONE_MARKS[vowel] ?? [vowel, vowel, vowel, vowel, vowel])[tone] ?? vowel;
  return { pinyin: base.slice(0, idx) + marked + base.slice(idx + 1), tone };
}
