import ColorPicker, {
  ColorFormatsObject,
  HueSlider,
  Panel1,
  Preview,
  Swatches,
} from "reanimated-color-picker";
import { SymbolView } from "expo-symbols";
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useControllerColor } from "@/features/devices/hooks/use-controller-color";
import { useGlobalControllerColor } from "@/features/devices/hooks/use-global-controller-color";
import { OpenRgbController } from "@/features/devices/types";
import { useTheme } from "@/hooks/use-theme";
import { useState } from "react";

type ControllerColorPickerProps = {
  baseUrl: string;
  accessToken: string;
  controllerId: number;
  controllers?: OpenRgbController[];
  visible: boolean;
  onClose: () => void;
};

/**
 * Color controls for one controller or, when supplied, every controller.
 * @param props Target controller, optional global controller list, and visibility actions.
 * @returns Responsive color picker with live update/error feedback.
 */
export function ControllerColorPicker({
  baseUrl,
  accessToken,
  controllerId,
  controllers,
  visible,
  onClose,
}: ControllerColorPickerProps) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const panelHeight = Math.min(210, Math.max(130, height * 0.2));
  const isGlobal = controllers !== undefined;
  const { color, isSending, error, changeColor } = useControllerColor(
    baseUrl,
    accessToken,
    controllerId,
    !isGlobal,
  );
  const [globalColor, setGlobalColor] = useState("#FFFFFF");
  const global = useGlobalControllerColor({
    baseUrl,
    accessToken,
    controllers: controllers ?? [],
  });

  function onColorChange({ hex }: ColorFormatsObject) {
    if (isGlobal) {
      setGlobalColor(hex);
      void global.applyColorToAllControllers(hex);
    } else {
      changeColor(hex);
    }
  }

  const displayedColor = isGlobal ? globalColor : color;
  const sending = isGlobal ? global.isApplyingColor : isSending;
  const displayedError = isGlobal ? global.error : error;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close color picker"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: theme.background,
              height: Math.min(height * 0.76, 660),
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.heading}>
              <ThemedText type="smallBold">LED color</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {isGlobal
                  ? "Set every LED across all controllers at once."
                  : "Set every LED on this controller at once."}
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close color picker"
              onPress={onClose}
              style={styles.closeButton}
            >
              <SymbolView
                name={{ ios: "xmark", android: "close", web: "close" }}
                tintColor={theme.text}
                size={18}
              />
            </Pressable>
          </View>
          <ScrollView
            style={styles.pickerScroll}
            contentContainerStyle={styles.pickerContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <ColorPicker
              value={displayedColor}
              onChangeJS={onColorChange}
              style={styles.picker}
              thumbSize={22}
              sliderThickness={22}
            >
              <Preview style={styles.preview} />
              <Panel1 style={[styles.panel, { height: panelHeight }]} />
              <HueSlider style={styles.hue} />
              <Swatches style={styles.swatches} />
            </ColorPicker>
          </ScrollView>
          <View
            style={[
              styles.feedback,
              { borderTopColor: theme.backgroundSelected },
            ]}
          >
            <ThemedText type="small" themeColor="textSecondary">
              {sending ? "Applying color…" : "All LEDs update in real time."}
            </ThemedText>
            {displayedError ? (
              <ThemedText type="small" style={styles.error}>
                {displayedError}
              </ThemedText>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.three,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.48)",
  },
  dialog: {
    width: "100%",
    maxWidth: 440,
    padding: Spacing.three,
    borderRadius: 8,
    gap: Spacing.two,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  heading: { flex: 1, gap: Spacing.one },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerScroll: { flex: 1, minHeight: 0 },
  pickerContent: { gap: Spacing.two, paddingBottom: Spacing.one },
  picker: { width: "100%", gap: Spacing.two },
  preview: { height: 38 },
  panel: { width: "100%", borderRadius: 6 },
  hue: { width: "100%", height: 26, borderRadius: 13 },
  swatches: { height: 34 },
  feedback: {
    minHeight: 44,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
  },
  error: { color: "#C0392B" },
});
