import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hanzi from '../../components/Hanzi';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useVoiceTurn } from '../../hooks/useVoiceTurn';
import { useLanguage, type Language } from '../../i18n/LanguageProvider';
import { toZhTokens } from '../../lib/zh';
import SyllableBreakdown, { toneTips } from '../pronunciation/SyllableBreakdown';
import type { MessageDto, VoiceTurnResponse } from '../../types/chat';

type VoicePhase = 'ready' | 'listening' | 'processing' | 'speaking';

interface VoiceChatProps {
  conversationId: string;
  conversationTitle: string;
  messages: MessageDto[];
  onClose: () => void;
}

const PHASE_LABEL: Record<VoicePhase, Record<Language, string>> = {
  ready: { vi: 'Đến lượt bạn', en: 'Your turn' },
  listening: { vi: 'Đang nghe...', en: 'Listening...' },
  processing: { vi: 'Đang phân tích câu nói...', en: 'Analyzing your speech...' },
  speaking: { vi: 'AI đang nói', en: 'AI is speaking' },
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
  const { language, text } = useLanguage();
  const words = turn.pronunciation.words.filter((word) => word.word.trim());
  const tips = toneTips(words, language);

  // Core, trustworthy criteria only: two pronunciation metrics measured from the
  // audio (accuracy folds tone in; fluency = smoothness) plus two conversation
  // metrics. We deliberately drop the overall PronScore headline (prosody drags it
  // down unreliably on short turns) and the redundant per-word re-average.
  const overall = Math.round(
    (turn.pronunciation.accuracy +
      turn.pronunciation.fluency +
      turn.contextScore +
      turn.grammarScore) /
      4,
  );

  return (
    <aside className="scroll w-full flex-none overflow-visible border-t border-slate-200 bg-slate-50/80 px-5 pb-20 pt-5 lg:h-full lg:w-[390px] lg:overflow-y-auto lg:border-l lg:border-t-0 lg:px-6 lg:py-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase text-slate-400">
            {text('Đánh giá lượt nói', 'Speaking assessment')}
          </div>
          <div className="mt-1 text-[14px] font-bold text-slate-900">
            {text('Kết quả mới nhất', 'Latest result')}
          </div>
        </div>
        <div className={'text-[30px] font-extrabold ' + scoreBand(overall)}>{overall}</div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Metric label={text('Chính xác', 'Accuracy')} value={turn.pronunciation.accuracy} />
        <Metric label={text('Trôi chảy', 'Fluency')} value={turn.pronunciation.fluency} />
        <Metric label={text('Ngữ cảnh', 'Context')} value={turn.contextScore} />
        <Metric label={text('Ngữ pháp', 'Grammar')} value={turn.grammarScore} />
      </div>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <div className="text-[11px] font-bold uppercase text-slate-400">
          {text('Nhận xét', 'Feedback')}
        </div>
        <p className="mt-2 text-[13px] font-medium leading-6 text-slate-700">{turn.feedback}</p>
      </div>

      {turn.suggestedReply && (
        <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
          <div className="text-[11px] font-bold uppercase text-violet-500">
            {text('Cách nói tự nhiên hơn', 'A more natural reply')}
          </div>
          <Hanzi
            tokens={toZhTokens(turn.suggestedReply)}
            className="mt-1 block text-[19px] text-slate-900"
          />
        </div>
      )}

      {words.length > 0 && (
        <div className="mt-5 border-t border-slate-200 pt-4">
          <div className="text-[11px] font-bold uppercase text-slate-400">
            {text('Từng âm tiết · thanh điệu', 'Syllables · tones')}
          </div>
          <div className="mt-3">
            <SyllableBreakdown words={words} />
          </div>
        </div>
      )}

      {tips.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-[11px] font-bold uppercase text-amber-600">
            {text('Âm tiết cần luyện thêm', 'Syllables to practice')}
          </div>
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

function TranscriptRow({
  message,
  replaying,
  onReplay,
}: {
  message: MessageDto;
  replaying: boolean;
  onReplay: (message: MessageDto) => void;
}) {
  const { text } = useLanguage();
  const isAssistant = message.role === 'assistant';
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase text-slate-400">
        <span className={isAssistant ? 'text-violet-500' : 'text-slate-500'}>
          {isAssistant ? text('Trợ giảng AI', 'AI Tutor') : text('Bạn', 'You')}
        </span>
        {message.audioUrl && (
          <button
            type="button"
            onClick={() => onReplay(message)}
            className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-white px-2 py-0.5 text-[11px] font-bold normal-case text-violet-600 transition hover:bg-violet-50"
          >
            <Icon name={replaying ? 'pause' : 'play'} size={12} />
            {replaying ? text('Đang phát', 'Playing') : text('Phát lại', 'Replay')}
          </button>
        )}
      </div>
      <div className={'rounded-xl px-3.5 py-2.5 ' + (isAssistant ? 'bg-violet-50' : 'bg-slate-100')}>
        <Hanzi tokens={toZhTokens(message.content)} className="block text-[18px] leading-[2]" />
      </div>
    </div>
  );
}

function TranscriptDrawer({
  messages,
  replayingId,
  onReplay,
  onClose,
}: {
  messages: MessageDto[];
  replayingId: string | null;
  onReplay: (message: MessageDto) => void;
  onClose: () => void;
}) {
  const { text } = useLanguage();
  const turns = useMemo(
    () => messages.filter((message) => message.role === 'user' || message.role === 'assistant'),
    [messages],
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex">
      <button
        type="button"
        onClick={onClose}
        aria-label={text('Đóng', 'Close')}
        className="absolute inset-0 bg-slate-900/30"
      />
      <aside className="animate-rise relative z-10 flex h-full w-full max-w-[440px] flex-col border-r border-slate-200 bg-white shadow-2xl">
        <header className="flex h-[64px] flex-none items-center justify-between border-b border-slate-200 px-5">
          <div className="text-[15px] font-extrabold text-slate-900">
            {text('Hội thoại trước đó', 'Conversation so far')}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100"
            aria-label={text('Đóng', 'Close')}
          >
            <Icon name="x" size={18} />
          </button>
        </header>
        <div className="scroll flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {turns.length === 0 ? (
            <p className="mt-6 text-center text-[13px] font-medium text-slate-400">
              {text('Chưa có lượt nói nào để phát lại.', 'No turns to replay yet.')}
            </p>
          ) : (
            turns.map((message) => (
              <TranscriptRow
                key={message.id}
                message={message}
                replaying={replayingId === message.id}
                onReplay={onReplay}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </aside>
    </div>
  );
}

export default function VoiceChat({ conversationId, conversationTitle, messages, onClose }: VoiceChatProps) {
  const { language, text } = useLanguage();
  const recorder = useAudioRecorder();
  const voiceTurn = useVoiceTurn(conversationId);
  const [phase, setPhase] = useState<VoicePhase>('ready');
  const [soundOn, setSoundOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [lastTurn, setLastTurn] = useState<VoiceTurnResponse | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const replayRef = useRef<HTMLAudioElement>(null);
  const autoStopRef = useRef<number | null>(null);
  const stopRecordingRef = useRef<() => Promise<void>>(async () => undefined);

  const latestAssistant = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant'),
    [messages],
  );
  // The AI line the on-screen "Nghe lại" button replays: the just-finished turn's
  // reply if we have one, otherwise the most recent assistant message in history.
  const replayableAssistant = lastTurn?.assistantMessage ?? latestAssistant;
  const activeText =
    phase === 'listening'
      ? '我在听。'
      : lastTurn?.assistantMessage.content ??
        latestAssistant?.content ??
        '你好，我们开始练习吧。你想先说什么？';

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
        replayRef.current?.pause();
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

  const stopReplay = useCallback(() => {
    replayRef.current?.pause();
    setReplayingId(null);
  }, []);

  // Replay a stored turn's audio. Uses a dedicated element so it never trips the
  // live phase machine; pauses any live AI playback first to avoid overlap.
  const replayMessage = useCallback(
    (message: MessageDto) => {
      const audio = replayRef.current;
      if (!audio || !message.audioUrl) return;
      if (replayingId === message.id) {
        stopReplay();
        return;
      }
      audioRef.current?.pause();
      if (phase === 'speaking') setPhase('ready');
      audio.src = message.audioUrl;
      setReplayingId(message.id);
      audio.play().catch(() => setReplayingId(null));
    },
    [phase, replayingId, stopReplay],
  );

  const stopRecording = useCallback(async () => {
    clearAutoStop();
    if (!recorder.isRecording) return;
    setPhase('processing');
    setLocalError(null);
    try {
      const blob = await recorder.stop();
      if (blob.size === 0) {
        throw new Error(
          text('Không thu được âm thanh. Vui lòng thử lại.', 'No audio was recorded. Please try again.'),
        );
      }
      const result = await voiceTurn.mutateAsync(blob);
      setLastTurn(result);
      await playAssistant(result);
    } catch (error) {
      setPhase('ready');
      setLocalError(
        error instanceof Error
          ? error.message
          : text('Không thể xử lý lượt nói.', 'Could not process your speech.'),
      );
    }
  }, [clearAutoStop, playAssistant, recorder, text, voiceTurn]);

  stopRecordingRef.current = stopRecording;

  async function startRecording() {
    if (phase !== 'ready') return;
    stopReplay();
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
    stopReplay();
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
      <audio
        ref={replayRef}
        onEnded={() => setReplayingId(null)}
        onError={() => setReplayingId(null)}
        preload="none"
      />

      <header className="flex h-[72px] flex-none items-center justify-between border-b border-slate-200 px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-violet-600 text-white shadow-accent">
            <Icon name="spark" size={20} />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[16px] font-extrabold">
              {text('Trợ giảng AI', 'AI Tutor')} · {conversationTitle}
            </div>
            <div className="mt-1 text-[12px] font-semibold text-slate-400">
              {PHASE_LABEL[phase][language]}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setTranscriptOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[12px] font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            <Icon name="chat" size={15} />
            {text('Hội thoại', 'Transcript')}
          </button>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {text('Giọng nói trực tiếp', 'Live voice')}
          </div>
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
              aria-label={
                phase === 'listening'
                  ? text('Dừng ghi âm', 'Stop recording')
                  : text('Bắt đầu ghi âm', 'Start recording')
              }
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
                  ? `${text('Đang ghi âm', 'Recording')} 0:${elapsed.toString().padStart(2, '0')}`
                  : PHASE_LABEL[phase][language]}
              </div>
              <Hanzi
                tokens={toZhTokens(activeText)}
                className="mt-3 block text-[25px] font-medium leading-[2.2] sm:text-[30px]"
              />
              {lastTurn && phase !== 'listening' && (
                <div className="mt-2 text-[13px] font-semibold text-slate-400">
                  {text('Bạn nói', 'You said')}:{' '}
                  <span className="font-zh text-slate-600">{lastTurn.userMessage.content}</span>
                </div>
              )}
              {replayableAssistant?.audioUrl && phase !== 'listening' && phase !== 'processing' && (
                <button
                  type="button"
                  onClick={() => replayMessage(replayableAssistant)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-[13px] font-bold text-violet-600 transition hover:bg-violet-50"
                >
                  <Icon name={replayingId === replayableAssistant.id ? 'pause' : 'volume'} size={16} />
                  {replayingId === replayableAssistant.id
                    ? text('Đang phát lại...', 'Replaying...')
                    : text('Nghe lại lời AI', 'Replay AI line')}
                </button>
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
              data-tip={
                soundOn ? text('Tắt âm thanh', 'Mute') : text('Bật âm thanh', 'Turn sound on')
              }
            >
              <span className="grid h-12 w-12 place-items-center rounded-full border border-slate-200 bg-white transition hover:bg-slate-50">
                <Icon name={soundOn ? 'volume' : 'mute'} size={20} />
              </span>
              {text('Âm thanh', 'Sound')}
            </button>
            <button
              type="button"
              onClick={endCall}
              className="flex w-16 flex-col items-center gap-2 text-[12px] font-bold text-red-600"
            >
              <span className="grid h-16 w-16 place-items-center rounded-full bg-red-600 text-white shadow-[0_12px_28px_-10px_rgba(220,38,38,.55)] transition hover:bg-red-700">
                <Icon name="phoneOff" size={25} />
              </span>
              {text('Kết thúc', 'End')}
            </button>
            <button
              type="button"
              onClick={endCall}
              className="tip flex w-16 flex-col items-center gap-2 text-[12px] font-bold text-slate-500"
              data-tip={text('Chuyển sang nhập văn bản', 'Switch to text input')}
            >
              <span className="grid h-12 w-12 place-items-center rounded-full border border-slate-200 bg-white transition hover:bg-slate-50">
                <Icon name="keyboard" size={20} />
              </span>
              {text('Nhập chữ', 'Type')}
            </button>
          </div>
        </main>

        {lastTurn && <TurnAssessment turn={lastTurn} />}
      </div>

      {transcriptOpen && (
        <TranscriptDrawer
          messages={messages}
          replayingId={replayingId}
          onReplay={replayMessage}
          onClose={() => {
            stopReplay();
            setTranscriptOpen(false);
          }}
        />
      )}
    </div>
  );
}
