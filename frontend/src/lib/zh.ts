import { pinyin, getNumOfTone } from 'pinyin-pro';

export interface ZhToken {
  hz: string;
  py: string | null;
  tone: number;
}

/**
 * Converts plain text (as returned by the real API — no pinyin annotations)
 * into per-character tokens for <Hanzi> to render as tone-colored ruby text.
 * Non-Chinese characters (latin letters, punctuation, spaces) come back as
 * `{ py: null, tone: 0 }` and render as plain text.
 */
export function toZhTokens(text: string): ZhToken[] {
  return Array.from(text).map((hz) => {
    const py = pinyin(hz, { type: 'string', toneType: 'symbol' });
    if (py === hz) return { hz, py: null, tone: 0 };
    const tone = Number.parseInt(getNumOfTone(py), 10) || 0;
    return { hz, py, tone };
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
