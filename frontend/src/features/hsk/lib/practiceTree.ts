/**
 * Shared HSK practice tree: HSK level -> 5-lesson group -> lesson, derived from
 * the same verbatim textbook 目录 data the Pronounce tab uses (HSK_LEVELS).
 *
 * Chat (speaking) and Writing both build their "HSK exam practice" picker from
 * this so the tree shape stays identical to the Pronounce tab. Each lesson can
 * be turned into a backend request (conversation scenario / writing context)
 * that carries the HSK level so the LLM caps its vocabulary to that level and
 * stays on the lesson topic.
 */
import { HSK_LEVELS } from '../data';
import type { HskLevelData, Lesson } from '../types';

export interface HskPracticeLesson {
  id: string;
  no: number;
  level: number;
  zh: string;
  titleVi: string;
  metaVi: string;
  metaEn: string;
}

export interface HskPracticeGroup {
  id: string;
  titleVi: string;
  titleEn: string;
  lessons: HskPracticeLesson[];
}

export interface HskPracticeLevel {
  level: number;
  badge: string;
  descriptionVi: string;
  descriptionEn: string;
  groups: HskPracticeGroup[];
}

function lessonMeta(level: HskLevelData, lesson: Lesson): { metaVi: string; metaEn: string } {
  if (level.level === 4) {
    const volumeVi = lesson.no <= 10 ? 'Quyển thượng' : 'Quyển hạ';
    const volumeEn = lesson.no <= 10 ? 'Vol. 1' : 'Vol. 2';
    return {
      metaVi: `HSK 4 · ${volumeVi} · Bài ${lesson.no}`,
      metaEn: `HSK 4 · ${volumeEn} · Lesson ${lesson.no}`,
    };
  }
  return {
    metaVi: `HSK ${level.level} · Bài ${lesson.no}`,
    metaEn: `HSK ${level.level} · Lesson ${lesson.no}`,
  };
}

function buildLevel(level: HskLevelData): HskPracticeLevel {
  const groups: HskPracticeGroup[] = [];
  for (let start = 0; start < level.lessons.length; start += 5) {
    const slice = level.lessons.slice(start, start + 5);
    const first = slice[0];
    const last = slice[slice.length - 1];
    if (!first || !last) continue;
    groups.push({
      id: `hsk-${level.level}-lessons-${first.no}-${last.no}`,
      titleVi: `Bài ${first.no}-${last.no}`,
      titleEn: `Lessons ${first.no}-${last.no}`,
      lessons: slice.map((lesson) => ({
        id: `hsk-${level.level}-lesson-${lesson.no}`,
        no: lesson.no,
        level: level.level,
        zh: lesson.zh,
        titleVi: lesson.titleVi,
        ...lessonMeta(level, lesson),
      })),
    });
  }
  return {
    level: level.level,
    badge: level.wordTarget,
    descriptionVi: `${level.lessons.length} bài · ${level.hours}`,
    descriptionEn: `${level.lessons.length} lessons · ${level.hours}`,
    groups,
  };
}

export const HSK_PRACTICE_TREE: HskPracticeLevel[] = HSK_LEVELS.map(buildLevel);

/** topicTitle for the backend, capped to the 80-char column limit. */
function lessonTopicTitle(lesson: HskPracticeLesson): string {
  const base = `HSK ${lesson.level} · Bài ${lesson.no}`;
  const full = `${base}: ${lesson.titleVi}`;
  return full.length <= 80 ? full : base;
}

export interface LessonConversationRequest {
  topicTitle: string;
  scenario: string;
  hskLevel: number;
}

export function lessonConversationRequest(lesson: HskPracticeLesson): LessonConversationRequest {
  return {
    topicTitle: lessonTopicTitle(lesson),
    scenario:
      `Luyện nói chuẩn bị thi HSK ${lesson.level} (HSKK) theo chủ đề bài ${lesson.no} ` +
      `"${lesson.zh}" (${lesson.titleVi}) trong giáo trình 标准教程 HSK ${lesson.level}. ` +
      `Tập trung vào từ vựng và mẫu câu của bài này, giữ đúng trình độ HSK ${lesson.level}.`,
    hskLevel: lesson.level,
  };
}

export interface LessonWritingRequest {
  topicTitle: string;
  context: string;
  hskLevel: number;
}

export function lessonWritingRequest(lesson: HskPracticeLesson): LessonWritingRequest {
  return {
    topicTitle: lessonTopicTitle(lesson),
    context:
      `Tạo đề luyện viết chuẩn bị thi HSK ${lesson.level} theo chủ đề bài ${lesson.no} ` +
      `"${lesson.zh}" (${lesson.titleVi}) trong giáo trình 标准教程 HSK ${lesson.level}. ` +
      `Dùng từ vựng và mẫu câu đúng trình độ HSK ${lesson.level}.`,
    hskLevel: lesson.level,
  };
}
