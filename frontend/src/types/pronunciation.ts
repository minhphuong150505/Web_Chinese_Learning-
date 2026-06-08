export interface SyllableScore {
  syllable: string;
  accuracyScore: number;
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
  completeness: number;
  prosody: number | null;
  pronScore: number;
  words: WordScore[];
  createdAt: string;
}
