import { useQuery } from '@tanstack/react-query';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import { apiClient } from '../../lib/apiClient';

function renderBlock(block: string, index: number) {
  const text = block.trim();
  if (!text) return null;

  if (text.startsWith('### ')) {
    return <h3 key={index} className="text-xl font-extrabold text-slate-900">{text.slice(4)}</h3>;
  }
  if (text.startsWith('## ')) {
    return <h2 key={index} className="text-2xl font-extrabold text-slate-900">{text.slice(3)}</h2>;
  }
  if (text.startsWith('# ')) {
    return <h1 key={index} className="text-3xl font-extrabold text-slate-950">{text.slice(2)}</h1>;
  }
  if (text.split('\n').every((line) => line.trim().startsWith('- '))) {
    return (
      <ul key={index} className="list-disc space-y-2 pl-6 text-[16px] leading-8 text-slate-700">
        {text.split('\n').map((line, itemIndex) => (
          <li key={itemIndex}>{line.trim().slice(2)}</li>
        ))}
      </ul>
    );
  }

  return (
    <p key={index} className="whitespace-pre-line text-[17px] leading-9 text-slate-700">
      {text}
    </p>
  );
}

export default function LetterTab() {
  const letter = useQuery({
    queryKey: ['letter', 'kim-han'],
    queryFn: () => apiClient.get<string>('/letter/kim-han').then((response) => response.data),
  });
  const blocks = (letter.data ?? '').split(/\n{2,}/);

  return (
    <section className="scroll min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] px-4 py-5 sm:px-7 sm:py-7">
      <div className="mx-auto max-w-[860px]">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-rose-600 text-white shadow-lg shadow-rose-600/20">
            <Icon name="mail" size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-extrabold text-slate-950 sm:text-[26px]">
              Thư gửi Kim Hân
            </h1>
            <p className="text-sm font-semibold text-rose-700">Anh Yêu Kim Hân</p>
          </div>
        </div>

        <article className="rounded-lg border border-rose-100 bg-white px-5 py-6 shadow-sm shadow-slate-900/5 sm:px-8 sm:py-8">
          {letter.isLoading ? (
            <div className="grid min-h-[220px] place-items-center">
              <Spinner size={26} />
            </div>
          ) : letter.error ? (
            <p className="text-[15px] font-semibold text-red-600">
              Không thể mở thư này.
            </p>
          ) : (
            <div className="space-y-5 font-serif">
              {blocks.map(renderBlock)}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
