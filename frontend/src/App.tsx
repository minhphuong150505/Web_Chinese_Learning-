import { useState } from 'react';
import Layout from './components/Layout';
import TabBar, { type TabName } from './components/TabBar';
import Spinner from './components/Spinner';
import LoginScreen from './features/auth/LoginScreen';
import ChatTab from './features/chat/ChatTab';
import PronunciationTab from './features/pronunciation/PronunciationTab';
import TranslationTab from './features/translation/TranslationTab';
import WritingTab from './features/writing/WritingTab';
import { useAuth } from './hooks/useAuth';
import { getToken } from './lib/authStorage';

const ENABLED: Record<TabName, boolean> = {
  chat: true,
  pronounce: true,
  translate: true,
  write: true,
};

export default function App() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabName>('chat');

  if (!user) {
    if (getToken()) {
      return (
        <div className="grid min-h-screen place-items-center">
          <Spinner size={28} />
        </div>
      );
    }
    return <LoginScreen />;
  }

  return (
    <Layout>
      <TabBar active={tab} onChange={setTab} enabled={ENABLED} />
      {tab === 'chat' && <ChatTab />}
      {tab === 'pronounce' && <PronunciationTab />}
      {tab === 'translate' && <TranslationTab />}
      {tab === 'write' && <WritingTab />}
    </Layout>
  );
}
