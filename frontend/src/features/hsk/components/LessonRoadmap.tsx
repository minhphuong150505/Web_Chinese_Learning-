import Icon from '../../../components/Icon';
import { useLanguage } from '../../../i18n/LanguageProvider';
import type { HskLevelData } from '../types';

interface LessonRoadmapProps {
  level: HskLevelData;
  /** Open the textbook at the lesson's start page in the Materials view. */
  onOpenLesson: (page: number, textbookFile?: string) => void;
}

export default function LessonRoadmap({ level, onOpenLesson }: LessonRoadmapProps) {
  const { text } = useLanguage();
  const wordsByLesson = (no: number) => level.vocab.filter((v) => v.lesson === no).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-[13.5px] text-slate-600">
        <span><strong className="text-violet-700">{level.lessons.length}</strong> {text('bài học', 'lessons')}</span>
        <span><strong className="text-violet-700">{level.wordTarget}</strong> {text('từ vựng', 'vocabulary')}</span>
        <span>{text('Thời lượng', 'Study time')}: <strong className="text-violet-700">{level.hours}</strong></span>
      </div>

      <ol className="flex flex-col gap-2">
        {level.lessons.map((lesson) => {
          const count = wordsByLesson(lesson.no);
          return (
            <li key={lesson.no}>
              <button
                type="button"
                onClick={() => onOpenLesson(lesson.page, lesson.textbookFile)}
                className="group flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-violet-300 hover:bg-violet-50/40"
              >
                <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-violet-100 text-[15px] font-bold text-violet-700">
                  {lesson.no}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-semibold text-slate-800">{lesson.zh}</span>
                  <span className="block truncate text-[13px] text-slate-500">{lesson.titleVi}</span>
                </span>
                {count > 0 && (
                  <span className="hidden flex-none rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] font-semibold text-slate-500 sm:inline">
                    {count} {text('từ', 'words')}
                  </span>
                )}
                <span className="flex-none text-[12px] font-medium text-slate-400">
                  {text('Trang', 'p.')} {lesson.page}
                </span>
                <Icon name="chevR" size={16} className="flex-none text-slate-300 group-hover:text-violet-500" />
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
