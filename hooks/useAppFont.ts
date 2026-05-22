import { useMemo } from 'react';

import { useLanguage } from '@/context/LanguageContext';
import type { Lang } from '@/constants/i18n';

export interface AppFontSet {
  regular: string;
  medium: string;
  semiBold: string;
  bold: string;
}

const INTER: AppFontSet = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

const DEVANAGARI: AppFontSet = {
  regular: 'NotoSansDevanagari_400Regular',
  medium: 'NotoSansDevanagari_400Regular',
  semiBold: 'NotoSansDevanagari_700Bold',
  bold: 'NotoSansDevanagari_700Bold',
};

const KANNADA: AppFontSet = {
  regular: 'NotoSansKannada_400Regular',
  medium: 'NotoSansKannada_400Regular',
  semiBold: 'NotoSansKannada_700Bold',
  bold: 'NotoSansKannada_700Bold',
};

export function fontSetFor(lang: Lang): AppFontSet {
  if (lang === 'hi' || lang === 'mr') return DEVANAGARI;
  if (lang === 'kn') return KANNADA;
  return INTER;
}

export function useAppFont(): AppFontSet {
  const { lang } = useLanguage();
  return useMemo(() => fontSetFor(lang), [lang]);
}
