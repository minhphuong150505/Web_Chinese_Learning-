import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import { useConversation } from '../../hooks/useConversation';
import { useSendMessage } from '../../hooks/useSendMessage';
import { useLanguage, type Language } from '../../i18n/LanguageProvider';
import { CONVERSATION_TOPICS, type ConversationPracticeTopic } from '../../lib/content';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import VoiceChat from './VoiceChat';

const DEFAULT_TOPIC = CONVERSATION_TOPICS[0] as ConversationPracticeTopic;

function topicTitle(topic: ConversationPracticeTopic, language: Language) {
  return language === 'vi' ? topic.titleVi : topic.title;
}

function topicScenario(topic: ConversationPracticeTopic, language: Language) {
  return language === 'vi' ? topic.scenarioVi : topic.scenario;
}

function savedConversationTitle(title: string, language: Language) {
  const topic = CONVERSATION_TOPICS.find((item) => [item.title, item.titleVi].includes(title));
  return topic ? topicTitle(topic, language) : title;
}

interface ConversationSetupProps {
  pending: boolean;
  onCreate: (topic: ConversationPracticeTopic, scenario: string) => void;
  onCancel?: () => void;
}

function ConversationSetup({ pending, onCreate, onCancel }: ConversationSetupProps) {
  const { language, text } = useLanguage();
  const [topicId, setTopicId] = useState(DEFAULT_TOPIC.id);
  const selectedTopic = CONVERSATION_TOPICS.find((topic) => topic.id === topicId) ?? DEFAULT_TOPIC;
  const [scenario, setScenario] = useState(() => topicScenario(selectedTopic, language));

  function selectTopic(topic: ConversationPracticeTopic) {
    setTopicId(topic.id);
    setScenario(topicScenario(topic, language));
  }

  function submit() {
    const value = scenario.trim() || topicScenario(selectedTopic, language);
    onCreate(selectedTopic, value);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-violet-500">
            {text('Hội thoại mới', 'New conversation')}
          </div>
          <h3 className="mt-1 text-[20px] font-extrabold text-slate-900">
            {text('Chọn chủ đề và nhập bối cảnh', 'Choose a topic and enter a scenario')}
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

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {CONVERSATION_TOPICS.map((topic) => {
          const active = topic.id === topicId;
          return (
            <button
              key={topic.id}
              type="button"
              onClick={() => selectTopic(topic)}
              className={
                'min-h-[78px] rounded-xl border px-3.5 py-3 text-left transition ' +
                (active
                  ? 'border-violet-400 bg-violet-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/50')
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13.5px] font-extrabold text-slate-900">
                  {topicTitle(topic, language)}
                </span>
                <span className="flex-none rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                  {topic.level}
                </span>
              </div>
              <div className="mt-1 font-zh text-[18px] font-semibold text-slate-500">{topic.zh}</div>
            </button>
          );
        })}
      </div>

      <label className="mt-4 block">
        <span className="text-[12px] font-bold uppercase tracking-wide text-slate-400">
          {text('Nội dung hội thoại', 'Conversation scenario')}
        </span>
        <textarea
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          maxLength={1200}
          rows={4}
          className="scroll mt-2 min-h-[116px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] leading-6 text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[12px] font-semibold text-slate-400">
          HSK 2-3 · {text('Bối cảnh nhập vai', 'Role-play context')}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-violet-600 px-4 text-[13px] font-bold text-white shadow-accent transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60"
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

  function createPractice(topic: ConversationPracticeTopic, scenario: string) {
    createConversation.mutate(
      { topicTitle: topic.title, scenario },
      { onSuccess: () => setSetupOpen(false) },
    );
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
          <h2 className="mt-1 text-[26px] font-extrabold tracking-tight text-slate-900">
            {selectedConversationTitle ?? text('Chọn bài luyện tập', 'Choose a practice')}
            <span className="ml-2 font-zh text-[22px] font-semibold text-slate-400">练习</span>
          </h2>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSetupOpen(true)}
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
          <div className="scroll flex gap-2 overflow-x-auto pb-1">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setConversationId(conversation.id)}
                className={
                  'h-9 max-w-[210px] flex-none truncate rounded-full border px-3.5 text-[12.5px] font-bold transition ' +
                  (conversation.id === conversationId
                    ? 'border-violet-500 bg-violet-600 text-white shadow-accent'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50')
                }
              >
                {savedConversationTitle(conversation.title, language)}
              </button>
            ))}
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
            <ConversationSetup pending={createConversation.isPending} onCreate={createPractice} />
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
              onCreate={createPractice}
              onCancel={() => setSetupOpen(false)}
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
