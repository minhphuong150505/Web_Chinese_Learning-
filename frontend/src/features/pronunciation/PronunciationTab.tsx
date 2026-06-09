import { useEffect, useRef, useState } from 'react';
import Hanzi from '../../components/Hanzi';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import { toZhTokens } from '../../lib/zh';
import { useAssessPronunciation, usePronunciationHistory } from '../../hooks/usePronunciation';
import { useLanguage, type Language } from '../../i18n/LanguageProvider';
import RecordButton from './RecordButton';
import ScorePanel from './ScorePanel';
import type { PronunciationResponse } from '../../types/pronunciation';

const REFERENCE = '我想买一杯热茶和两个包子。'; // per spec/11-sample-content.md §11.2
const REFERENCE_VI = 'Tôi muốn mua một cốc trà nóng và hai cái bánh bao.';
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

function relativeTime(iso: string, language: Language): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return language === 'vi' ? 'vừa xong' : 'just now';
  if (d < 3600) return `${Math.floor(d / 60)} ${language === 'vi' ? 'phút trước' : 'min ago'}`;
  if (d < 86400) return `${Math.floor(d / 3600)} ${language === 'vi' ? 'giờ trước' : 'hr ago'}`;
  return `${Math.floor(d / 86400)} ${language === 'vi' ? 'ngày trước' : 'days ago'}`;
}

function HistoryRow({ entry }: { entry: PronunciationResponse }) {
  const { language, text } = useLanguage();
  const avg = entry.pronScore;
  const metrics: Array<[string, number]> = [
    [text('Chính xác', 'Accuracy'), entry.accuracy],
    [text('Trôi chảy', 'Fluency'), entry.fluency],
  ];
  if (entry.completeness !== null) {
    metrics.push([text('Đầy đủ', 'Completeness'), entry.completeness]);
  }
  if (entry.prosody !== null) metrics.push([text('Ngữ điệu', 'Prosody'), entry.prosody]);
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
      <div className="flex-none text-xs text-slate-400">
        {relativeTime(entry.createdAt, language)}
      </div>
    </div>
  );
}

const CONSENT_KEY = 'pron_audio_consent';

export default function PronunciationTab() {
  const { language, text } = useLanguage();
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [isPlaying, setPlaying] = useState(false);
  const [result, setResult] = useState<PronunciationResponse | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Opt-in to donating the recording for tone-grading research (Round 26 Phase 0).
  // Off unless the learner previously turned it on.
  const [consent, setConsent] = useState(() => localStorage.getItem(CONSENT_KEY) === '1');
  const assess = useAssessPronunciation();
  const history = usePronunciationHistory();

  useEffect(() => {
    audioRef.current?.pause();
    setPlaying(false);
    if (!lastBlob || lastBlob.size === 0) {
      setPlaybackUrl(null);
      return;
    }

    const url = URL.createObjectURL(lastBlob);
    setPlaybackUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [lastBlob]);

  function toggleConsent(next: boolean) {
    setConsent(next);
    localStorage.setItem(CONSENT_KEY, next ? '1' : '0');
  }

  function submit() {
    if (!lastBlob) return;
    audioRef.current?.pause();
    setPlaying(false);
    setResult(null);
    assess.mutate(
      { blob: lastBlob, referenceText: REFERENCE, audioConsent: consent },
      { onSuccess: (data) => setResult(data) },
    );
  }

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !playbackUrl) return;
    if (isPlaying) {
      audio.pause();
      setPlaying(false);
      return;
    }

    audio.currentTime = 0;
    audio.play().catch(() => setPlaying(false));
  }

  return (
    <div className="scroll min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[880px] px-7 pb-20 pt-[30px]">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-violet-500">
            {text('Chấm điểm phát âm', 'Pronunciation assessment')}
          </div>
          <h2 className="mt-1 text-[26px] font-extrabold tracking-tight text-slate-900">
            {text('Đọc to câu này', 'Read this sentence aloud')}{' '}
            <span className="font-zh text-[22px] font-semibold text-slate-400">朗读</span>
          </h2>
          <p className="mt-1.5 text-[13.5px] text-slate-500">
            {text(
              'Bấm micro, đọc rõ từng chữ. Màu chữ là thanh điệu cần đọc. Sau khi chấm, bạn sẽ thấy điểm từng âm tiết và lỗi thanh điệu cần sửa.',
              'Tap the microphone and read each word clearly. Text colors show the target tones. After scoring, you will see per-syllable results and tones to improve.',
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <span className="inline-block rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-violet-600">
            HSK 2
          </span>
          <div className="mt-3">
            <Hanzi tokens={toZhTokens(REFERENCE)} size={40} />
          </div>
          <p className="mt-2 text-[14px] text-slate-500">
            {language === 'vi' ? REFERENCE_VI : REFERENCE_EN}
          </p>
        </div>

        <div className="my-7 flex flex-col items-center gap-4">
          <RecordButton
            onStart={() => {
              audioRef.current?.pause();
              setPlaying(false);
            }}
            onComplete={(blob) => {
              setLastBlob(blob);
              setResult(null);
              assess.reset();
            }}
            disabled={assess.isPending}
          />
          {lastBlob && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {playbackUrl && (
                <>
                  <audio
                    ref={audioRef}
                    src={playbackUrl}
                    preload="metadata"
                    onEnded={() => setPlaying(false)}
                    onPause={() => setPlaying(false)}
                    onPlay={() => setPlaying(true)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={togglePlayback}
                    aria-label={
                      isPlaying
                        ? text('Tạm dừng nghe lại', 'Pause playback')
                        : text('Nghe lại bản ghi', 'Play recording')
                    }
                    title={
                      isPlaying
                        ? text('Tạm dừng nghe lại', 'Pause playback')
                        : text('Nghe lại bản ghi', 'Play recording')
                    }
                    className="grid h-11 w-11 place-items-center rounded-full border border-violet-200 bg-white text-violet-600 shadow-sm transition hover:border-violet-300 hover:bg-violet-50"
                  >
                    <Icon name={isPlaying ? 'pause' : 'play'} size={18} />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={assess.isPending || lastBlob.size === 0}
                className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-accent transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {assess.isPending && <Spinner size={16} />}
                {assess.isPending
                  ? text('Đang chấm...', 'Scoring...')
                  : text('Gửi bản ghi', 'Submit recording')}
              </button>
            </div>
          )}
          {lastBlob?.size === 0 && (
            <p className="text-[13px] font-medium text-red-600">
              {text('Bản ghi rỗng. Vui lòng ghi âm lại.', 'The recording is empty. Please record again.')}
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
              {text(
                'Cho phép lưu bản ghi này để cải thiện chấm điểm thanh điệu. Bản ghi được giữ riêng tư, dùng cho nghiên cứu và tự động xoá sau một thời gian. Bạn có thể bỏ chọn bất cứ lúc nào.',
                'Allow this recording to be stored to improve tone scoring. It remains private, is used for research, and is automatically deleted after a limited period. You can opt out at any time.',
              )}
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
            {text('Lần thử gần đây', 'Recent attempts')}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-5">
            {history.isLoading && (
              <p className="py-4 text-sm text-slate-400">{text('Đang tải...', 'Loading...')}</p>
            )}
            {history.data?.length === 0 && (
              <p className="py-4 text-sm text-slate-400">
                {text('Chưa có lần thử nào.', 'No attempts yet.')}
              </p>
            )}
            {history.data?.map((entry) => <HistoryRow key={entry.id} entry={entry} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
