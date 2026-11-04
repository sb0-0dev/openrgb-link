import { CameraView, useCameraPermissions } from "expo-camera";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { parsePairingQr } from "@/features/connection/api";
import { useTheme } from "@/hooks/use-theme";

/** Inputs and pairing callback required by the add-server modal. */
type PairingModalProps = {
  visible: boolean;
  onClose: () => void;
  onAdd: (
    profileName: string,
    serverUrl: string,
    pairingCode: string,
    deviceName: string,
  ) => Promise<void>;
};

/**
 * Camera flow for reading and validating an OpenRGB pairing QR code.
 * @param props Barcode callback and action to return to manual entry.
 * @returns Permission state, live QR scanner, or scan feedback.
 */
function PairingScanner({
  onRead,
  onCancel,
}: {
  onRead: (serverUrl: string, pairingCode: string) => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!permission) {
    return <ActivityIndicator color={theme.text} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionState}>
        <ThemedText type="small" style={styles.centerText}>
          Camera access is needed to scan the server&apos;s pairing QR code.
        </ThemedText>
        <ActionButton title="Allow camera" onPress={requestPermission} />
        <ActionButton
          title="Enter details manually"
          onPress={onCancel}
          secondary
        />
      </View>
    );
  }

  /** Parses a single barcode and guards against duplicate scan callbacks. */
  function onBarcodeScanned({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);
    try {
      const payload = parsePairingQr(data);
      onRead(payload.server_url, payload.code);
    } catch (scanError) {
      setError(
        scanError instanceof Error
          ? scanError.message
          : "Could not read this QR code.",
      );
      setScanned(false);
    }
  }

  return (
    <View style={styles.scannerContainer}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={onBarcodeScanned}
      />
      <ThemedText themeColor="textSecondary" style={styles.centerText}>
        Point the camera at the pairing QR shown by your OpenRGB server.
      </ThemedText>
      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
      <ActionButton title="Back to manual entry" onPress={onCancel} secondary />
    </View>
  );
}

/**
 * Shared primary/secondary action button used by pairing states.
 * @param props Button label, handler, emphasis, and disabled state.
 * @returns Accessible button styled for the current theme.
 */
function ActionButton({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: secondary ? theme.backgroundElement : theme.text,
          opacity: disabled ? 0.55 : pressed ? 0.75 : 1,
        },
      ]}
    >
      <ThemedText
        type="smallBold"
        style={{ color: secondary ? theme.text : theme.background }}
      >
        {title}
      </ThemedText>
    </Pressable>
  );
}

/**
 * Modal for manual pairing or QR scanning, followed by profile creation.
 * @param props Visibility, close action, and async profile creation callback.
 * @returns Rounded pairing sheet with manual and camera entry flows.
 */
export function PairingModal({ visible, onClose, onAdd }: PairingModalProps) {
  const theme = useTheme();
  const [mode, setMode] = useState<"manual" | "scan">("manual");
  const [profileName, setProfileName] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [deviceName, setDeviceName] = useState("OpenRGB Link");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Resets transient pairing state before notifying the parent to close. */
  function close() {
    setError(null);
    setMode("manual");
    onClose();
  }

  /**
   * Validates/pairs through the parent callback and clears the form on success.
   * Failures are kept in local state so the user can correct and retry.
   */
  async function submit() {
    setIsSaving(true);
    setError(null);
    try {
      await onAdd(profileName, serverUrl, pairingCode, deviceName);
      setProfileName("");
      setServerUrl("");
      setPairingCode("");
      setDeviceName("OpenRGB Link");
      close();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not pair this server.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  /** Copies validated QR details into the manual form for review and submission. */
  function applyQr(serverAddress: string, code: string) {
    setServerUrl(serverAddress);
    setPairingCode(code);
    setMode("manual");
    setError(null);
  }

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.backgroundElement,
      borderColor: theme.backgroundSelected,
      color: theme.text,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <View style={styles.modalBackdrop}>
        <SafeAreaView style={styles.modalSafeArea}>
          <ThemedView style={styles.modalCard}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.keyboardArea}
            >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleGroup}>
                <ThemedText type="subtitle" style={styles.modalTitle}>
                  Add server
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  Pair this app with an OpenRGB server.
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close add server"
                onPress={close}
                style={styles.closeButton}
              >
                <SymbolView
                  name={{ ios: "xmark", android: "close", web: "close" }}
                  tintColor={theme.text}
                  size={20}
                />
              </Pressable>
            </View>

            <View style={styles.modeControl}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: mode === "manual" }}
                onPress={() => setMode("manual")}
                style={[
                  styles.modeButton,
                  mode === "manual" && {
                    backgroundColor: theme.title,
                  },
                ]}
              >
                <SymbolView
                  name={{
                    ios: "keyboard",
                    android: "keyboard",
                    web: "keyboard",
                  }}
                  tintColor={mode === "manual" ? theme.background : theme.textSecondary}
                  size={16}
                />
                <ThemedText type="smallBold" style={{ color: mode === "manual" ? theme.background : theme.textSecondary }}>
                  Manual
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: mode === "scan" }}
                onPress={() => setMode("scan")}
                style={[
                  styles.modeButton,
                  mode === "scan" && {
                    backgroundColor: theme.title,
                  },
                ]}
              >
                <SymbolView
                  name={{
                    ios: "qrcode.viewfinder",
                    android: "qr_code_scanner",
                    web: "qr_code_scanner",
                  }}
                  tintColor={mode === "scan" ? theme.background : theme.textSecondary}
                  size={17}
                />
                <ThemedText type="smallBold" style={{ color: mode === "scan" ? theme.background : theme.textSecondary }}>
                  Scan QR
                </ThemedText>
              </Pressable>
            </View>

            {mode === "scan" ? (
              <PairingScanner
                onRead={applyQr}
                onCancel={() => setMode("manual")}
              />
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.formContent}
              >
                <ThemedText type="smallBold">Profile name</ThemedText>
                <TextInput
                  autoCapitalize="words"
                  onChangeText={setProfileName}
                  placeholder="Office PC"
                  placeholderTextColor={theme.textSecondary}
                  returnKeyType="next"
                  style={inputStyle}
                  value={profileName}
                />

                <ThemedText type="smallBold">Server address</ThemedText>
                <TextInput
                  accessibilityLabel="OpenRGB server address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  onChangeText={setServerUrl}
                  placeholder="http://192.168.1.20:8742"
                  placeholderTextColor={theme.textSecondary}
                  returnKeyType="next"
                  style={inputStyle}
                  value={serverUrl}
                />

                <ThemedText type="smallBold">Pairing code</ThemedText>
                <TextInput
                  autoCapitalize="characters"
                  autoCorrect={false}
                  onChangeText={setPairingCode}
                  placeholder="Code from the server"
                  placeholderTextColor={theme.textSecondary}
                  returnKeyType="next"
                  style={inputStyle}
                  value={pairingCode}
                />

                <ThemedText type="smallBold">
                  This device&apos;s name
                </ThemedText>
                <TextInput
                  autoCapitalize="words"
                  onChangeText={setDeviceName}
                  placeholder="My Mobile Device"
                  placeholderTextColor={theme.textSecondary}
                  returnKeyType="done"
                  style={inputStyle}
                  value={deviceName}
                />

                <ThemedText type="small" themeColor="textSecondary">
                  Generate a pairing code from the server&apos;s local web page.
                  On a phone, use your PC&apos;s LAN address instead of
                  localhost.
                </ThemedText>

                {error ? (
                  <ThemedText style={styles.errorText}>{error}</ThemedText>
                ) : null}

                <ActionButton
                  title={isSaving ? "Pairing..." : "Pair server"}
                  onPress={submit}
                  disabled={isSaving}
                />
              </ScrollView>
            )}
            </KeyboardAvoidingView>
          </ThemedView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(8, 10, 20, 0.56)",
  },
  modalSafeArea: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  modalCard: {
    width: "100%",
    height: "90%",
    maxHeight: "90%",
    borderRadius: 24,
    overflow: "hidden",
  },
  keyboardArea: { flex: 1, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  modalHeader: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
    paddingTop: Spacing.three,
  },
  modalTitleGroup: { gap: Spacing.one },
  modalTitle: { fontSize: 25, lineHeight: 32 },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  modeControl: {
    flexDirection: "row",
    padding: Spacing.one,
    borderRadius: 14,
    backgroundColor: "rgba(128, 128, 128, 0.12)",
    gap: Spacing.one,
  },
  modeButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 11,
    gap: Spacing.two,
  },
  formContent: {
    gap: Spacing.two,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  actionButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
  },
  scannerContainer: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "center",
    gap: Spacing.two,
  },
  camera: { width: "100%", height: 260, borderRadius: 14, overflow: "hidden" },
  permissionState: { flex: 1, justifyContent: "center", gap: Spacing.two },
  centerText: { textAlign: "center" },
  errorText: { color: "#C0392B" },
});
