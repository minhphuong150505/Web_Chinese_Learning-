import { useEffect, useMemo, useRef, useState } from 'react';
import Hanzi from '../../components/Hanzi';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import { toZhTokens } from '../../lib/zh';
import { useAssessPronunciation, usePronunciationHistory } from '../../hooks/usePronunciation';
import { useLanguage, type Language } from '../../i18n/LanguageProvider';
import { useTargetLanguage } from '../../i18n/TargetLanguageProvider';
import { HSK_LEVELS } from '../hsk/data';
import type { HskLevelData, Lesson } from '../hsk/types';
import RecordButton from './RecordButton';
import ScorePanel from './ScorePanel';
import type { PronunciationResponse } from '../../types/pronunciation';

interface PronunciationPracticeSentence {
  id: string;
  labelVi: string;
  labelEn: string;
  zh: string;
  vi: string;
  en: string;
  metaVi?: string;
  metaEn?: string;
  removable?: boolean;
}

interface PronunciationPracticeSubtopic {
  id: string;
  titleVi: string;
  titleEn: string;
  descriptionVi: string;
  descriptionEn: string;
  sentences: PronunciationPracticeSentence[];
}

interface PronunciationPracticeTopic {
  id: string;
  titleVi: string;
  titleEn: string;
  badgeVi: string;
  badgeEn: string;
  descriptionVi: string;
  descriptionEn: string;
  subtopics: PronunciationPracticeSubtopic[];
}

const DEFAULT_PROMPT: PronunciationPracticeSentence = {
  id: 'hsk-1-lesson-1',
  labelVi: 'Bài 1',
  labelEn: 'Lesson 1',
  zh: '你好，今天你好吗？',
  vi: 'Chào anh!',
  en: 'Chào anh!',
  metaVi: 'HSK 1 · Trang 14',
  metaEn: 'HSK 1 · p. 14',
};

const DEFAULT_SUBTOPIC: PronunciationPracticeSubtopic = {
  id: 'hsk-1-lessons-1-5',
  titleVi: 'Bài 1-5',
  titleEn: 'Lessons 1-5',
  descriptionVi: 'Các câu tiêu đề bài học từ sách HSK 1.',
  descriptionEn: 'Lesson-title sentences from HSK 1.',
  sentences: [DEFAULT_PROMPT],
};

const DEFAULT_TOPIC_ID = 'hsk-1';
const DEFAULT_SUBTOPIC_ID = DEFAULT_SUBTOPIC.id;
const DEFAULT_PROMPT_ID = DEFAULT_PROMPT.id;
const CUSTOM_PROMPTS_KEY = 'pron_custom_prompts';
const CUSTOM_TOPIC_ID = 'custom';
const CUSTOM_SUBTOPIC_ID = 'custom-sentences';

const QUICK_TOPIC: PronunciationPracticeTopic = {
  id: 'quick',
  titleVi: 'Luyện nhanh',
  titleEn: 'Quick practice',
  badgeVi: 'Mẫu',
  badgeEn: 'Preset',
  descriptionVi: 'Câu ngắn để khởi động phát âm và thanh điệu.',
  descriptionEn: 'Short warm-up sentences for pronunciation and tones.',
  subtopics: [
    {
      id: 'quick-short',
      titleVi: 'Câu ngắn',
      titleEn: 'Short sentences',
      descriptionVi: 'Câu giao tiếp ngắn.',
      descriptionEn: 'Short everyday sentences.',
      sentences: [
        {
          id: 'short-greeting',
          labelVi: 'Chào hỏi',
          labelEn: 'Greeting',
          zh: '你好，今天你好吗？',
          vi: 'Xin chào, hôm nay bạn khỏe không?',
          en: 'Hello, how are you today?',
        },
        {
          id: 'short-intro',
          labelVi: 'Giới thiệu',
          labelEn: 'Introduction',
          zh: '我叫安娜，很高兴认识你。',
          vi: 'Tôi tên là Anna, rất vui được gặp bạn.',
          en: 'My name is Anna. Nice to meet you.',
        },
        {
          id: 'short-repeat',
          labelVi: 'Nhắc lại',
          labelEn: 'Repeat',
          zh: '请你再说一遍。',
          vi: 'Làm ơn nói lại một lần nữa.',
          en: 'Please say it one more time.',
        },
      ],
    },
    {
      id: 'quick-tone',
      titleVi: 'Thanh điệu',
      titleEn: 'Tone practice',
      descriptionVi: 'Câu ngắn tập trung vào thanh điệu.',
      descriptionEn: 'Short sentences focused on tones.',
      sentences: [
        {
          id: 'tone-ma',
          labelVi: 'Ma-ma',
          labelEn: 'Ma tones',
          zh: '妈妈买马吗？',
          vi: 'Mẹ mua ngựa à?',
          en: 'Is mom buying a horse?',
        },
        {
          id: 'tone-slow',
          labelVi: 'Đọc chậm',
          labelEn: 'Slow reading',
          zh: '这四个字要慢慢读。',
          vi: 'Bốn chữ này cần đọc chậm.',
          en: 'These four characters should be read slowly.',
        },
        {
          id: 'tone-pronounce',
          labelVi: 'Phát âm',
          labelEn: 'Pronunciation',
          zh: '我想学中文发音。',
          vi: 'Tôi muốn học phát âm tiếng Trung.',
          en: 'I want to learn Chinese pronunciation.',
        },
      ],
    },
    {
      id: 'quick-daily',
      titleVi: 'Đời sống',
      titleEn: 'Daily life',
      descriptionVi: 'Câu sinh hoạt hằng ngày.',
      descriptionEn: 'Daily-life sentences.',
      sentences: [
        {
          id: 'daily-tea',
          labelVi: 'Buổi sáng',
          labelEn: 'Morning',
          zh: '今天早上我喝了热茶。',
          vi: 'Sáng nay tôi đã uống trà nóng.',
          en: 'This morning I drank hot tea.',
        },
        {
          id: 'daily-lunch',
          labelVi: 'Sau giờ học',
          labelEn: 'After class',
          zh: '下课以后，我们一起吃饭吧。',
          vi: 'Sau giờ học, chúng ta cùng ăn cơm nhé.',
          en: 'After class, let’s eat together.',
        },
        {
          id: 'daily-weekend',
          labelVi: 'Cuối tuần',
          labelEn: 'Weekend',
          zh: '我周末想去公园散步。',
          vi: 'Cuối tuần tôi muốn đi công viên dạo bộ.',
          en: 'I want to take a walk in the park this weekend.',
        },
      ],
    },
  ],
};

function lessonMeta(level: HskLevelData, lesson: Lesson): Pick<PronunciationPracticeSentence, 'metaVi' | 'metaEn'> {
  if (level.level === 4) {
    const volumeVi = lesson.no <= 10 ? 'Quyển thượng' : 'Quyển hạ';
    const volumeEn = lesson.no <= 10 ? 'Vol. 1' : 'Vol. 2';
    return {
      metaVi: `HSK 4 · ${volumeVi} · Trang ${lesson.page}`,
      metaEn: `HSK 4 · ${volumeEn} · p. ${lesson.page}`,
    };
  }

  return {
    metaVi: `HSK ${level.level} · Trang ${lesson.page}`,
    metaEn: `HSK ${level.level} · p. ${lesson.page}`,
  };
}

function buildHskTopic(level: HskLevelData): PronunciationPracticeTopic {
  const subtopics: PronunciationPracticeSubtopic[] = [];
  for (let start = 0; start < level.lessons.length; start += 5) {
    const group = level.lessons.slice(start, start + 5);
    const first = group[0];
    const last = group[group.length - 1];
    if (!first || !last) continue;

    subtopics.push({
      id: `hsk-${level.level}-lessons-${first.no}-${last.no}`,
      titleVi: `Bài ${first.no}-${last.no}`,
      titleEn: `Lessons ${first.no}-${last.no}`,
      descriptionVi: `Câu tiêu đề bài ${first.no}-${last.no} từ sách HSK ${level.level}.`,
      descriptionEn: `Lesson-title sentences ${first.no}-${last.no} from HSK ${level.level}.`,
      sentences: group.map((lesson) => ({
        id: `hsk-${level.level}-lesson-${lesson.no}`,
        labelVi: `Bài ${lesson.no}`,
        labelEn: `Lesson ${lesson.no}`,
        zh: lesson.zh,
        vi: lesson.titleVi,
        en: lesson.titleVi,
        ...lessonMeta(level, lesson),
      })),
    });
  }

  return {
    id: `hsk-${level.level}`,
    titleVi: `HSK ${level.level}`,
    titleEn: `HSK ${level.level}`,
    badgeVi: level.wordTarget,
    badgeEn: level.wordTarget,
    descriptionVi: `${level.lessons.length} bài · ${level.hours}`,
    descriptionEn: `${level.lessons.length} lessons · ${level.hours}`,
    subtopics: subtopics.length > 0 ? subtopics : [DEFAULT_SUBTOPIC],
  };
}

const HSK_TOPICS = HSK_LEVELS.map(buildHskTopic);
const STATIC_TOPICS: PronunciationPracticeTopic[] = [...HSK_TOPICS, QUICK_TOPIC];
const DEFAULT_TOPIC = STATIC_TOPICS.find((topic) => topic.id === DEFAULT_TOPIC_ID) ?? QUICK_TOPIC;

// English practice content. The `zh` field carries "the text to read aloud"
// regardless of language; `vi`/`en` hold its meaning. TOEIC-oriented topics
// (workplace + everyday communication) replace the HSK tree for English.
const EN_TOPICS: PronunciationPracticeTopic[] = [
  {
    id: 'en-everyday',
    titleVi: 'Giao tiếp hằng ngày',
    titleEn: 'Everyday communication',
    badgeVi: 'A2-B1',
    badgeEn: 'A2-B1',
    descriptionVi: 'Câu ngắn để khởi động phát âm tiếng Anh.',
    descriptionEn: 'Short warm-up sentences for English pronunciation.',
    subtopics: [
      {
        id: 'en-everyday-basics',
        titleVi: 'Câu cơ bản',
        titleEn: 'Basics',
        descriptionVi: 'Câu giao tiếp ngắn hằng ngày.',
        descriptionEn: 'Short everyday sentences.',
        sentences: [
          {
            id: 'en-greeting',
            labelVi: 'Chào hỏi',
            labelEn: 'Greeting',
            zh: 'Good morning. How are you today?',
            vi: 'Chào buổi sáng. Hôm nay bạn thế nào?',
            en: 'Good morning. How are you today?',
          },
          {
            id: 'en-intro',
            labelVi: 'Giới thiệu',
            labelEn: 'Introduction',
            zh: 'My name is Anna. Nice to meet you.',
            vi: 'Tôi tên là Anna. Rất vui được gặp bạn.',
            en: 'My name is Anna. Nice to meet you.',
          },
          {
            id: 'en-repeat',
            labelVi: 'Nhắc lại',
            labelEn: 'Repeat',
            zh: 'Could you please say that again?',
            vi: 'Bạn có thể nói lại được không?',
            en: 'Could you please say that again?',
          },
        ],
      },
    ],
  },
  {
    id: 'en-toeic-workplace',
    titleVi: 'TOEIC · Công sở',
    titleEn: 'TOEIC · Workplace',
    badgeVi: 'TOEIC',
    badgeEn: 'TOEIC',
    descriptionVi: 'Câu giao tiếp công việc thường gặp trong TOEIC.',
    descriptionEn: 'Common workplace communication sentences for TOEIC.',
    subtopics: [
      {
        id: 'en-toeic-meetings',
        titleVi: 'Họp & lịch hẹn',
        titleEn: 'Meetings & scheduling',
        descriptionVi: 'Câu dùng khi sắp xếp công việc.',
        descriptionEn: 'Sentences for scheduling and coordination.',
        sentences: [
          {
            id: 'en-meeting',
            labelVi: 'Dời họp',
            labelEn: 'Reschedule',
            zh: 'Can we reschedule the meeting to next Monday afternoon?',
            vi: 'Chúng ta dời cuộc họp sang chiều thứ Hai tới được không?',
            en: 'Can we reschedule the meeting to next Monday afternoon?',
          },
          {
            id: 'en-report',
            labelVi: 'Báo cáo',
            labelEn: 'Report',
            zh: 'I will send you the report by the end of the day.',
            vi: 'Tôi sẽ gửi bạn báo cáo trước cuối ngày.',
            en: 'I will send you the report by the end of the day.',
          },
          {
            id: 'en-confirm',
            labelVi: 'Xác nhận',
            labelEn: 'Confirm',
            zh: 'Please confirm whether the shipment has arrived.',
            vi: 'Vui lòng xác nhận lô hàng đã đến hay chưa.',
            en: 'Please confirm whether the shipment has arrived.',
          },
        ],
      },
    ],
  },
];
const EN_DEFAULT_TOPIC = EN_TOPICS[0];

function promptLabel(item: PronunciationPracticeSentence, language: Language): string {
  return language === 'vi' ? item.labelVi : item.labelEn;
}

function promptMeaning(item: PronunciationPracticeSentence, language: Language): string {
  return language === 'vi' ? item.vi : item.en;
}

function promptMeta(item: PronunciationPracticeSentence, language: Language): string | undefined {
  return language === 'vi' ? item.metaVi : item.metaEn;
}

function topicSentenceCount(topic: PronunciationPracticeTopic): number {
  return topic.subtopics.reduce((sum, subtopic) => sum + subtopic.sentences.length, 0);
}

function normalizeSentence(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function hasChineseText(value: string): boolean {
  return /[\u3400-\u9FFF]/.test(value);
}

function loadCustomPrompts(): PronunciationPracticeSentence[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PROMPTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is PronunciationPracticeSentence =>
        item
          && typeof item.id === 'string'
          && typeof item.zh === 'string'
          && typeof item.vi === 'string'
          && typeof item.en === 'string'
          && typeof item.labelVi === 'string'
          && typeof item.labelEn === 'string',
      )
      .map((item) => ({ ...item, removable: true }))
      .slice(0, 24);
  } catch {
    return [];
  }
}

function saveCustomPrompts(prompts: PronunciationPracticeSentence[]) {
  localStorage.setItem(CUSTOM_PROMPTS_KEY, JSON.stringify(prompts));
}

function buildCustomTopic(customPrompts: PronunciationPracticeSentence[]): PronunciationPracticeTopic {
  return {
    id: CUSTOM_TOPIC_ID,
    titleVi: 'Câu của bạn',
    titleEn: 'Your sentences',
    badgeVi: 'Riêng',
    badgeEn: 'Custom',
    descriptionVi: `${customPrompts.length} câu tự thêm`,
    descriptionEn: `${customPrompts.length} custom sentences`,
    subtopics: [
      {
        id: CUSTOM_SUBTOPIC_ID,
        titleVi: 'Tự thêm',
        titleEn: 'Custom list',
        descriptionVi: 'Các câu bạn đã thêm để luyện phát âm.',
        descriptionEn: 'Sentences you added for pronunciation practice.',
        sentences: customPrompts,
      },
    ],
  };
}

function firstSubtopic(topic: PronunciationPracticeTopic): PronunciationPracticeSubtopic {
  return topic.subtopics[0] ?? DEFAULT_SUBTOPIC;
}

function firstPrompt(subtopic: PronunciationPracticeSubtopic): PronunciationPracticeSentence {
  return subtopic.sentences[0] ?? DEFAULT_PROMPT;
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

function relativeTime(iso: string, language: Language): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return language === 'vi' ? 'vừa xong' : 'just now';
  if (d < 3600) return `${Math.floor(d / 60)} ${language === 'vi' ? 'phút trước' : 'min ago'}`;
  if (d < 86400) return `${Math.floor(d / 3600)} ${language === 'vi' ? 'giờ trước' : 'hr ago'}`;
  return `${Math.floor(d / 86400)} ${language === 'vi' ? 'ngày trước' : 'days ago'}`;
}

function HistoryRow({ entry }: { entry: PronunciationResponse }) {
  const { language, text } = useLanguage();
  const avg = entry.pronScore;
  const metrics: Array<[string, number]> = [
    [text('Chính xác', 'Accuracy'), entry.accuracy],
    [text('Trôi chảy', 'Fluency'), entry.fluency],
  ];
  if (entry.completeness !== null) {
    metrics.push([text('Đầy đủ', 'Completeness'), entry.completeness]);
  }
  if (entry.prosody !== null) metrics.push([text('Ngữ điệu', 'Prosody'), entry.prosody]);
  return (
    <div className="flex items-center gap-4 border-t border-slate-100 py-3 first:border-t-0">
      <div className={'grid h-10 w-10 flex-none place-items-center rounded-full text-[15px] font-extrabold ' + BAND_TEXT[band(avg)]}>
        {avg}
      </div>
      <div className="min-w-0 flex-1">
        <div className={(entry.lang === 'zh' ? 'font-zh ' : '') + 'truncate text-[14px] font-semibold text-slate-700'}>
          {entry.referenceText}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-slate-500">
          {metrics.map(([label, value]) => (
            <span key={label}>
              <b className={BAND_TEXT[band(value)]}>{Math.round(value)}</b> {label}
            </span>
          ))}
        </div>
      </div>
      <div className="flex-none text-xs text-slate-400">
        {relativeTime(entry.createdAt, language)}
      </div>
    </div>
  );
}

const CONSENT_KEY = 'pron_audio_consent';

export default function PronunciationTab() {
  const { language, text } = useLanguage();
  const { target } = useTargetLanguage();
  const isZh = target === 'zh';
  const [customPrompts, setCustomPrompts] = useState<PronunciationPracticeSentence[]>(loadCustomPrompts);
  const [customSentence, setCustomSentence] = useState('');
  const [customError, setCustomError] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState(DEFAULT_TOPIC_ID);
  const [selectedSubtopicId, setSelectedSubtopicId] = useState(DEFAULT_SUBTOPIC_ID);
  const [selectedPromptId, setSelectedPromptId] = useState(DEFAULT_PROMPT_ID);
  // Accordion: only one topic folder is expanded at a time. Opening another
  // collapses the current one. `null` means every folder is collapsed.
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(DEFAULT_TOPIC_ID);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [isPlaying, setPlaying] = useState(false);
  const [result, setResult] = useState<PronunciationResponse | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Opt-in to donating the recording for tone-grading research (Round 26 Phase 0).
  // Off unless the learner previously turned it on.
  const [consent, setConsent] = useState(() => localStorage.getItem(CONSENT_KEY) === '1');
  const assess = useAssessPronunciation();
  const history = usePronunciationHistory();
  const practiceTopics = useMemo(() => {
    // English has no HSK tree and (for now) no custom sentences — just its own topics.
    if (!isZh) return EN_TOPICS;
    if (customPrompts.length === 0) return STATIC_TOPICS;
    return [...STATIC_TOPICS, buildCustomTopic(customPrompts)];
  }, [isZh, customPrompts]);
  const selectedTopic = useMemo(
    () => practiceTopics.find((topic) => topic.id === selectedTopicId) ?? practiceTopics[0] ?? DEFAULT_TOPIC,
    [practiceTopics, selectedTopicId],
  );
  const selectedSubtopic = useMemo(
    () =>
      selectedTopic.subtopics.find((subtopic) => subtopic.id === selectedSubtopicId)
      ?? firstSubtopic(selectedTopic),
    [selectedTopic, selectedSubtopicId],
  );
  const selectedPrompt = useMemo(() => {
    return (
      selectedSubtopic.sentences.find((item) => item.id === selectedPromptId)
      ?? firstPrompt(selectedSubtopic)
    );
  }, [selectedSubtopic, selectedPromptId]);
  const selectedTopicReferenceTexts = useMemo(
    () => new Set(selectedTopic.subtopics.flatMap((subtopic) => subtopic.sentences.map((sentence) => sentence.zh))),
    [selectedTopic],
  );
  const topicHistory = useMemo(
    () => (history.data ?? []).filter((entry) => selectedTopicReferenceTexts.has(entry.referenceText)),
    [history.data, selectedTopicReferenceTexts],
  );

  useEffect(() => {
    audioRef.current?.pause();
    setPlaying(false);
    if (!lastBlob || lastBlob.size === 0) {
      setPlaybackUrl(null);
      return;
    }

    const url = URL.createObjectURL(lastBlob);
    setPlaybackUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [lastBlob]);

  // Switching practice language swaps the whole topic set, so jump back to the
  // first topic/sentence of the newly selected language and clear any attempt.
  useEffect(() => {
    const topics = isZh ? STATIC_TOPICS : EN_TOPICS;
    const topic = topics[0];
    if (!topic) return;
    const subtopic = firstSubtopic(topic);
    const prompt = firstPrompt(subtopic);
    setSelectedTopicId(topic.id);
    setSelectedSubtopicId(subtopic.id);
    setSelectedPromptId(prompt.id);
    setExpandedTopicId(topic.id);
    resetAttempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  function toggleConsent(next: boolean) {
    setConsent(next);
    localStorage.setItem(CONSENT_KEY, next ? '1' : '0');
  }

  function resetAttempt() {
    audioRef.current?.pause();
    setPlaying(false);
    setLastBlob(null);
    setResult(null);
    assess.reset();
  }

  function selectTopic(topicId: string) {
    const topic = practiceTopics.find((item) => item.id === topicId);
    if (!topic || topic.id === selectedTopicId) return;
    const subtopic = firstSubtopic(topic);
    const prompt = firstPrompt(subtopic);
    setSelectedTopicId(topic.id);
    setSelectedSubtopicId(subtopic.id);
    setSelectedPromptId(prompt.id);
    setExpandedTopicId(topic.id);
    resetAttempt();
  }

  function toggleTopicTree(topicId: string) {
    // Expanding a folder closes whichever one was open; clicking the open
    // folder again collapses it.
    setExpandedTopicId((current) => (current === topicId ? null : topicId));
  }

  function selectSubtopic(subtopicId: string) {
    const subtopic = selectedTopic.subtopics.find((item) => item.id === subtopicId);
    if (!subtopic || subtopic.id === selectedSubtopic.id) return;
    const prompt = firstPrompt(subtopic);
    setSelectedSubtopicId(subtopic.id);
    setSelectedPromptId(prompt.id);
    resetAttempt();
  }

  function selectPrompt(promptId: string) {
    if (promptId === selectedPromptId) return;
    setSelectedPromptId(promptId);
    resetAttempt();
  }

  function addCustomPrompt() {
    const zh = normalizeSentence(customSentence);
    if (!zh) {
      setCustomError(text('Nhập một câu tiếng Trung.', 'Enter a Chinese sentence.'));
      return;
    }
    if (!hasChineseText(zh)) {
      setCustomError(text('Câu luyện cần có chữ Hán.', 'The practice sentence needs Chinese characters.'));
      return;
    }

    const existing = customPrompts.find((item) => item.zh === zh);
    if (existing) {
      setSelectedTopicId(CUSTOM_TOPIC_ID);
      setSelectedSubtopicId(CUSTOM_SUBTOPIC_ID);
      setSelectedPromptId(existing.id);
      setExpandedTopicId(CUSTOM_TOPIC_ID);
      setCustomSentence('');
      setCustomError('');
      resetAttempt();
      return;
    }

    const prompt: PronunciationPracticeSentence = {
      id: `custom-${Date.now()}`,
      labelVi: 'Câu riêng',
      labelEn: 'Custom',
      zh,
      vi: 'Câu tự thêm',
      en: 'Custom sentence',
      removable: true,
    };
    const next = [prompt, ...customPrompts].slice(0, 24);
    setCustomPrompts(next);
    saveCustomPrompts(next);
    setSelectedTopicId(CUSTOM_TOPIC_ID);
    setSelectedSubtopicId(CUSTOM_SUBTOPIC_ID);
    setSelectedPromptId(prompt.id);
    setExpandedTopicId(CUSTOM_TOPIC_ID);
    setCustomSentence('');
    setCustomError('');
    resetAttempt();
  }

  function removeCustomPrompt(promptId: string) {
    const next = customPrompts.filter((item) => item.id !== promptId);
    setCustomPrompts(next);
    saveCustomPrompts(next);
    if (promptId === selectedPromptId) {
      setSelectedTopicId(DEFAULT_TOPIC_ID);
      setSelectedSubtopicId(DEFAULT_SUBTOPIC_ID);
      setSelectedPromptId(DEFAULT_PROMPT_ID);
      resetAttempt();
    }
  }

  function submit() {
    if (!lastBlob) return;
    audioRef.current?.pause();
    setPlaying(false);
    setResult(null);
    assess.mutate(
      { blob: lastBlob, referenceText: selectedPrompt.zh, audioConsent: consent, lang: target },
      { onSuccess: (data) => setResult(data) },
    );
  }

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !playbackUrl) return;
    if (isPlaying) {
      audio.pause();
      setPlaying(false);
      return;
    }

    audio.currentTime = 0;
    audio.play().catch(() => setPlaying(false));
  }

  return (
    <div className="scroll min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1180px] px-7 pb-20 pt-[30px]">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-violet-500">
            {text('Chấm điểm phát âm', 'Pronunciation assessment')}
          </div>
          <h2 className="mt-1 text-[26px] font-extrabold tracking-tight text-slate-900">
            {text('Đọc to câu này', 'Read this sentence aloud')}{' '}
            {isZh && <span className="font-zh text-[22px] font-semibold text-slate-400">朗读</span>}
          </h2>
          <p className="mt-1.5 text-[13.5px] text-slate-500">
            {isZh
              ? text(
                  'Bấm micro, đọc rõ từng chữ. Màu chữ là thanh điệu cần đọc. Sau khi chấm, bạn sẽ thấy điểm từng âm tiết và lỗi thanh điệu cần sửa.',
                  'Tap the microphone and read each word clearly. Text colors show the target tones. After scoring, you will see per-syllable results and tones to improve.',
                )
              : text(
                  'Bấm micro và đọc rõ ràng câu tiếng Anh. Sau khi chấm, bạn sẽ thấy điểm phát âm, độ trôi chảy và những từ cần sửa.',
                  'Tap the microphone and read the English sentence clearly. After scoring, you will see pronunciation, fluency and the words to improve.',
                )}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 lg:sticky lg:top-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {text('Cây topic', 'Topic tree')}
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                {practiceTopics.length}
              </span>
            </div>

            <div className="scroll max-h-[calc(100vh-210px)] space-y-1 overflow-y-auto pr-1">
              {practiceTopics.map((topic) => {
                const activeTopic = topic.id === selectedTopic.id;
                const open = expandedTopicId === topic.id;
                return (
                  <div key={topic.id} className="rounded-xl">
                    <div
                      className={
                        'flex items-center gap-1 rounded-xl border transition ' +
                        (activeTopic
                          ? 'border-violet-300 bg-violet-50'
                          : 'border-transparent hover:bg-slate-50')
                      }
                    >
                      <button
                        type="button"
                        onClick={() => toggleTopicTree(topic.id)}
                        aria-label={open ? text('Thu gọn topic', 'Collapse topic') : text('Mở topic', 'Expand topic')}
                        title={open ? text('Thu gọn topic', 'Collapse topic') : text('Mở topic', 'Expand topic')}
                        className="grid h-9 w-8 flex-none place-items-center rounded-lg text-slate-400 hover:text-violet-600"
                      >
                        <Icon name={open ? 'chevDown' : 'chevR'} size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => selectTopic(topic.id)}
                        aria-pressed={activeTopic}
                        className="min-w-0 flex-1 py-2 pr-2 text-left"
                      >
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <span className="truncate text-[13.5px] font-extrabold text-slate-900">
                            {language === 'vi' ? topic.titleVi : topic.titleEn}
                          </span>
                          <span className="flex-none rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-violet-600">
                            {language === 'vi' ? topic.badgeVi : topic.badgeEn}
                          </span>
                        </div>
                        <div className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">
                          {topic.subtopics.length} {text('topic con', 'subtopics')} ·{' '}
                          {topicSentenceCount(topic)} {text('câu', 'sentences')}
                        </div>
                      </button>
                    </div>

                    {open && (
                      <div className="ml-4 border-l border-slate-200 py-1 pl-3">
                        {topic.subtopics.map((subtopic) => {
                          const activeSubtopic = activeTopic && subtopic.id === selectedSubtopic.id;
                          return (
                            <button
                              key={subtopic.id}
                              type="button"
                              onClick={() => {
                                if (!activeTopic) selectTopic(topic.id);
                                const nextSubtopic = topic.subtopics.find((item) => item.id === subtopic.id);
                                if (!nextSubtopic) return;
                                const prompt = firstPrompt(nextSubtopic);
                                setSelectedTopicId(topic.id);
                                setSelectedSubtopicId(nextSubtopic.id);
                                setSelectedPromptId(prompt.id);
                                setExpandedTopicId(topic.id);
                                resetAttempt();
                              }}
                              aria-pressed={activeSubtopic}
                              className={
                                'my-0.5 block w-full rounded-lg px-2.5 py-2 text-left transition ' +
                                (activeSubtopic
                                  ? 'bg-violet-100 text-violet-700'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')
                              }
                            >
                              <div className="truncate text-[12.5px] font-bold">
                                {language === 'vi' ? subtopic.titleVi : subtopic.titleEn}
                              </div>
                              <div className="mt-0.5 text-[11px] font-semibold text-slate-400">
                                {subtopic.sentences.length} {text('câu', 'sentences')}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
              <span className="inline-block rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-violet-600">
                {language === 'vi' ? selectedTopic.titleVi : selectedTopic.titleEn} ·{' '}
                {language === 'vi' ? selectedSubtopic.titleVi : selectedSubtopic.titleEn}
              </span>
              <div className="mt-3">
                {isZh ? (
                  <Hanzi
                    tokens={toZhTokens(selectedPrompt.zh)}
                    size={selectedPrompt.zh.length > 18 ? 30 : 40}
                    className="max-w-full text-center"
                  />
                ) : (
                  <p className="mx-auto max-w-full text-center text-[24px] font-bold leading-snug text-slate-900">
                    {selectedPrompt.zh}
                  </p>
                )}
              </div>
              <p className="mt-2 text-[14px] text-slate-500">
                {promptMeaning(selectedPrompt, language)}
              </p>
              {promptMeta(selectedPrompt, language) && (
                <p className="mt-1 text-[12px] font-semibold text-slate-400">
                  {promptMeta(selectedPrompt, language)}
                </p>
              )}
            </div>

            <div className={'mt-5 grid gap-5 ' + (isZh ? 'xl:grid-cols-[minmax(0,1fr)_300px]' : '')}>
              <section>
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      {text('Câu trong topic con', 'Sentences')}
                    </h3>
                    <p className="mt-1 text-[12px] text-slate-500">
                      {language === 'vi' ? selectedSubtopic.descriptionVi : selectedSubtopic.descriptionEn}
                    </p>
                  </div>
                  <span className="flex-none text-[11px] font-semibold text-slate-400">
                    {selectedSubtopic.sentences.length} {text('câu', 'sentences')}
                  </span>
                </div>
                {selectedSubtopic.sentences.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-[13px] font-medium text-slate-500">
                    {text('Chưa có câu nào trong mục này.', 'There are no sentences in this subtopic yet.')}
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedSubtopic.sentences.map((item) => {
                      const active = item.id === selectedPrompt.id;
                      return (
                        <div
                          key={item.id}
                          className={
                            'relative rounded-xl border bg-white transition ' +
                            (active
                              ? 'border-violet-400 shadow-sm ring-2 ring-violet-100'
                              : 'border-slate-200 hover:border-violet-200')
                          }
                        >
                          <button
                            type="button"
                            onClick={() => selectPrompt(item.id)}
                            className={'block min-h-[118px] w-full px-3.5 py-3 text-left ' + (item.removable ? 'pr-11' : '')}
                          >
                            <div className="text-[12px] font-extrabold uppercase tracking-wide text-violet-500">
                              {promptLabel(item, language)}
                            </div>
                            <div className={(isZh ? 'font-zh ' : '') + 'mt-1 text-[20px] font-semibold leading-7 text-slate-900'}>
                              {item.zh}
                            </div>
                            <div className="mt-1 text-[12px] leading-5 text-slate-500">
                              {promptMeaning(item, language)}
                            </div>
                            {promptMeta(item, language) && (
                              <div className="mt-1 text-[11px] font-semibold text-slate-400">
                                {promptMeta(item, language)}
                              </div>
                            )}
                          </button>
                          {item.removable && (
                            <button
                              type="button"
                              onClick={() => removeCustomPrompt(item.id)}
                              aria-label={text('Xóa câu', 'Delete sentence')}
                              title={text('Xóa câu', 'Delete sentence')}
                              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <Icon name="trash" size={15} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {isZh && (
              <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4">
                <label htmlFor="custom-pronunciation-sentence" className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  {text('Thêm câu luyện', 'Add sentence')}
                </label>
                <textarea
                  id="custom-pronunciation-sentence"
                  value={customSentence}
                  onChange={(e) => {
                    setCustomSentence(e.target.value);
                    if (customError) setCustomError('');
                  }}
                  maxLength={120}
                  rows={4}
                  placeholder={text('Ví dụ: 我今天想练习发音。', 'Example: 我今天想练习发音。')}
                  className="scroll mt-2 min-h-[112px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 font-zh text-[18px] leading-7 text-slate-900 outline-none transition placeholder:font-sans placeholder:text-[13px] placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold text-slate-400">{customSentence.length}/120</span>
                  <button
                    type="button"
                    onClick={addCustomPrompt}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-violet-600 px-4 text-[13px] font-bold text-white shadow-accent transition hover:bg-violet-700"
                  >
                    <Icon name="plus" size={15} />
                    {text('Thêm', 'Add')}
                  </button>
                </div>
                {customError && <p className="mt-2 text-[12px] font-semibold text-red-600">{customError}</p>}
              </aside>
              )}
            </div>

        <div className="my-7 flex flex-col items-center gap-4">
          <RecordButton
            onStart={() => {
              audioRef.current?.pause();
              setPlaying(false);
            }}
            onComplete={(blob) => {
              setLastBlob(blob);
              setResult(null);
              assess.reset();
            }}
            disabled={assess.isPending}
          />
          {lastBlob && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {playbackUrl && (
                <>
                  <audio
                    ref={audioRef}
                    src={playbackUrl}
                    preload="metadata"
                    onEnded={() => setPlaying(false)}
                    onPause={() => setPlaying(false)}
                    onPlay={() => setPlaying(true)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={togglePlayback}
                    aria-label={
                      isPlaying
                        ? text('Tạm dừng nghe lại', 'Pause playback')
                        : text('Nghe lại bản ghi', 'Play recording')
                    }
                    title={
                      isPlaying
                        ? text('Tạm dừng nghe lại', 'Pause playback')
                        : text('Nghe lại bản ghi', 'Play recording')
                    }
                    className="grid h-11 w-11 place-items-center rounded-full border border-violet-200 bg-white text-violet-600 shadow-sm transition hover:border-violet-300 hover:bg-violet-50"
                  >
                    <Icon name={isPlaying ? 'pause' : 'play'} size={18} />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={assess.isPending || lastBlob.size === 0}
                className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-accent transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {assess.isPending && <Spinner size={16} />}
                {assess.isPending
                  ? text('Đang chấm...', 'Scoring...')
                  : text('Gửi bản ghi', 'Submit recording')}
              </button>
            </div>
          )}
          {lastBlob?.size === 0 && (
            <p className="text-[13px] font-medium text-red-600">
              {text('Bản ghi rỗng. Vui lòng ghi âm lại.', 'The recording is empty. Please record again.')}
            </p>
          )}
          <label className="flex max-w-[560px] cursor-pointer items-start gap-2.5 text-left text-[12.5px] text-slate-500">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => toggleConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-none accent-violet-600"
            />
            <span>
              {text(
                'Cho phép lưu bản ghi này để cải thiện chấm điểm thanh điệu. Bản ghi được giữ riêng tư, dùng cho nghiên cứu và tự động xoá sau một thời gian. Bạn có thể bỏ chọn bất cứ lúc nào.',
                'Allow this recording to be stored to improve tone scoring. It remains private, is used for research, and is automatically deleted after a limited period. You can opt out at any time.',
              )}
            </span>
          </label>
          {assess.isError && (
            <p className="max-w-[620px] text-center text-[13px] font-medium text-red-600">
              {assess.error.message}
            </p>
          )}
        </div>

        {result && <ScorePanel result={result} />}

        <div className="mt-9">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {text('Lần thử gần đây', 'Recent attempts')} ·{' '}
              <span className="text-violet-500">
                {language === 'vi' ? selectedTopic.titleVi : selectedTopic.titleEn}
              </span>
            </div>
            {!history.isLoading && (
              <span className="flex-none text-[11px] font-semibold text-slate-400">
                {topicHistory.length} {text('lần', 'attempts')}
              </span>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-5">
            {history.isLoading && (
              <p className="py-4 text-sm text-slate-400">{text('Đang tải...', 'Loading...')}</p>
            )}
            {!history.isLoading && topicHistory.length === 0 && (
              <p className="py-4 text-sm text-slate-400">
                {text('Chưa có lần thử nào trong topic này.', 'No attempts in this topic yet.')}
              </p>
            )}
            {topicHistory.map((entry) => <HistoryRow key={entry.id} entry={entry} />)}
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}
