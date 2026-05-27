import React, { useCallback, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { useDevice } from "@/context/DeviceContext";
import { getRecentLogs } from "@/services/CrashReportService";
import { SUPPORT_WHATSAPP_NUMBER } from "@/constants/support";
import { Translations } from "@/constants/i18n";

type IssueKey = "issueMotorNotStart" | "issueWrongLevel" | "issueAppCrash" | "issueOther";

const ISSUE_KEYS: IssueKey[] = [
  "issueMotorNotStart",
  "issueWrongLevel",
  "issueAppCrash",
  "issueOther",
];

const ISSUE_ICONS: Record<IssueKey, keyof typeof Feather.glyphMap> = {
  issueMotorNotStart: "zap-off",
  issueWrongLevel:    "droplet",
  issueAppCrash:      "alert-triangle",
  issueOther:         "help-circle",
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ReportProblemSheet({ visible, onClose }: Props) {
  const colors = useColors();
  const { t } = useLanguage();
  const { deviceState } = useDevice();
  const [selected, setSelected] = useState<IssueKey | null>(null);
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    if (!selected) return;
    setSending(true);

    const issueLabel = t(selected as keyof Translations);
    const now = new Date().toLocaleString();
    const fw = deviceState.firmwareVersion ? `v${deviceState.firmwareVersion}` : "unknown";
    const log = getRecentLogs(30);

    const body = [
      t("reportMsgGreeting"),
      "",
      `${t("reportMsgIssue")}: ${issueLabel}`,
      `${t("reportMsgTime")}: ${now}`,
      `Firmware: ${fw}`,
      "",
      `--- ${t("reportMsgLog")} ---`,
      log || "(no logs yet)",
    ].join("\n");

    const encoded = encodeURIComponent(body);
    // whatsapp:// deep link — works on both Android and iOS without manifest query declarations
    const deepLink = `whatsapp://send?phone=${SUPPORT_WHATSAPP_NUMBER}&text=${encoded}`;
    const webLink  = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encoded}`;

    try {
      await Linking.openURL(deepLink);
      setSelected(null);
      onClose();
    } catch {
      // Deep link failed (WhatsApp not installed) — open web fallback
      try {
        await Linking.openURL(webLink);
        setSelected(null);
        onClose();
      } catch {
        Alert.alert("Error", "Could not open WhatsApp. Please install WhatsApp and try again.");
      }
    }
    setSending(false);
  }, [selected, deviceState.firmwareVersion, t, onClose]);

  const handleClose = useCallback(() => {
    setSelected(null);
    onClose();
  }, [onClose]);

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={handleClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <Text style={[styles.title, { color: colors.foreground }]}>
          {t("reportSelectIssue")}
        </Text>

        <View style={styles.options}>
          {ISSUE_KEYS.map((key) => {
            const isSelected = selected === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.option,
                  {
                    backgroundColor: isSelected ? colors.primary + "18" : colors.background,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelected(key)}
                activeOpacity={0.75}
              >
                <View style={[styles.optionIcon, { backgroundColor: isSelected ? colors.primary + "22" : colors.muted }]}>
                  <Feather
                    name={ISSUE_ICONS[key]}
                    size={18}
                    color={isSelected ? colors.primary : colors.mutedForeground}
                  />
                </View>
                <Text style={[styles.optionLabel, { color: isSelected ? colors.primary : colors.foreground }]}>
                  {t(key as keyof Translations)}
                </Text>
                {isSelected && (
                  <Feather name="check-circle" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: selected ? "#25D366" : colors.muted },
          ]}
          onPress={handleSend}
          disabled={!selected || sending}
          activeOpacity={0.82}
        >
          <Feather name="message-circle" size={18} color={selected ? "#fff" : colors.mutedForeground} />
          <Text style={[styles.sendBtnText, { color: selected ? "#fff" : colors.mutedForeground }]}>
            {t("reportSendWhatsApp")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
          <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>
            {t("cancel")}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 16,
    textAlign: "center",
  },
  options: {
    gap: 10,
    marginBottom: 20,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 15,
    marginBottom: 10,
  },
  sendBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
