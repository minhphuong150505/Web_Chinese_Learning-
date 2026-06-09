import Hanzi from '../../components/Hanzi';
import { useLanguage } from '../../i18n/LanguageProvider';
import { toZhTokens } from '../../lib/zh';
import type { WritingFeedbackResponse, WritingComment } from '../../types/writing';

interface WritingFeedbackPanelProps {
  result: WritingFeedbackResponse;
}

const SEVERITY_STYLE: Record<WritingComment['severity'], string> = {
  info: 'border-l-slate-300 bg-slate-50',
  warn: 'border-l-amber-400 bg-amber-50',
  error: 'border-l-red-400 bg-red-50',
};

function CommentCard({ comment }: { comment: WritingComment }) {
  return (
    <div className={'rounded-r-xl border-l-[3px] px-4 py-3 ' + SEVERITY_STYLE[comment.severity]}>
      <p className="text-[14px] font-bold text-slate-900">{comment.issue}</p>
      <p className="mt-1 text-[13.5px] leading-relaxed text-slate-500">{comment.suggestion}</p>
    </div>
  );
}

export default function WritingFeedbackPanel({ result }: WritingFeedbackPanelProps) {
  const { text } = useLanguage();

  return (
    <div className="animate-rise flex flex-col gap-5">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {text('Bản đã sửa', 'Corrected text')}
        </span>
        <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-5">
          <Hanzi tokens={toZhTokens(result.correctedText)} className="text-[19px]" />
        </div>
      </div>
      <div>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {text('Nhận xét', 'Feedback')}
        </span>
        <div className="mt-2 flex flex-col gap-2.5">
          {result.comments.map((c, i) => (
            <CommentCard key={i} comment={c} />
          ))}
        </div>
      </div>
    </div>
  );
}
