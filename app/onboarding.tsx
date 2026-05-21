import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { Lang } from '@/constants/i18n';
import { useLanguage } from '@/context/LanguageContext';
import { useColors } from '@/hooks/useColors';

const LANG_LABELS: Record<Lang, string> = {
  en: 'English',
  hi: 'हिन्दी',
  mr: 'मराठी',
  kn: 'ಕನ್ನಡ',
};

export default function OnboardingScreen() {
  const colors = useColors();
  const { t, lang, setLanguage } = useLanguage();
  const [page, setPage] = useState(0);

  async function finish() {
    try {
      await AsyncStorage.setItem('onboarding_done', '1');
    } catch {}
    router.replace('/(tabs)');
  }

  function next() {
    if (page < 2) setPage((p) => p + 1);
    else finish();
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.body}>
        {page === 0 && (
          <View style={styles.pageContent}>
            <Text style={styles.bigIcon}>💧</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{t('ob1Title')}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t('ob1Subtitle')}</Text>
          </View>
        )}
        {page === 1 && (
          <View style={styles.pageContent}>
            <Text style={styles.bigIcon}>⚡</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{t('ob2Title')}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t('ob2Subtitle')}</Text>
          </View>
        )}
        {page === 2 && (
          <View style={styles.pageContent}>
            <Text style={styles.bigIcon}>🌐</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{t('ob3Title')}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t('ob3Subtitle')}</Text>
            <View style={styles.langGrid}>
              {(['en', 'hi', 'mr', 'kn'] as Lang[]).map((code) => {
                const active = lang === code;
                return (
                  <Pressable
                    key={code}
                    onPress={() => setLanguage(code)}
                    style={[
                      styles.langChip,
                      {
                        backgroundColor: active ? colors.primary : colors.card,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.langChipText,
                        { color: active ? colors.primaryForeground : colors.foreground },
                      ]}
                    >
                      {LANG_LABELS[code]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === page ? colors.primary : colors.muted },
              ]}
            />
          ))}
        </View>
        <TouchableOpacity
          onPress={next}
          style={[styles.cta, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
        >
          <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>
            {page === 2 ? t('getStarted') : t('next')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  body: { flex: 1, justifyContent: 'center' },
  pageContent: {
    alignItems: 'center',
    gap: 18,
  },
  bigIcon: {
    fontSize: 88,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginTop: 16,
  },
  langChip: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    minWidth: 130,
    alignItems: 'center',
  },
  langChipText: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
  },
  footer: {
    gap: 16,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cta: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
  },
});
