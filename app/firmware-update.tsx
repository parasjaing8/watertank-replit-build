import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDevice } from "@/context/DeviceContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { getBleService } from "@/services/BLEService";
import { downloadFirmware, performOtaTransfer } from "@/services/FirmwareUpdateService";

type OtaState =
  | "idle"
  | "downloading"
  | "transferring"
  | "rebooting"
  | "confirming"
  | "done"
  | "error"
  | "cancelled";

export default function FirmwareUpdateScreen() {
  const { t } = useLanguage();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { deviceState, firmwareUpdateAvailable, firmwareManifest } = useDevice();

  const [otaState, setOtaState] = useState<OtaState>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState("");
  const [targetVersion, setTargetVersion] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Rebooting timeout — if board never reconnects within 60s, surface an error
  useEffect(() => {
    if (otaState !== "rebooting") return;
    const timer = setTimeout(() => {
      setErrorMsg(t("fwTimeout60"));
      setOtaState("error");
    }, 60000);
    return () => clearTimeout(timer);
  }, [otaState]);

  // Confirming timeout — BLEService should read firmwareVersion within a few seconds
  useEffect(() => {
    if (otaState !== "confirming") return;
    const t = setTimeout(() => {
      setErrorMsg(
        `Version not confirmed within 30 seconds (device reports v${deviceState.firmwareVersion ?? "?"}).`,
      );
      setOtaState("error");
    }, 30000);
    return () => clearTimeout(t);
    // intentionally no deviceState.firmwareVersion dep — fires once on entering confirming
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otaState]);

  // Watch for board reconnect after reboot to confirm success
  useEffect(() => {
    if (otaState !== "rebooting" && otaState !== "confirming") return;
    if (!deviceState.connected) return;

    // Step 1: board just reconnected → enter confirming
    if (otaState === "rebooting") { setOtaState("confirming"); return; }

    // Step 2: wait for BLEService to populate firmwareVersion (it reads async after connect)
    if (!deviceState.firmwareVersion) return;

    const t = setTimeout(() => {
      if (deviceState.firmwareVersion === targetVersion) {
        setOtaState("done");
      } else {
        setErrorMsg(
          `Board reconnected but reports v${deviceState.firmwareVersion} instead of expected v${targetVersion}.`,
        );
        setOtaState("error");
      }
    }, 500);
    return () => clearTimeout(t);
  }, [otaState, deviceState.connected, deviceState.firmwareVersion, targetVersion]);

  // Auto-clear cancelled state when board power-cycles (disconnects → idle for retry)
  useEffect(() => {
    if (otaState !== "cancelled") return;
    if (!deviceState.connected) setOtaState("idle");
  }, [otaState, deviceState.connected]);

  const startUpdate = useCallback(async () => {
    if (!firmwareManifest) return;

    abortRef.current = new AbortController();
    setTargetVersion(firmwareManifest.version);
    setErrorMsg("");

    try {
      // 1. Download
      setOtaState("downloading");
      setProgress({ done: 0, total: 0 });
      const firmwareBytes = await downloadFirmware(firmwareManifest.url, firmwareManifest.sha256 || undefined);

      if (abortRef.current.signal.aborted) return;

      // 2. Transfer
      setOtaState("transferring");
      const deviceId = getBleService()?.getConnectedDeviceId?.() ?? null;
      if (!deviceId) throw new Error("Lost BLE connection before transfer started");

      await performOtaTransfer(
        firmwareBytes,
        deviceId,
        (done, total) => setProgress({ done, total }),
        abortRef.current.signal,
      );

      // 3. Board reboots — wait for reconnect
      setOtaState("rebooting");
    } catch (e: unknown) {
      if ((e as Error)?.message === "Aborted") return;
      setErrorMsg((e as Error)?.message ?? "Unknown error");
      setOtaState("error");
    }
  }, [firmwareManifest]);

  const cancel = useCallback(() => {
    const wasTransferring = otaState === "transferring";
    abortRef.current?.abort();
    // If transfer had started the board is mid-OTA and needs a power-cycle before retry
    setOtaState(wasTransferring ? "cancelled" : "idle");
  }, [otaState]);

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  const isActive = otaState === "downloading" || otaState === "transferring";

  return (
    <>
      <Stack.Screen
        options={{
          title: t("fwUpdateTitle"),
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.foreground,
        }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
      >
        {/* Current / available versions */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row label={t("fwDeviceFirmware")} value={deviceState.firmwareVersion ? `v${deviceState.firmwareVersion}` : "—"} colors={colors} />
          {firmwareManifest && (
            <Row label={t("fwAvailable")} value={`v${firmwareManifest.version}`} colors={colors} highlight />
          )}
          {!firmwareUpdateAvailable && otaState === "idle" && (
            <Text style={[styles.upToDate, { color: colors.mutedForeground }]}>
              {t("fwUpToDate")}
            </Text>
          )}
        </View>

        {/* Changelog */}
        {firmwareManifest?.changelog && otaState === "idle" && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>{t("fwChangelog")}</Text>
            <Text style={[styles.changelog, { color: colors.foreground }]}>
              {firmwareManifest.changelog}
            </Text>
            {firmwareManifest.size && (
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                Size: {(firmwareManifest.size / 1024).toFixed(0)} KB · ~30–45 seconds over BLE
              </Text>
            )}
          </View>
        )}

        {/* Progress */}
        {(otaState === "downloading" || otaState === "transferring") && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statusTitle, { color: colors.foreground }]}>
              {otaState === "downloading" ? t("fwDownloading") : t("fwTransferring")}
            </Text>
            {otaState === "transferring" && progress.total > 0 && (
              <>
                <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
                  <View
                    style={[styles.progressFill, { backgroundColor: colors.primary, width: `${pct}%` }]}
                  />
                </View>
                <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
                  {progress.done} / {progress.total} sectors ({pct}%)
                </Text>
              </>
            )}
            {otaState === "downloading" && <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />}
            <Text style={[styles.warning, { color: colors.mutedForeground }]}>
              {t("fwKeepClose")}
            </Text>
          </View>
        )}

        {/* Rebooting / confirming */}
        {(otaState === "rebooting" || otaState === "confirming") && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.statusTitle, { color: colors.foreground, marginTop: 12 }]}>
              {otaState === "rebooting" ? t("fwRebooting") : t("fwConfirming")}
            </Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {otaState === "rebooting" ? t("fwRebootHint") : t("fwConfirmHint")}
            </Text>
          </View>
        )}

        {/* Success */}
        {otaState === "done" && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="check-circle" size={40} color="#22c55e" style={{ alignSelf: "center" }} />
            <Text style={[styles.statusTitle, { color: colors.foreground, textAlign: "center", marginTop: 12 }]}>
              {t("fwDoneTitle")}
            </Text>
            <Text style={[styles.meta, { color: colors.mutedForeground, textAlign: "center" }]}>
              {t("fwDoneBody")} v{targetVersion}.
            </Text>
          </View>
        )}

        {/* Cancelled mid-transfer */}
        {otaState === "cancelled" && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="alert-triangle" size={40} color="#f59e0b" style={{ alignSelf: "center" }} />
            <Text style={[styles.statusTitle, { color: colors.foreground, textAlign: "center", marginTop: 12 }]}>
              {t("fwCancelledTitle")}
            </Text>
            <Text style={[styles.meta, { color: colors.mutedForeground, textAlign: "center" }]}>
              {t("fwCancelledBody")}
            </Text>
            <Text style={[styles.meta, { color: colors.mutedForeground, textAlign: "center", marginTop: 4 }]}>
              {t("fwCancelledWaiting")}
            </Text>
          </View>
        )}

        {/* Error */}
        {otaState === "error" && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="alert-circle" size={40} color="#ef4444" style={{ alignSelf: "center" }} />
            <Text style={[styles.statusTitle, { color: colors.foreground, textAlign: "center", marginTop: 12 }]}>
              {t("fwErrorTitle")}
            </Text>
            <Text style={[styles.meta, { color: colors.mutedForeground, textAlign: "center" }]}>
              {errorMsg || t("fwErrorFallback")}
            </Text>
            <Text style={[styles.meta, { color: colors.mutedForeground, textAlign: "center", marginTop: 4 }]}>
              {t("fwErrorRollback")}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {otaState === "idle" && firmwareUpdateAvailable && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }]}
              onPress={startUpdate}
            >
              <Text style={[styles.btnText, { color: "#fff" }]}>
                {t("fwInstall")} v{firmwareManifest?.version}
              </Text>
            </TouchableOpacity>
          )}
          {isActive && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.muted }]}
              onPress={cancel}
            >
              <Text style={[styles.btnText, { color: colors.foreground }]}>{t("cancel")}</Text>
            </TouchableOpacity>
          )}
          {(otaState === "done" || otaState === "error") && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.muted }]}
              onPress={() => router.back()}
            >
              <Text style={[styles.btnText, { color: colors.foreground }]}>{t("fwDone")}</Text>
            </TouchableOpacity>
          )}
          {otaState === "error" && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary, marginTop: 8 }]}
              onPress={() => setOtaState("idle")}
            >
              <Text style={[styles.btnText, { color: "#fff" }]}>{t("fwRetry")}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </>
  );
}

function Row({
  label,
  value,
  colors,
  highlight,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  highlight?: boolean;
}) {
  return (
    <View style={styles.rowContainer}>
      <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: highlight ? colors.primary : colors.foreground, fontWeight: highlight ? "600" : "400" }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 8 },
  label: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
  rowContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14 },
  changelog: { fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  upToDate: { fontSize: 13, textAlign: "center", paddingVertical: 4 },
  statusTitle: { fontSize: 16, fontWeight: "600" },
  warning: { fontSize: 12, marginTop: 8 },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden", marginTop: 8 },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 12, textAlign: "center" },
  actions: { gap: 8, marginTop: 8 },
  btn: { borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  btnText: { fontSize: 15, fontWeight: "600" },
});
