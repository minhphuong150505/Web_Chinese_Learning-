import { useState } from 'react';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import { useTranslation } from '../../hooks/useTranslation';
import { useLanguage } from '../../i18n/LanguageProvider';
import type { Direction } from '../../types/translation';

const DIRECTIONS: Array<{ id: Direction; label: string }> = [
  { id: 'VI_TO_ZH', label: 'VI → ZH' },
  { id: 'ZH_TO_VI', label: 'ZH → VI' },
];

export default function TranslationForm() {
  const { text: uiText } = useLanguage();
  const [direction, setDirection] = useState<Direction>('VI_TO_ZH');
  const [text, setText] = useState('');
  const translate = useTranslation();

  function submit() {
    if (!text.trim() || translate.isPending) return;
    translate.mutate({ text: text.trim(), direction });
  }

  function swap() {
    setDirection((d) => (d === 'VI_TO_ZH' ? 'ZH_TO_VI' : 'VI_TO_ZH'));
    setText('');
    translate.reset();
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {DIRECTIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDirection(d.id)}
                className={
                  'rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ' +
                  (direction === d.id ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-900')
                }
              >
                {d.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={swap}
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
            title={uiText('Đổi chiều dịch', 'Swap direction')}
            aria-label={uiText('Đổi chiều dịch', 'Swap direction')}
          >
            <Icon name="swap" size={16} />
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            direction === 'VI_TO_ZH'
              ? uiText('Nhập tiếng Việt...', 'Type in Vietnamese...')
              : uiText('Nhập tiếng Trung...', 'Type in Chinese...')
          }
          rows={8}
          className="scroll min-h-[180px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
        />
        <button
          type="button"
          onClick={submit}
          disabled={translate.isPending || !text.trim()}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-violet-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-accent transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {translate.isPending && <Spinner size={16} />}
          {translate.isPending
            ? uiText('Đang dịch...', 'Translating...')
            : uiText('Dịch', 'Translate')}
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {uiText('Kết quả', 'Result')}
        </span>
        <div className="scroll min-h-[180px] flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] leading-relaxed text-slate-900">
          {translate.isPending && (
            <span className="text-slate-400">{uiText('Đang dịch...', 'Translating...')}</span>
          )}
          {translate.isError && <span className="text-red-600">{(translate.error as Error).message}</span>}
          {translate.data && <span>{translate.data.translation}</span>}
          {!translate.isPending && !translate.data && !translate.isError && (
            <span className="text-slate-400">
              {uiText('Bản dịch sẽ xuất hiện tại đây.', 'Your translation will appear here.')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
