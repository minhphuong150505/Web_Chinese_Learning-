import { createContext, useContext, useMemo, type ReactNode } from 'react';

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
  // The practice language is read once at boot. Switching it persists the choice
  // and reloads the whole app so every provider, query, and cached list
  // re-initialises for the new language instead of mixing the two.
  const target = initialTarget();

  const value = useMemo<TargetLanguageContextValue>(
    () => ({
      target,
      setTarget: (next) => {
        if (next === target) return;
        localStorage.setItem(TARGET_STORAGE_KEY, next);
        window.location.reload();
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
