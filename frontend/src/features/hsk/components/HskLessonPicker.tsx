/**
 * Collapsible HSK practice tree (level -> 5-lesson group -> lesson), shared by
 * the chat and writing "HSK exam practice" setups. Mirrors the Pronounce tab's
 * topic tree so the three practice modes feel the same. Picking a lesson calls
 * `onSelectLesson`; the parent turns it into a backend request.
 */
import { useState } from 'react';
import Icon from '../../../components/Icon';
import HskBadge from '../../../components/HskBadge';
import { useLanguage } from '../../../i18n/LanguageProvider';
import { HSK_PRACTICE_TREE, type HskPracticeLesson } from '../lib/practiceTree';

interface HskLessonPickerProps {
  selectedLessonId: string | null;
  onSelectLesson: (lesson: HskPracticeLesson) => void;
}

const FIRST_GROUP_ID = HSK_PRACTICE_TREE[0]?.groups[0]?.id;

export default function HskLessonPicker({ selectedLessonId, onSelectLesson }: HskLessonPickerProps) {
  const { language, text } = useLanguage();
  const [openLevels, setOpenLevels] = useState<number[]>([1]);
  const [openGroups, setOpenGroups] = useState<string[]>(FIRST_GROUP_ID ? [FIRST_GROUP_ID] : []);

  function toggleLevel(level: number) {
    setOpenLevels((ids) => (ids.includes(level) ? ids.filter((id) => id !== level) : [...ids, level]));
  }

  function toggleGroup(id: string) {
    setOpenGroups((ids) => (ids.includes(id) ? ids.filter((g) => g !== id) : [...ids, id]));
  }

  return (
    <div className="scroll max-h-[460px] space-y-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2">
      {HSK_PRACTICE_TREE.map((level) => {
        const levelOpen = openLevels.includes(level.level);
        return (
          <div key={level.level}>
            <button
              type="button"
              onClick={() => toggleLevel(level.level)}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition hover:bg-slate-50"
            >
              <Icon name={levelOpen ? 'chevDown' : 'chevR'} size={15} className="flex-none text-slate-400" />
              <HskBadge level={level.level} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-500">
                {language === 'vi' ? level.descriptionVi : level.descriptionEn}
              </span>
              <span className="flex-none rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600">
                {level.badge}
              </span>
            </button>

            {levelOpen && (
              <div className="ml-3 border-l border-slate-200 pl-2">
                {level.groups.map((group) => {
                  const groupOpen = openGroups.includes(group.id);
                  return (
                    <div key={group.id}>
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-50"
                      >
                        <Icon name={groupOpen ? 'chevDown' : 'chevR'} size={13} className="flex-none text-slate-400" />
                        <span className="flex-1 truncate text-[12.5px] font-bold text-slate-700">
                          {language === 'vi' ? group.titleVi : group.titleEn}
                        </span>
                        <span className="flex-none text-[11px] font-semibold text-slate-400">
                          {group.lessons.length} {text('bài', 'lessons')}
                        </span>
                      </button>

                      {groupOpen && (
                        <div className="ml-3 space-y-1 border-l border-slate-100 py-1 pl-2">
                          {group.lessons.map((lesson) => {
                            const active = lesson.id === selectedLessonId;
                            return (
                              <button
                                key={lesson.id}
                                type="button"
                                onClick={() => onSelectLesson(lesson)}
                                aria-pressed={active}
                                className={
                                  'block w-full rounded-lg border px-2.5 py-2 text-left transition ' +
                                  (active
                                    ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-100'
                                    : 'border-transparent hover:border-violet-200 hover:bg-violet-50/50')
                                }
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-extrabold uppercase tracking-wide text-violet-500">
                                    {text('Bài', 'Lesson')} {lesson.no}
                                  </span>
                                  <span className="flex-none text-[10.5px] font-semibold text-slate-400">
                                    {language === 'vi' ? lesson.metaVi : lesson.metaEn}
                                  </span>
                                </div>
                                <div className="mt-0.5 font-zh text-[16px] font-semibold leading-6 text-slate-900">
                                  {lesson.zh}
                                </div>
                                <div className="text-[11.5px] leading-4 text-slate-500">{lesson.titleVi}</div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
