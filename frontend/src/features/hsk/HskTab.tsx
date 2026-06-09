import { useMemo, useState } from 'react';
import Icon, { type IconName } from '../../components/Icon';
import { useLanguage } from '../../i18n/LanguageProvider';
import { HSK_LEVELS, getLevel } from './data';
import LessonRoadmap from './components/LessonRoadmap';
import VocabPanel from './components/VocabPanel';
import MaterialsPanel from './components/MaterialsPanel';

type Section = 'roadmap' | 'vocab' | 'materials';

const SECTIONS: { id: Section; vi: string; en: string; icon: IconName }[] = [
  { id: 'roadmap', vi: 'Lộ trình', en: 'Roadmap', icon: 'map' },
  { id: 'vocab', vi: 'Từ vựng', en: 'Vocabulary', icon: 'cards' },
  { id: 'materials', vi: 'Tài liệu', en: 'Materials', icon: 'book' },
];

export default function HskTab() {
  const { text } = useLanguage();
  const [level, setLevel] = useState<number>(1);
  const [section, setSection] = useState<Section>('roadmap');
  const [materialRequest, setMaterialRequest] = useState<{ file: string; page?: number } | null>(null);

  const data = useMemo(() => getLevel(level), [level]);

  function openLesson(page: number, textbookFile?: string) {
    const fallback = data.materials.find((m) => m.kind === 'textbook') ?? data.materials[0];
    const file = textbookFile ?? fallback?.file;
    if (!file) return;
    setMaterialRequest({ file, page });
    setSection('materials');
  }

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-5 px-3 py-5 sm:px-7">
      {/* Level selector */}
      <div className="flex flex-wrap gap-2">
        {HSK_LEVELS.map((entry) => (
          <button
            key={entry.level}
            type="button"
            onClick={() => {
              setLevel(entry.level);
              setMaterialRequest(null);
            }}
            className={
              'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[14px] font-bold transition-colors ' +
              (level === entry.level
                ? 'border-violet-600 bg-violet-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700')
            }
          >
            HSK {entry.level}
            <span className={'text-[11.5px] font-medium ' + (level === entry.level ? 'text-violet-100' : 'text-slate-400')}>
              {entry.wordTarget}
            </span>
          </button>
        ))}
      </div>

      {/* Section nav */}
      <div className="flex gap-1 border-b border-slate-200">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={
              '-mb-px inline-flex items-center gap-2 border-b-[2.5px] px-4 pb-3 pt-1 text-[14px] font-semibold transition-colors ' +
              (section === s.id
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-slate-500 hover:text-slate-900')
            }
          >
            <Icon name={s.icon} size={16} /> {text(s.vi, s.en)}
          </button>
        ))}
      </div>

      <div>
        {section === 'roadmap' && <LessonRoadmap level={data} onOpenLesson={openLesson} />}
        {section === 'vocab' && <VocabPanel level={data} />}
        {section === 'materials' && <MaterialsPanel level={data} request={materialRequest} />}
      </div>
    </div>
  );
}
