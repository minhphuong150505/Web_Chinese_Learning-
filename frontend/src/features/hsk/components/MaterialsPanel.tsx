import { lazy, Suspense, useEffect, useState } from 'react';
import Icon from '../../../components/Icon';
import { useLanguage } from '../../../i18n/LanguageProvider';
import type { HskLevelData, MaterialRef } from '../types';
import { materialUrl } from '../lib/materialUrl';

// pdf.js is heavy (~1 MB); load it only when a user actually opens the materials.
const PdfViewer = lazy(() => import('./PdfViewer'));

interface MaterialsPanelProps {
  level: HskLevelData;
  /** Optionally open a specific material + page on mount (from the roadmap). */
  request?: { file: string; page?: number } | null;
}

const KIND_ICON = {
  textbook: 'book',
  workbook: 'pen',
  writing: 'pen',
  handbook: 'book',
  audio: 'volume',
} as const;

export default function MaterialsPanel({ level, request }: MaterialsPanelProps) {
  const { text } = useLanguage();
  const [active, setActive] = useState<MaterialRef | null>(level.materials[0] ?? null);
  const [page, setPage] = useState<number | undefined>(undefined);

  // Reset selection when the level changes.
  useEffect(() => {
    setActive(level.materials[0] ?? null);
    setPage(undefined);
  }, [level]);

  // Honour an "open lesson page" request coming from the roadmap.
  useEffect(() => {
    if (!request) return;
    const match = level.materials.find((m) => m.file === request.file);
    if (match) {
      setActive(match);
      setPage(request.page);
    }
  }, [request, level]);

  if (!active) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {level.materials.map((material) => (
          <button
            key={material.id}
            type="button"
            onClick={() => {
              setActive(material);
              setPage(undefined);
            }}
            className={
              'inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-[13.5px] font-semibold transition-colors ' +
              (active.id === material.id
                ? 'border-violet-600 bg-violet-50 text-violet-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900')
            }
          >
            <Icon name={KIND_ICON[material.kind]} size={16} />
            {text(material.labelVi, material.labelEn)}
          </button>
        ))}
        <a
          href={materialUrl(active.file)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[13.5px] font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
        >
          <Icon name="eye" size={16} /> {text('Mở tab mới', 'Open in new tab')}
        </a>
      </div>

      <Suspense
        fallback={
          <div className="flex h-[68vh] items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-400">
            {text('Đang tải trình xem…', 'Loading viewer…')}
          </div>
        }
      >
        <PdfViewer
          key={active.id}
          url={materialUrl(active.file)}
          initialPage={page}
          title={text(active.labelVi, active.labelEn)}
        />
      </Suspense>

      {level.audio && level.audio.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            <Icon name="volume" size={16} /> {text('Bài nghe', 'Listening audio')}
          </h3>
          {level.audio.map((group) => (
            <details key={group.dir} className="rounded-xl border border-slate-200 bg-white">
              <summary className="cursor-pointer select-none px-4 py-3 text-[14px] font-semibold text-slate-700">
                {text(group.labelVi, group.labelEn)}
              </summary>
              <ul className="divide-y divide-slate-100 px-4 pb-3">
                {group.tracks.map((track) => (
                  <li key={track} className="flex flex-col gap-1 py-2.5">
                    <span className="text-[13px] font-medium text-slate-600">{track.replace(/\.mp3$/i, '')}</span>
                    <audio controls preload="none" src={materialUrl(`${group.dir}/${track}`)} className="h-9 w-full max-w-md" />
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
