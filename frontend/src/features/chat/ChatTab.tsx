import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import { useConversation } from '../../hooks/useConversation';
import { useSendMessage } from '../../hooks/useSendMessage';
import { CHAT_SUGGESTIONS } from '../../lib/content';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import VoiceChat from './VoiceChat';

export default function ChatTab() {
  const [soundOn, setSoundOn] = useState(true);
  const [voiceChatOpen, setVoiceChatOpen] = useState(false);
  const [autoPlayMessageId, setAutoPlayMessageId] = useState<string | null>(null);
  const soundOnRef = useRef(soundOn);
  const { conversationId, messages, isLoading } = useConversation();
  const clearAutoPlayMessage = useCallback(() => setAutoPlayMessageId(null), []);
  const sendMessage = useSendMessage(conversationId, {
    onAssistantMessage: (message) => {
      setAutoPlayMessageId(soundOnRef.current && message.audioUrl ? message.id : null);
    },
  });

  useEffect(() => {
    soundOnRef.current = soundOn;
    if (!soundOn) {
      setAutoPlayMessageId(null);
    }
  }, [soundOn]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[920px] flex-none items-end justify-between px-7 py-[22px]">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-violet-500">
            Conversation practice
          </div>
          <h2 className="mt-1 text-[26px] font-extrabold tracking-tight text-slate-900">
            Ordering food <span className="font-zh text-[22px] font-semibold text-slate-400">点菜</span>
          </h2>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setVoiceChatOpen(true)}
            disabled={!conversationId || isLoading}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-violet-600 px-4 text-[13px] font-bold text-white shadow-accent transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="phone" size={17} />
            Voice chat
          </button>
          <button
            type="button"
            onClick={() => setSoundOn((v) => !v)}
            className="tip grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            data-tip={soundOn ? 'Sound on' : 'Sound off'}
          >
            <Icon name={soundOn ? 'volume' : 'mute'} size={18} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid flex-1 place-items-center text-slate-400">
          <Spinner size={28} />
        </div>
      ) : (
        <>
          <MessageList
            messages={messages}
            soundOn={soundOn}
            pending={sendMessage.isPending}
            autoPlayMessageId={autoPlayMessageId}
            onAudioAutoPlayAttempt={clearAutoPlayMessage}
          />
          <MessageComposer
            onSend={(content) => sendMessage.mutate(content)}
            pending={sendMessage.isPending}
            suggestions={CHAT_SUGGESTIONS}
          />
        </>
      )}
      {voiceChatOpen && conversationId && (
        <VoiceChat
          conversationId={conversationId}
          messages={messages}
          onClose={() => setVoiceChatOpen(false)}
        />
      )}
    </div>
  );
}
