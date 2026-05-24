import React, { useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import { Translations } from '@/constants/i18n';

const { width: SCREEN_W } = Dimensions.get('window');
const IMG_W = SCREEN_W - 24;

const PAGES: Array<{
  titleKey: keyof Translations;
  source: ReturnType<typeof require>;
  imgHeight: number;
}> = [
  {
    titleKey: 'setupPage1',
    source: require('@/assets/images/setup-inbox.png'),
    imgHeight: IMG_W * 1.777,  // 941×1672 portrait
  },
  {
    titleKey: 'setupPage2',
    source: require('@/assets/images/setup-overview.png'),
    imgHeight: IMG_W * 1.777,  // 941×1672
  },
  {
    titleKey: 'setupPage3',
    source: require('@/assets/images/setup-instructions.png'),
    imgHeight: IMG_W * 1.333,  // 1086×1448
  },
];

interface Props {
  onClose: () => void;
}

export function SetupGuideModal({ onClose }: Props) {
  const colors = useColors();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  function onMomentumScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setPage(idx);
  }

  function goTo(idx: number) {
    scrollRef.current?.scrollTo({ x: idx * SCREEN_W, animated: true });
    setPage(idx);
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>

        {/* Header */}
        <View style={[
          styles.header,
          { paddingTop: insets.top + 12, borderBottomColor: colors.border, backgroundColor: colors.card },
        ]}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {t('setupGuide')}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7} accessibilityLabel="Close">
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Horizontal page scroller */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          style={{ flex: 1 }}
        >
          {PAGES.map((p, i) => (
            <View key={i} style={{ width: SCREEN_W, flex: 1 }}>
              <ScrollView
                contentContainerStyle={styles.pageContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <Image
                  source={p.source}
                  style={{ width: IMG_W, height: p.imgHeight }}
                  resizeMode="contain"
                />
              </ScrollView>
            </View>
          ))}
        </ScrollView>

        {/* Footer: page title + dots + prev/next */}
        <View style={[
          styles.footer,
          { paddingBottom: insets.bottom + 12, borderTopColor: colors.border, backgroundColor: colors.card },
        ]}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>
            {t(PAGES[page].titleKey)}
          </Text>

          <View style={styles.footerRow}>
            {/* Prev */}
            <TouchableOpacity
              onPress={() => goTo(Math.max(0, page - 1))}
              disabled={page === 0}
              style={[styles.navBtn, { opacity: page === 0 ? 0.25 : 1 }]}
              activeOpacity={0.7}
            >
              <Feather name="chevron-left" size={22} color={colors.primary} />
            </TouchableOpacity>

            {/* Dots */}
            <View style={styles.dots}>
              {PAGES.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => goTo(i)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <View style={[
                    styles.dot,
                    { backgroundColor: i === page ? colors.primary : colors.muted },
                    i === page && styles.dotActive,
                  ]} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Next */}
            <TouchableOpacity
              onPress={() => goTo(Math.min(PAGES.length - 1, page + 1))}
              disabled={page === PAGES.length - 1}
              style={[styles.navBtn, { opacity: page === PAGES.length - 1 ? 0.25 : 1 }]}
              activeOpacity={0.7}
            >
              <Feather name="chevron-right" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    flex: 1,
    marginRight: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingHorizontal: 20,
    gap: 10,
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 22,
    borderRadius: 4,
  },
});
