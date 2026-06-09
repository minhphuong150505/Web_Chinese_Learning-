import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import TabBar, { type TabName } from './components/TabBar';
import Spinner from './components/Spinner';
import LoginScreen from './features/auth/LoginScreen';
import ChatTab from './features/chat/ChatTab';
import PronunciationTab from './features/pronunciation/PronunciationTab';
import TranslationTab from './features/translation/TranslationTab';
import WritingTab from './features/writing/WritingTab';
import HskTab from './features/hsk/HskTab';
import LetterTab from './features/letter/LetterTab';
import { useAuth } from './hooks/useAuth';
import type { User } from './types/auth';

const ENABLED: Record<TabName, boolean> = {
  chat: true,
  pronounce: true,
  translate: true,
  write: true,
  hsk: true,
  letter: true,
};

const LETTER_ALLOWED_EMAILS = String(import.meta.env.VITE_LETTER_ALLOWED_EMAILS ?? 'nguoiyeukimhan')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function canViewLetter(user: User) {
  return LETTER_ALLOWED_EMAILS.includes(user.email.trim().toLowerCase());
}

export default function App() {
  const { user, isLoading } = useAuth();
  const [tab, setTab] = useState<TabName>('chat');
  const canUseLetter = user ? canViewLetter(user) : false;

  useEffect(() => {
    if (tab === 'letter' && !canUseLetter) setTab('chat');
  }, [canUseLetter, tab]);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner size={28} />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const visible: Record<TabName, boolean> = {
    chat: true,
    pronounce: true,
    translate: true,
    write: true,
    hsk: true,
    letter: canUseLetter,
  };

  return (
    <Layout>
      <TabBar active={tab} onChange={setTab} enabled={ENABLED} visible={visible} />
      {tab === 'chat' && <ChatTab />}
      {tab === 'pronounce' && <PronunciationTab />}
      {tab === 'translate' && <TranslationTab />}
      {tab === 'write' && <WritingTab />}
      {tab === 'hsk' && <HskTab />}
      {tab === 'letter' && canUseLetter && <LetterTab />}
    </Layout>
  );
}
