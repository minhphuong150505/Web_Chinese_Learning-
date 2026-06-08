import { useState } from 'react';
import Hanzi from '../../components/Hanzi';
import Spinner from '../../components/Spinner';
import { toZhTokens } from '../../lib/zh';
import { useAssessPronunciation, usePronunciationHistory } from '../../hooks/usePronunciation';
import RecordButton from './RecordButton';
import ScorePanel from './ScorePanel';
import type { PronunciationResponse } from '../../types/pronunciation';

const REFERENCE = '我想买一杯热茶和两个包子。'; // per spec/11-sample-content.md §11.2
const REFERENCE_EN = 'I want to buy a cup of hot tea and two buns.';

function band(score: number): 'good' | 'mid' | 'bad' {
  if (score >= 85) return 'good';
  if (score >= 60) return 'mid';
  return 'bad';
}

const BAND_TEXT: Record<string, string> = {
  good: 'text-score-good',
  mid: 'text-score-mid',
  bad: 'text-score-bad',
};

function relativeTime(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function HistoryRow({ entry }: { entry: PronunciationResponse }) {
  const avg = entry.pronScore;
  const metrics: Array<[string, number]> = [
    ['Chính xác', entry.accuracy],
    ['Trôi chảy', entry.fluency],
  ];
  if (entry.completeness !== null) metrics.push(['Đầy đủ', entry.completeness]);
  if (entry.prosody !== null) metrics.push(['Ngữ điệu', entry.prosody]);
  return (
    <div className="flex items-center gap-4 border-t border-slate-100 py-3 first:border-t-0">
      <div className={'grid h-10 w-10 flex-none place-items-center rounded-full text-[15px] font-extrabold ' + BAND_TEXT[band(avg)]}>
        {avg}
      </div>
      <div className="flex flex-1 flex-wrap gap-3 text-[12.5px] text-slate-500">
        {metrics.map(([label, value]) => (
          <span key={label}>
            <b className={BAND_TEXT[band(value)]}>{Math.round(value)}</b> {label}
          </span>
        ))}
      </div>
      <div className="flex-none text-xs text-slate-400">{relativeTime(entry.createdAt)}</div>
    </div>
  );
}

const CONSENT_KEY = 'pron_audio_consent';

export default function PronunciationTab() {
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [result, setResult] = useState<PronunciationResponse | null>(null);
  // Opt-in to donating the recording for tone-grading research (Round 26 Phase 0).
  // Off unless the learner previously turned it on.
  const [consent, setConsent] = useState(() => localStorage.getItem(CONSENT_KEY) === '1');
  const assess = useAssessPronunciation();
  const history = usePronunciationHistory();

  function toggleConsent(next: boolean) {
    setConsent(next);
    localStorage.setItem(CONSENT_KEY, next ? '1' : '0');
  }

  function submit() {
    if (!lastBlob) return;
    setResult(null);
    assess.mutate(
      { blob: lastBlob, referenceText: REFERENCE, audioConsent: consent },
      { onSuccess: (data) => setResult(data) },
    );
  }

  return (
    <div className="scroll min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[880px] px-7 pb-20 pt-[30px]">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-violet-500">
            Chấm điểm phát âm
          </div>
          <h2 className="mt-1 text-[26px] font-extrabold tracking-tight text-slate-900">
            Đọc to câu này <span className="font-zh text-[22px] font-semibold text-slate-400">朗读</span>
          </h2>
          <p className="mt-1.5 text-[13.5px] text-slate-500">
            Bấm micro, đọc rõ từng chữ. Màu chữ là thanh điệu cần đọc — sau khi chấm,
            bạn sẽ thấy điểm từng âm tiết và lỗi thanh điệu cần sửa.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <span className="inline-block rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-violet-600">
            HSK 2
          </span>
          <div className="mt-3">
            <Hanzi tokens={toZhTokens(REFERENCE)} size={40} />
          </div>
          <p className="mt-2 text-[14px] text-slate-500">{REFERENCE_EN}</p>
        </div>

        <div className="my-7 flex flex-col items-center gap-4">
          <RecordButton
            onComplete={(blob) => {
              setLastBlob(blob);
              setResult(null);
              assess.reset();
            }}
            disabled={assess.isPending}
          />
          {lastBlob && (
            <button
              type="button"
              onClick={submit}
              disabled={assess.isPending || lastBlob.size === 0}
              className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-accent transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {assess.isPending && <Spinner size={16} />}
              {assess.isPending ? 'Đang chấm…' : 'Gửi bản ghi'}
            </button>
          )}
          {lastBlob?.size === 0 && (
            <p className="text-[13px] font-medium text-red-600">
              Bản ghi rỗng. Vui lòng ghi âm lại.
            </p>
          )}
          <label className="flex max-w-[560px] cursor-pointer items-start gap-2.5 text-left text-[12.5px] text-slate-500">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => toggleConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-none accent-violet-600"
            />
            <span>
              Cho phép lưu bản ghi này để cải thiện chấm điểm thanh điệu. Bản ghi
              được giữ riêng tư, dùng cho nghiên cứu và tự động xoá sau một thời gian.
              Bạn có thể bỏ chọn bất cứ lúc nào.
            </span>
          </label>
          {assess.isError && (
            <p className="max-w-[620px] text-center text-[13px] font-medium text-red-600">
              {assess.error.message}
            </p>
          )}
        </div>

        {result && <ScorePanel result={result} />}

        <div className="mt-9">
          <div className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Lần thử gần đây
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-5">
            {history.isLoading && <p className="py-4 text-sm text-slate-400">Đang tải…</p>}
            {history.data?.length === 0 && <p className="py-4 text-sm text-slate-400">Chưa có lần thử nào.</p>}
            {history.data?.map((entry) => <HistoryRow key={entry.id} entry={entry} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
