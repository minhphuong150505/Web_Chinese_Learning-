export interface SyllableScore {
  /** Azure's raw pinyin + tone digit, e.g. "ni3". */
  syllable: string;
  accuracyScore: number;
  /** Tone the text calls for: 1-4, or 0 for neutral. Null on legacy rows. */
  expectedTone: number | null;
  /** Tone the learner actually produced, from F0 analysis. Null when unjudged. */
  detectedTone: number | null;
  /** 0-100 match of the pitch contour to the expected tone. Null when unjudged. */
  toneScore: number | null;
}

export interface PhonemeScore {
  phoneme: string;
  accuracyScore: number;
}

export interface WordScore {
  word: string;
  accuracyScore: number;
  errorType: string;
  syllables: SyllableScore[];
  phonemes: PhonemeScore[];
}

export interface PronunciationResponse {
  id: string;
  referenceText: string;
  recognizedText: string;
  accuracy: number;
  fluency: number;
  /** Null for unscripted (free-speech) attempts — no reference to measure against. */
  completeness: number | null;
  prosody: number | null;
  pronScore: number;
  scripted: boolean;
  /** Target-language code ('zh', 'en', …). Drives pinyin/tone rendering. */
  lang: string;
  words: WordScore[];
  createdAt: string;
}
