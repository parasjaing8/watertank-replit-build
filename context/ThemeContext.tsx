import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ColorScheme = 'light' | 'dark';

interface ThemeContextValue {
  colorScheme: ColorScheme;
  setColorScheme: (s: ColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: 'light',
  setColorScheme: () => {},
});

const STORAGE_KEY = '@watertank_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorScheme, setScheme] = useState<ColorScheme>('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(v => {
      if (v === 'dark') setScheme('dark');
    }).catch(() => {});
  }, []);

  const setColorScheme = useCallback((s: ColorScheme) => {
    setScheme(s);
    AsyncStorage.setItem(STORAGE_KEY, s).catch(() => {});
  }, []);

  return (
    <ThemeContext.Provider value={{ colorScheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
