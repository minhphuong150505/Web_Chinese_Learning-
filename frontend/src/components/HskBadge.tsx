/**
 * Consistent HSK level chip used across every practice mode (chat, writing,
 * pronunciation, study) so an HSK level always looks the same site-wide.
 *
 * Pass either a numeric `level` (1-6) or a ready-made `label` such as
 * "HSK 3" / "HSKK 中级". A numeric level also drives a per-level color so the
 * eye can tell HSK 1 from HSK 4 at a glance.
 */

const LEVEL_TONE: Record<number, string> = {
  1: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  2: 'bg-sky-50 text-sky-700 ring-sky-200',
  3: 'bg-violet-50 text-violet-700 ring-violet-200',
  4: 'bg-amber-50 text-amber-700 ring-amber-200',
  5: 'bg-rose-50 text-rose-700 ring-rose-200',
  6: 'bg-slate-100 text-slate-700 ring-slate-300',
};

const NEUTRAL_TONE = 'bg-slate-100 text-slate-600 ring-slate-200';

interface HskBadgeProps {
  level?: number;
  label?: string;
  className?: string;
}

export default function HskBadge({ level, label, className = '' }: HskBadgeProps) {
  const tone = level && LEVEL_TONE[level] ? LEVEL_TONE[level] : NEUTRAL_TONE;
  const text = label ?? (level ? `HSK ${level}` : 'HSK');
  return (
    <span
      className={
        'inline-flex flex-none items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ' +
        tone +
        (className ? ' ' + className : '')
      }
    >
      {text}
    </span>
  );
}
