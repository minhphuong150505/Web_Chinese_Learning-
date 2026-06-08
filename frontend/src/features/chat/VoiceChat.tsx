import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hanzi from '../../components/Hanzi';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useVoiceTurn } from '../../hooks/useVoiceTurn';
import { toZhTokens } from '../../lib/zh';
import SyllableBreakdown, { toneTips } from '../pronunciation/SyllableBreakdown';
import type { MessageDto, VoiceTurnResponse } from '../../types/chat';

type VoicePhase = 'ready' | 'listening' | 'processing' | 'speaking';

interface VoiceChatProps {
  conversationId: string;
  messages: MessageDto[];
  onClose: () => void;
}

const PHASE_LABEL: Record<VoicePhase, string> = {
  ready: 'Đến lượt bạn',
  listening: 'Đang nghe...',
  processing: 'Đang phân tích câu nói...',
  speaking: 'AI đang nói',
};

function scoreBand(score: number) {
  if (score >= 85) return 'text-emerald-600';
  if (score >= 65) return 'text-amber-600';
  return 'text-red-600';
}

function Metric({ label, value }: { label: string; value: number }) {
  const rounded = Math.round(value);
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-3">
      <div className="truncate text-[11px] font-bold uppercase text-slate-400">{label}</div>
      <div className={'mt-1 text-[24px] font-extrabold ' + scoreBand(rounded)}>{rounded}</div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={
            'h-full rounded-full ' +
            (rounded >= 85 ? 'bg-emerald-500' : rounded >= 65 ? 'bg-amber-500' : 'bg-red-500')
          }
          style={{ width: `${Math.max(3, rounded)}%` }}
        />
      </div>
    </div>
  );
}

function TurnAssessment({ turn }: { turn: VoiceTurnResponse }) {
  const words = turn.pronunciation.words.filter((word) => word.word.trim());
  const wordAverage =
    words.length > 0
      ? words.reduce((sum, word) => sum + word.accuracyScore, 0) / words.length
      : turn.pronunciation.accuracy;
  const tips = toneTips(words);

  return (
    <aside className="scroll w-full flex-none overflow-visible border-t border-slate-200 bg-slate-50/80 px-5 pb-20 pt-5 lg:h-full lg:w-[390px] lg:overflow-y-auto lg:border-l lg:border-t-0 lg:px-6 lg:py-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase text-slate-400">Đánh giá lượt nói</div>
          <div className="mt-1 text-[14px] font-bold text-slate-900">Kết quả mới nhất</div>
        </div>
        <div className={'text-[30px] font-extrabold ' + scoreBand(turn.pronunciation.pronScore)}>
          {Math.round(turn.pronunciation.pronScore)}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Metric label="Phát âm" value={turn.pronunciation.pronScore} />
        <Metric label="Ngữ cảnh" value={turn.contextScore} />
        <Metric label="Chính xác" value={turn.pronunciation.accuracy} />
        <Metric label="Trôi chảy" value={turn.pronunciation.fluency} />
        <Metric label="Ngữ pháp" value={turn.grammarScore} />
        <Metric label="Từng từ" value={wordAverage} />
      </div>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <div className="text-[11px] font-bold uppercase text-slate-400">Nhận xét</div>
        <p className="mt-2 text-[13px] font-medium leading-6 text-slate-700">{turn.feedback}</p>
      </div>

      {turn.suggestedReply && (
        <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
          <div className="text-[11px] font-bold uppercase text-violet-500">Cách nói tự nhiên hơn</div>
          <Hanzi
            tokens={toZhTokens(turn.suggestedReply)}
            className="mt-1 block text-[19px] text-slate-900"
          />
        </div>
      )}

      {words.length > 0 && (
        <div className="mt-5 border-t border-slate-200 pt-4">
          <div className="text-[11px] font-bold uppercase text-slate-400">
            Từng âm tiết · thanh điệu
          </div>
          <div className="mt-3">
            <SyllableBreakdown words={words} />
          </div>
        </div>
      )}

      {tips.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-[11px] font-bold uppercase text-amber-600">Âm tiết cần luyện thêm</div>
          <ul className="mt-1.5 space-y-1 text-[12.5px] font-medium leading-5 text-amber-900">
            {tips.map((tip, index) => (
              <li key={index}>• {tip}</li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

export default function VoiceChat({ conversationId, messages, onClose }: VoiceChatProps) {
  const recorder = useAudioRecorder();
  const voiceTurn = useVoiceTurn(conversationId);
  const [phase, setPhase] = useState<VoicePhase>('ready');
  const [soundOn, setSoundOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [lastTurn, setLastTurn] = useState<VoiceTurnResponse | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const autoStopRef = useRef<number | null>(null);
  const stopRecordingRef = useRef<() => Promise<void>>(async () => undefined);

  const latestAssistant = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant'),
    [messages],
  );
  const activeText =
    phase === 'listening'
      ? '我在听。'
      : lastTurn?.assistantMessage.content ??
        latestAssistant?.content ??
        '你好，欢迎光临！你想吃点什么？';

  const clearAutoStop = useCallback(() => {
    if (autoStopRef.current !== null) {
      window.clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (phase !== 'listening') return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!soundOn) {
      audio.pause();
      if (phase === 'speaking') setPhase('ready');
    }
  }, [phase, soundOn]);

  useEffect(
    () => {
      const previousBodyOverflow = document.body.style.overflow;
      const previousHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      return () => {
        clearAutoStop();
        audioRef.current?.pause();
        document.body.style.overflow = previousBodyOverflow;
        document.documentElement.style.overflow = previousHtmlOverflow;
      };
    },
    [clearAutoStop],
  );

  const playAssistant = useCallback(
    async (turn: VoiceTurnResponse) => {
      const audio = audioRef.current;
      if (!soundOn || !audio || !turn.assistantMessage.audioUrl) {
        setPhase('ready');
        return;
      }
      audio.src = turn.assistantMessage.audioUrl;
      setPhase('speaking');
      try {
        await audio.play();
      } catch {
        setPhase('ready');
      }
    },
    [soundOn],
  );

  const stopRecording = useCallback(async () => {
    clearAutoStop();
    if (!recorder.isRecording) return;
    setPhase('processing');
    setLocalError(null);
    try {
      const blob = await recorder.stop();
      if (blob.size === 0) throw new Error('Không thu được âm thanh. Vui lòng thử lại.');
      const result = await voiceTurn.mutateAsync(blob);
      setLastTurn(result);
      await playAssistant(result);
    } catch (error) {
      setPhase('ready');
      setLocalError(error instanceof Error ? error.message : 'Không thể xử lý lượt nói.');
    }
  }, [clearAutoStop, playAssistant, recorder, voiceTurn]);

  stopRecordingRef.current = stopRecording;

  async function startRecording() {
    if (phase !== 'ready') return;
    setLocalError(null);
    setElapsed(0);
    try {
      await recorder.start();
      setPhase('listening');
      autoStopRef.current = window.setTimeout(() => {
        void stopRecordingRef.current();
      }, 25_000);
    } catch {
      setPhase('ready');
    }
  }

  async function endCall() {
    clearAutoStop();
    if (recorder.isRecording) {
      try {
        await recorder.stop();
      } catch {
        // The call is ending; recorder cleanup is best-effort.
      }
    }
    audioRef.current?.pause();
    onClose();
  }

  function toggleSound() {
    setSoundOn((value) => !value);
  }

  const displayError = localError ?? recorder.error;

  return (
    <div className="fixed inset-0 z-[70] flex min-h-0 flex-col bg-white text-slate-900">
      <audio
        ref={audioRef}
        onEnded={() => setPhase('ready')}
        onError={() => setPhase('ready')}
        preload="auto"
      />

      <header className="flex h-[72px] flex-none items-center justify-between border-b border-slate-200 px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-violet-600 text-white shadow-accent">
            <Icon name="spark" size={20} />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[16px] font-extrabold">AI Tutor · 点菜</div>
            <div className="mt-1 text-[12px] font-semibold text-slate-400">{PHASE_LABEL[phase]}</div>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Live voice
        </div>
      </header>

      <div className="scroll flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden lg:flex-row lg:overflow-hidden">
        <main className="relative flex min-h-[520px] min-w-0 flex-none flex-col items-center justify-center overflow-hidden px-5 py-8 lg:min-h-0 lg:flex-1">
          <div className="flex w-full max-w-[760px] flex-1 flex-col items-center justify-center">
            <button
              type="button"
              onClick={phase === 'listening' ? stopRecording : startRecording}
              disabled={phase === 'processing' || phase === 'speaking'}
              className={
                'voice-orbit relative grid h-[180px] w-[180px] flex-none place-items-center rounded-full border transition sm:h-[220px] sm:w-[220px] ' +
                (phase === 'listening'
                  ? 'border-red-200 bg-red-50 text-red-600'
                  : phase === 'speaking'
                    ? 'border-violet-200 bg-violet-50 text-violet-600'
                    : 'border-violet-200 bg-white text-violet-600 hover:bg-violet-50') +
                ' disabled:cursor-wait'
              }
              aria-label={phase === 'listening' ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
            >
              <span
                className={
                  'grid h-[92px] w-[92px] place-items-center rounded-full text-white shadow-accent sm:h-[108px] sm:w-[108px] ' +
                  (phase === 'listening' ? 'bg-red-500' : 'bg-violet-600')
                }
              >
                {phase === 'processing' ? (
                  <Spinner size={34} />
                ) : (
                  <Icon
                    name={phase === 'listening' ? 'square' : phase === 'speaking' ? 'wave' : 'mic'}
                    size={36}
                  />
                )}
              </span>
            </button>

            <div className="mt-7 min-h-[116px] max-w-[720px] text-center">
              <div className="text-[12px] font-bold uppercase text-slate-400">
                {phase === 'listening'
                  ? `Đang ghi âm 0:${elapsed.toString().padStart(2, '0')}`
                  : PHASE_LABEL[phase]}
              </div>
              <Hanzi
                tokens={toZhTokens(activeText)}
                className="mt-3 block text-[25px] font-medium leading-[2.2] sm:text-[30px]"
              />
              {lastTurn && phase !== 'listening' && (
                <div className="mt-2 text-[13px] font-semibold text-slate-400">
                  Bạn nói: <span className="font-zh text-slate-600">{lastTurn.userMessage.content}</span>
                </div>
              )}
            </div>

            {displayError && (
              <div className="mt-3 max-w-[560px] rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-center text-[13px] font-semibold text-red-700">
                {displayError}
              </div>
            )}
          </div>

          <div className="flex flex-none items-end justify-center gap-10 pt-5">
            <button
              type="button"
              onClick={toggleSound}
              className="tip flex w-16 flex-col items-center gap-2 text-[12px] font-bold text-slate-500"
              data-tip={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              <span className="grid h-12 w-12 place-items-center rounded-full border border-slate-200 bg-white transition hover:bg-slate-50">
                <Icon name={soundOn ? 'volume' : 'mute'} size={20} />
              </span>
              Sound
            </button>
            <button
              type="button"
              onClick={endCall}
              className="flex w-16 flex-col items-center gap-2 text-[12px] font-bold text-red-600"
            >
              <span className="grid h-16 w-16 place-items-center rounded-full bg-red-600 text-white shadow-[0_12px_28px_-10px_rgba(220,38,38,.55)] transition hover:bg-red-700">
                <Icon name="phoneOff" size={25} />
              </span>
              End
            </button>
            <button
              type="button"
              onClick={endCall}
              className="tip flex w-16 flex-col items-center gap-2 text-[12px] font-bold text-slate-500"
              data-tip="Chuyển sang nhập văn bản"
            >
              <span className="grid h-12 w-12 place-items-center rounded-full border border-slate-200 bg-white transition hover:bg-slate-50">
                <Icon name="keyboard" size={20} />
              </span>
              Type
            </button>
          </div>
        </main>

        {lastTurn && <TurnAssessment turn={lastTurn} />}
      </div>
    </div>
  );
}
