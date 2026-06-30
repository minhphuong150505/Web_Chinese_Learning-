import { useLanguage } from '../i18n/LanguageProvider';
import { useTargetLanguage, type TargetLanguage } from '../i18n/TargetLanguageProvider';

const OPTIONS: Array<{ id: TargetLanguage; label: string }> = [
  { id: 'zh', label: '中文' },
  { id: 'en', label: 'EN' },
];

/** Picks which language the learner practises (Chinese vs English). */
export default function TargetLanguageToggle() {
  const { target, setTarget } = useTargetLanguage();
  const { text } = useLanguage();

  return (
    <div
      className="inline-flex h-10 items-center rounded-xl border border-violet-200 bg-violet-50 p-1"
      role="group"
      aria-label={text('Ngôn ngữ luyện tập', 'Practice language')}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => setTarget(option.id)}
          aria-pressed={target === option.id}
          className={
            'h-8 min-w-9 rounded-lg px-2.5 text-[12px] font-extrabold transition ' +
            (target === option.id
              ? 'bg-white text-violet-700 shadow-sm'
              : 'text-violet-400 hover:text-violet-700')
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
