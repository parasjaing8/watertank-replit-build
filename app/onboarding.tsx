import React, { useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Lang } from '@/constants/i18n';
import { useLanguage } from '@/context/LanguageContext';
import { useDevice } from '@/context/DeviceContext';
import { useColors } from '@/hooks/useColors';
import { BlePairingSheet } from '@/components/BlePairingSheet';

const { width } = Dimensions.get('window');

const LANG_LABELS: Record<Lang, string> = {
  en: 'English',
  hi: 'हिन्दी',
  mr: 'मराठी',
  kn: 'ಕನ್ನಡ',
};

export default function OnboardingScreen() {
  const colors = useColors();
  const { t, lang, setLanguage } = useLanguage();
  const { bleAvailable } = useDevice();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const [showPairing, setShowPairing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const TOTAL_PAGES = 4;

  async function finish() {
    try {
      await AsyncStorage.setItem('onboarding_done', '1');
    } catch {}
    router.replace('/(tabs)');
  }

  function next() {
    if (page < TOTAL_PAGES - 1) {
      scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
    } else {
      finish();
    }
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 16,
          paddingBottom: Math.max(insets.bottom, 24),
        },
      ]}
    >
      <View style={styles.body}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / width);
            setPage(idx);
          }}
          style={{ flex: 1 }}
        >
          {/* Page 0: Language picker */}
          <View style={[styles.pageWrapper, { width }]}>
            <Text style={styles.bigIcon}>🌐</Text>
            <View style={styles.langHeader}>
              <Text style={[styles.langHeaderText, { color: colors.foreground }]}>
                Choose your language
              </Text>
              <Text style={[styles.langHeaderText, { color: colors.foreground }]}>
                अपनी भाषा चुनें
              </Text>
              <Text style={[styles.langHeaderText, { color: colors.foreground }]}>
                तुमची भाषा निवडा
              </Text>
              <Text style={[styles.langHeaderText, { color: colors.foreground }]}>
                ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ
              </Text>
            </View>
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

          {/* Page 1: Your water tank, always watched */}
          <View style={[styles.pageWrapper, { width }]}>
            <Text style={styles.bigIcon}>💧</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{t('ob1Title')}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t('ob1Subtitle')}</Text>
          </View>

          {/* Page 2: Works automatically */}
          <View style={[styles.pageWrapper, { width }]}>
            <Text style={styles.bigIcon}>⚡</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{t('ob2Title')}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t('ob2Subtitle')}</Text>
          </View>

          {/* Page 3: Hardware setup */}
          <View style={[styles.pageWrapper, { width }]}>
            <Text style={styles.bigIcon}>📡</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{t('ob3Title')}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t('ob3Subtitle')}</Text>
            {bleAvailable && (
              <TouchableOpacity
                onPress={() => setShowPairing(true)}
                style={[styles.cta, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
              >
                <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>{t('ob3SetupBtn')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={finish} activeOpacity={0.7}>
              <Text style={[styles.skipLink, { color: colors.mutedForeground }]}>{t('ob3SkipBtn')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Footer: dots + next/skip button */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
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
            {page === TOTAL_PAGES - 1 ? t('ob3SkipBtn') : t('next')}
          </Text>
        </TouchableOpacity>
      </View>

      {showPairing && (
        <BlePairingSheet
          onClose={() => setShowPairing(false)}
          onSuccess={() => { setShowPairing(false); finish(); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  pageWrapper: {
    paddingHorizontal: 24,
    justifyContent: 'center',
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
  langHeader: {
    gap: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  langHeaderText: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
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
    paddingHorizontal: 24,
    paddingTop: 16,
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
  skipLink: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
});
