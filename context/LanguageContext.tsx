import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Lang, TRANSLATIONS, Translations } from '@/constants/i18n';

const STORAGE_KEY = '@watertank_language';

interface LanguageContextValue {
  lang: Lang;
  setLanguage: (l: Lang) => void;
  t: (key: keyof Translations) => string;
  ready: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'en' || saved === 'hi' || saved === 'mr' || saved === 'kn') {
          setLang(saved);
        }
      } catch {}
      setReady(true);
    })();
  }, []);

  const setLanguage = useCallback((l: Lang) => {
    setLang(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
  }, []);

  const t = useCallback(
    (key: keyof Translations): string => {
      const dict = TRANSLATIONS[lang] ?? TRANSLATIONS.en;
      return dict[key] ?? TRANSLATIONS.en[key] ?? String(key);
    },
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t, ready }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be inside LanguageProvider');
  return ctx;
}
