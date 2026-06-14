import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import HskBadge from '../../components/HskBadge';
import { useConversation } from '../../hooks/useConversation';
import { useSendMessage } from '../../hooks/useSendMessage';
import { useLanguage, type Language } from '../../i18n/LanguageProvider';
import { CONVERSATION_TOPICS, SPEAKING_MOCK_TESTS, type ConversationPracticeTopic } from '../../lib/content';
import HskLessonPicker from '../hsk/components/HskLessonPicker';
import { lessonConversationRequest, type HskPracticeLesson } from '../hsk/lib/practiceTree';
import type { CreateConversationRequest } from '../../types/chat';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import VoiceChat from './VoiceChat';

function topicTitle(topic: ConversationPracticeTopic, language: Language) {
  return language === 'vi' ? topic.titleVi : topic.title;
}

function savedConversationTitle(title: string, language: Language) {
  const topic = CONVERSATION_TOPICS.find((item) => [item.title, item.titleVi].includes(title));
  return topic ? topicTitle(topic, language) : title;
}

/** HSK level encoded in a saved conversation title ("HSK 3 · ...") for filtering. */
function titleHskLevel(title: string): number | null {
  const match = /HSK\s*([1-6])/i.exec(title);
  return match ? Number(match[1]) : null;
}

interface ConversationSetupProps {
  pending: boolean;
  error?: string;
  onCreate: (req: CreateConversationRequest) => void;
  onCancel?: () => void;
}

type SetupMode = 'hsk' | 'custom' | 'mock';

function ConversationSetup({ pending, error, onCreate, onCancel }: ConversationSetupProps) {
  const { language, text } = useLanguage();
  const [mode, setMode] = useState<SetupMode>('hsk');
  const [lesson, setLesson] = useState<HskPracticeLesson | null>(null);
  const [mockId, setMockId] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customScenario, setCustomScenario] = useState('');

  function submit() {
    if (mode === 'hsk') {
      if (lesson) onCreate(lessonConversationRequest(lesson));
      return;
    }
    if (mode === 'mock') {
      const test = SPEAKING_MOCK_TESTS.find((item) => item.id === mockId);
      if (test) {
        onCreate({
          topicTitle: language === 'vi' ? test.titleVi : test.title,
          scenario: test.scenario,
          hskLevel: test.hskLevel,
        });
      }
      return;
    }
    const title = customTitle.trim();
    const scenario = customScenario.trim();
    if (title && scenario) onCreate({ topicTitle: title, scenario });
  }

  const ready =
    mode === 'hsk'
      ? !!lesson
      : mode === 'mock'
        ? !!mockId
        : customTitle.trim().length > 0 && customScenario.trim().length > 0;

  const footerNote =
    mode === 'hsk'
      ? text('Luyện nói bám sát bài học HSK', 'Speaking practice tied to an HSK lesson')
      : mode === 'mock'
        ? text('Thi thử nói theo định dạng HSKK', 'HSKK-format speaking mock test')
        : text('Hội thoại theo ngữ cảnh riêng', 'Conversation from your own context');

  const TAB: Array<{ id: SetupMode; labelVi: string; labelEn: string; icon: 'book' | 'spark' | 'cards' }> = [
    { id: 'hsk', labelVi: 'Theo bài HSK', labelEn: 'HSK lessons', icon: 'book' },
    { id: 'custom', labelVi: 'Tự tạo', labelEn: 'Custom', icon: 'spark' },
    { id: 'mock', labelVi: 'Đề thi thử', labelEn: 'Mock test', icon: 'cards' },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-violet-500">
            {text('Hội thoại mới', 'New conversation')}
          </div>
          <h3 className="mt-1 text-[20px] font-extrabold text-slate-900">
            {text('Chọn cách luyện nói', 'Choose how to practice speaking')}
          </h3>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            aria-label={text('Đóng', 'Close')}
          >
            <Icon name="x" size={16} />
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 rounded-xl bg-slate-100 p-1">
        {TAB.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setMode(item.id)}
            aria-pressed={mode === item.id}
            className={
              'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg text-[13px] font-bold transition ' +
              (mode === item.id ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')
            }
          >
            <Icon name={item.icon} size={14} />
            {language === 'vi' ? item.labelVi : item.labelEn}
          </button>
        ))}
      </div>

      {mode === 'hsk' && (
        <div className="mt-4">
          <p className="mb-2 text-[12.5px] text-slate-500">
            {text(
              'Chọn một bài trong giáo trình HSK. AI sẽ đóng vai giám khảo và giữ đúng từ vựng của cấp đó.',
              'Pick an HSK lesson. The AI plays examiner and stays within that level’s vocabulary.',
            )}
          </p>
          <HskLessonPicker selectedLessonId={lesson?.id ?? null} onSelectLesson={setLesson} />
          {lesson && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2.5">
              <HskBadge level={lesson.level} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-700">
                {text('Bài', 'Lesson')} {lesson.no} · <span className="font-zh">{lesson.zh}</span> · {lesson.titleVi}
              </span>
            </div>
          )}
        </div>
      )}

      {mode === 'mock' && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {SPEAKING_MOCK_TESTS.map((test) => {
            const active = test.id === mockId;
            return (
              <button
                key={test.id}
                type="button"
                onClick={() => setMockId(test.id)}
                className={
                  'rounded-xl border px-3.5 py-3 text-left transition ' +
                  (active
                    ? 'border-violet-400 bg-violet-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/50')
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13.5px] font-extrabold text-slate-900">
                    {language === 'vi' ? test.titleVi : test.title}
                  </span>
                  <HskBadge level={test.hskLevel} label={test.level} />
                </div>
                <div className="mt-1 text-[12px] text-slate-500">
                  <span className="font-zh font-semibold text-slate-600">{test.part}</span> ·{' '}
                  {language === 'vi' ? test.partVi : test.part}
                </div>
                <div className="mt-1 text-[11.5px] leading-4 text-slate-400">
                  {language === 'vi' ? test.scenarioVi : test.scenario}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {mode === 'custom' && (
        <div className="mt-4 space-y-4 rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
          <div>
            <label
              htmlFor="custom-conversation-title"
              className="text-[12px] font-bold uppercase tracking-wide text-slate-500"
            >
              {text('Tên cuộc hội thoại', 'Conversation name')}
            </label>
            <input
              id="custom-conversation-title"
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              maxLength={80}
              autoFocus
              placeholder={text('Ví dụ: Gặp đối tác tại hội chợ', 'Example: Meeting a partner at a trade fair')}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
            <div className="mt-1 text-right text-[11px] font-semibold text-slate-400">{customTitle.length}/80</div>
          </div>

          <div>
            <label
              htmlFor="custom-conversation-scenario"
              className="text-[12px] font-bold uppercase tracking-wide text-slate-500"
            >
              {text('Mô tả chi tiết', 'Detailed description')}
            </label>
            <textarea
              id="custom-conversation-scenario"
              value={customScenario}
              onChange={(e) => setCustomScenario(e.target.value)}
              maxLength={1200}
              rows={6}
              placeholder={text(
                'Mô tả vai của AI và người học, địa điểm, mục tiêu luyện tập, tình huống và từ vựng muốn sử dụng...',
                'Describe the AI and learner roles, setting, practice goal, situation, and useful vocabulary...',
              )}
              className="scroll mt-2 min-h-[148px] w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
            <div className="mt-1 flex items-center justify-between gap-3 text-[11px] font-semibold text-slate-400">
              <span>
                {text(
                  'LLM sẽ dùng mô tả này làm ngữ cảnh xuyên suốt.',
                  'The LLM will use this context throughout the conversation.',
                )}
              </span>
              <span className="flex-none">{customScenario.length}/1200</span>
            </div>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-[12px] font-semibold text-red-600">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[12px] font-semibold text-slate-400">{footerNote}</div>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !ready}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-violet-600 px-4 text-[13px] font-bold text-white shadow-accent transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? <Spinner size={15} /> : <Icon name="spark" size={15} />}
          {text('Tạo hội thoại', 'Create conversation')}
        </button>
      </div>
    </div>
  );
}

export default function ChatTab() {
  const { language, text } = useLanguage();
  const [soundOn, setSoundOn] = useState(true);
  const [voiceChatOpen, setVoiceChatOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const [autoPlayMessageId, setAutoPlayMessageId] = useState<string | null>(null);
  const soundOnRef = useRef(soundOn);
  const {
    conversations,
    selectedConversation,
    conversationId,
    setConversationId,
    createConversation,
    messages,
    isLoading,
  } = useConversation();
  const clearAutoPlayMessage = useCallback(() => setAutoPlayMessageId(null), []);
  const sendMessage = useSendMessage(conversationId, {
    onAssistantMessage: (message) => {
      setAutoPlayMessageId(soundOnRef.current && message.audioUrl ? message.id : null);
    },
  });
  const selectedTopic = useMemo(
    () =>
      CONVERSATION_TOPICS.find((topic) =>
        [topic.title, topic.titleVi].some(
          (title) =>
            selectedConversation?.title.localeCompare(title, undefined, {
              sensitivity: 'accent',
            }) === 0,
        ),
      ),
    [selectedConversation?.title],
  );
  const selectedConversationTitle = selectedTopic
    ? topicTitle(selectedTopic, language)
    : selectedConversation?.title;
  const selectedConversationLevel = selectedConversation
    ? titleHskLevel(selectedConversation.title)
    : null;

  const availableLevels = useMemo(() => {
    const levels = new Set<number>();
    conversations.forEach((conversation) => {
      const level = titleHskLevel(conversation.title);
      if (level) levels.add(level);
    });
    return [...levels].sort((a, b) => a - b);
  }, [conversations]);
  const visibleConversations = useMemo(
    () =>
      levelFilter === null
        ? conversations
        : conversations.filter((conversation) => titleHskLevel(conversation.title) === levelFilter),
    [conversations, levelFilter],
  );

  function createPractice(req: CreateConversationRequest) {
    createConversation.mutate(req, { onSuccess: () => setSetupOpen(false) });
  }

  useEffect(() => {
    soundOnRef.current = soundOn;
    if (!soundOn) {
      setAutoPlayMessageId(null);
    }
  }, [soundOn]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[980px] flex-none flex-col gap-4 px-7 py-[18px]">
        <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-violet-500">
            {text('Luyện hội thoại', 'Conversation practice')}
          </div>
          <h2 className="mt-1 flex items-center gap-2 text-[26px] font-extrabold tracking-tight text-slate-900">
            {selectedConversationTitle ?? text('Chọn bài luyện tập', 'Choose a practice')}
            {selectedConversationLevel && <HskBadge level={selectedConversationLevel} />}
            <span className="font-zh text-[22px] font-semibold text-slate-400">练习</span>
          </h2>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              createConversation.reset();
              setSetupOpen(true);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-violet-200 bg-white px-4 text-[13px] font-bold text-violet-700 transition hover:bg-violet-50"
          >
            <Icon name="spark" size={16} />
            {text('Bài luyện mới', 'New practice')}
          </button>
          <button
            type="button"
            onClick={() => setVoiceChatOpen(true)}
            disabled={!conversationId || isLoading}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-violet-600 px-4 text-[13px] font-bold text-white shadow-accent transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="phone" size={17} />
            {text('Hội thoại giọng nói', 'Voice chat')}
          </button>
          <button
            type="button"
            onClick={() => setSoundOn((v) => !v)}
            className="tip grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            data-tip={soundOn ? text('Đang bật âm thanh', 'Sound on') : text('Đã tắt âm thanh', 'Sound off')}
          >
            <Icon name={soundOn ? 'volume' : 'mute'} size={18} />
          </button>
        </div>
        </div>
        {conversations.length > 0 && (
          <div className="flex flex-col gap-2">
            {availableLevels.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {text('Lọc cấp', 'Filter')}
                </span>
                <button
                  type="button"
                  onClick={() => setLevelFilter(null)}
                  className={
                    'h-7 rounded-full border px-3 text-[11.5px] font-bold transition ' +
                    (levelFilter === null
                      ? 'border-violet-500 bg-violet-600 text-white'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-violet-200')
                  }
                >
                  {text('Tất cả', 'All')}
                </button>
                {availableLevels.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setLevelFilter(level)}
                    className={
                      'h-7 rounded-full border px-3 text-[11.5px] font-bold transition ' +
                      (levelFilter === level
                        ? 'border-violet-500 bg-violet-600 text-white'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-violet-200')
                    }
                  >
                    HSK {level}
                  </button>
                ))}
              </div>
            )}
            <div className="scroll flex gap-2 overflow-x-auto pb-1">
              {visibleConversations.map((conversation) => {
                const level = titleHskLevel(conversation.title);
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setConversationId(conversation.id)}
                    className={
                      'flex h-9 max-w-[230px] flex-none items-center gap-1.5 truncate rounded-full border px-3.5 text-[12.5px] font-bold transition ' +
                      (conversation.id === conversationId
                        ? 'border-violet-500 bg-violet-600 text-white shadow-accent'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50')
                    }
                  >
                    {level && (
                      <span className="flex-none rounded-full bg-white/25 px-1.5 text-[10px] font-extrabold">
                        H{level}
                      </span>
                    )}
                    <span className="truncate">{savedConversationTitle(conversation.title, language)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid flex-1 place-items-center text-slate-400">
          <Spinner size={28} />
        </div>
      ) : !conversationId ? (
        <div className="scroll flex-1 overflow-y-auto px-7 pb-10">
          <div className="mx-auto max-w-[980px] pt-3">
            <ConversationSetup
              pending={createConversation.isPending}
              error={createConversation.isError ? createConversation.error.message : undefined}
              onCreate={createPractice}
            />
          </div>
        </div>
      ) : (
        <>
          <MessageList
            messages={messages}
            conversationTitle={
              selectedConversationTitle ?? text('Luyện hội thoại', 'Conversation practice')
            }
            soundOn={soundOn}
            pending={sendMessage.isPending}
            autoPlayMessageId={autoPlayMessageId}
            onAudioAutoPlayAttempt={clearAutoPlayMessage}
          />
          <MessageComposer
            onSend={(content) => sendMessage.mutate(content)}
            pending={sendMessage.isPending}
            suggestions={selectedTopic?.suggestions ?? []}
          />
        </>
      )}
      {setupOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/35 px-4 py-6">
          <div className="scroll max-h-full w-full max-w-[860px] overflow-y-auto">
            <ConversationSetup
              pending={createConversation.isPending}
              error={createConversation.isError ? createConversation.error.message : undefined}
              onCreate={createPractice}
              onCancel={() => {
                createConversation.reset();
                setSetupOpen(false);
              }}
            />
          </div>
        </div>
      )}
      {voiceChatOpen && conversationId && (
        <VoiceChat
          conversationId={conversationId}
          conversationTitle={
            selectedConversationTitle ?? text('Luyện hội thoại', 'Conversation practice')
          }
          messages={messages}
          onClose={() => setVoiceChatOpen(false)}
        />
      )}
    </div>
  );
}
