import TranslationForm from './TranslationForm';
import { useLanguage } from '../../i18n/LanguageProvider';

export default function TranslationTab() {
  const { text } = useLanguage();

  return (
    <div className="scroll min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[880px] px-7 pb-20 pt-[30px]">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-violet-500">
            {text('Luyện dịch', 'Translation practice')}
          </div>
          <h2 className="mt-1 text-[26px] font-extrabold tracking-tight text-slate-900">
            {text('Dịch thuật', 'Translate')}{' '}
            <span className="font-zh text-[22px] font-semibold text-slate-400">翻译</span>
          </h2>
        </div>
        <TranslationForm />
      </div>
    </div>
  );
}
