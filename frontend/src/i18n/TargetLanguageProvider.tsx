import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** The language the learner is practising (NOT the UI language — see LanguageProvider). */
export type TargetLanguage = 'zh' | 'en';

interface TargetLanguageContextValue {
  target: TargetLanguage;
  setTarget: (target: TargetLanguage) => void;
}

const TARGET_STORAGE_KEY = 'target_language';

const TargetLanguageContext = createContext<TargetLanguageContextValue | null>(null);

function initialTarget(): TargetLanguage {
  return localStorage.getItem(TARGET_STORAGE_KEY) === 'en' ? 'en' : 'zh';
}

export function TargetLanguageProvider({ children }: { children: ReactNode }) {
  const [target, setTargetState] = useState<TargetLanguage>(initialTarget);

  const value = useMemo<TargetLanguageContextValue>(
    () => ({
      target,
      setTarget: (next) => {
        localStorage.setItem(TARGET_STORAGE_KEY, next);
        setTargetState(next);
      },
    }),
    [target],
  );

  return (
    <TargetLanguageContext.Provider value={value}>{children}</TargetLanguageContext.Provider>
  );
}

export function useTargetLanguage() {
  const context = useContext(TargetLanguageContext);
  if (!context) {
    throw new Error('useTargetLanguage must be used within TargetLanguageProvider');
  }
  return context;
}
