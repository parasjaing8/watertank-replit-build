import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";

type FaqItem = { q: string; a: string };

function Accordion({ item }: { item: FaqItem }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
        style={styles.row}
      >
        <Text style={[styles.q, { color: colors.foreground }]}>{item.q}</Text>
        <Feather
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>
      {open && (
        <Text style={[styles.a, { color: colors.mutedForeground }]}>
          {item.a}
        </Text>
      )}
    </View>
  );
}

export default function HelpScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const items: FaqItem[] = [
    { q: t("helpMotorQuestion"),    a: t("helpMotorAnswer") },
    { q: t("helpTankLowQuestion"),  a: t("helpTankLowAnswer") },
    { q: t("helpConnectQuestion"),  a: t("helpConnectAnswer") },
    { q: t("helpSyncQuestion"),     a: t("helpSyncAnswer") },
    { q: t("helpManualQuestion"),   a: t("helpManualAnswer") },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
            paddingTop: Math.max(insets.top, 16) + 10,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.6}
        >
          <Feather name="chevron-left" size={26} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {t("helpTitle")}
        </Text>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {items.map((it, i) => (
          <Accordion key={i} item={it} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 6 },
  title: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  content: { padding: 16, gap: 10, paddingBottom: 60 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  q: { flex: 1, fontSize: 16, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  a: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    marginTop: 4,
  },
});
