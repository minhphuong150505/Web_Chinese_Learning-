import { useLanguage, type Language } from '../i18n/LanguageProvider';

const OPTIONS: Array<{ id: Language; label: string }> = [
  { id: 'vi', label: 'VI' },
  { id: 'en', label: 'EN' },
];

export default function LanguageToggle() {
  const { language, setLanguage, text } = useLanguage();

  return (
    <div
      className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 p-1"
      role="group"
      aria-label={text('Chọn ngôn ngữ', 'Choose language')}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => setLanguage(option.id)}
          aria-pressed={language === option.id}
          className={
            'h-8 min-w-9 rounded-lg px-2 text-[12px] font-extrabold transition ' +
            (language === option.id
              ? 'bg-white text-violet-700 shadow-sm'
              : 'text-slate-400 hover:text-slate-700')
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
