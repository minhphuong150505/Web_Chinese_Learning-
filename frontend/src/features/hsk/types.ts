/**
 * HSK study-content data model.
 *
 * Every value in the data files (hsk1.ts … hsk4.ts) is transcribed directly from
 * the official 《HSK标准教程》 Vietnamese edition scans in /TaiLieu — lesson titles,
 * vocabulary, pinyin, part of speech and Vietnamese glosses all come from the
 * book's own 目录 (table of contents) and 词语总表 (vocabulary master list).
 * Nothing here is invented.
 */

/** One vocabulary entry from a lesson's 生词 / the book's 词语总表. */
export interface VocabEntry {
  /** 词语 — the Chinese word. */
  hanzi: string;
  /** 拼音 — pinyin with tone marks, exactly as printed. */
  pinyin: string;
  /** 词性 — Vietnamese part-of-speech abbreviation as printed (e.g. "đgt.", "dt."). */
  pos: string;
  /** 词义 — Vietnamese meaning as printed. */
  meaningVi: string;
  /** 课号 — lesson number the word is introduced in. */
  lesson: number;
  /** Proper noun (专有名词). */
  proper?: boolean;
  /** Over-syllabus supplementary word (超纲词, printed with a leading *). */
  supplementary?: boolean;
}

/** One lesson row from the textbook 目录. */
export interface Lesson {
  no: number;
  /** 课文 — Chinese lesson title. */
  zh: string;
  /** Vietnamese title as printed in the 目录. */
  titleVi: string;
  /** 页码 — page number within its textbook volume. */
  page: number;
  /**
   * Textbook file this lesson lives in. Needed for HSK 4, which is split into
   * two volumes (上/下) that each restart page numbering. When omitted, the
   * level's single `kind: 'textbook'` material is used.
   */
  textbookFile?: string;
}

/** A downloadable / viewable book or audio file under the materials directory. */
export interface MaterialRef {
  id: string;
  labelVi: string;
  labelEn: string;
  /** Path relative to the materials root, e.g. "HSK1/HSK1 Sách giáo khoa.pdf". */
  file: string;
  kind: 'textbook' | 'workbook' | 'writing' | 'handbook' | 'audio';
}

/** A folder of listening MP3s (HSK 4 workbook audio). */
export interface AudioGroup {
  labelVi: string;
  labelEn: string;
  /** Directory under the materials root holding the MP3s. */
  dir: string;
  /** File names within dir, in playback order. */
  tracks: string[];
}

export interface HskLevelData {
  level: 1 | 2 | 3 | 4;
  /** Vocabulary target for the level, e.g. "150 từ". */
  wordTarget: string;
  /** Recommended study hours as printed in the book preface. */
  hours: string;
  lessons: Lesson[];
  vocab: VocabEntry[];
  materials: MaterialRef[];
  /** Listening audio, present for HSK 4. */
  audio?: AudioGroup[];
  /** True once the full vocab list has been transcribed for this level. */
  vocabComplete: boolean;
}
