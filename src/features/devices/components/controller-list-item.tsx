import { Pressable, View } from "react-native";
import { SymbolView } from "expo-symbols";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

import { ThemedText } from "@/components/themed-text";
import { ControllerColorPicker } from "@/features/devices/components/controller-color-picker";
import { OpenRgbController } from "@/features/devices/types";
import { useTheme } from "@/hooks/use-theme";
import { styles } from "@/features/home/styles";

/**
 * Controller row with type-specific icon, selection, and color shortcuts.
 * @param props Controller record, picker state, and row action callbacks.
 * @returns Pressable controller card and its optional color picker.
 */
export function ControllerListItem({ controller, baseUrl, accessToken, colorControllerId, onColorControllerChange, onGlobalPickerClose, onSelectController }: {
  controller: OpenRgbController; baseUrl: string; accessToken: string;
  colorControllerId: number | null; onColorControllerChange: (id: number | null) => void;
  onGlobalPickerClose: () => void; onSelectController: (controller: OpenRgbController) => void;
}) {
  const theme = useTheme();
  const icon = getControllerIcon(controller.type_name);
  return (

<View
  style={[
    styles.controllerEntry,
    {
      borderColor: theme.backgroundSelected,
      backgroundColor: theme.backgroundElement,
    },
  ]}
>
  <View style={styles.controllerRow}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${controller.name} details`}
      onPress={() => onSelectController(controller)}
      style={styles.controllerOpen}
    >
      <View
        style={[
          styles.controllerIcon,
          { backgroundColor: theme.backgroundSelected },
        ]}
      >
        <FontAwesome6 name={icon} color={theme.title} size={21} />
      </View>

      <View style={styles.profileDetails}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {controller.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {controller.type_name.toLowerCase()}
        </ThemedText>
      </View>

      <SymbolView
        name={{
          ios: "chevron.right",
          android: "chevron_right",
          web: "chevron_right",
        }}
        tintColor={theme.textSecondary}
        size={17}
      />
    </Pressable>

    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Set all LEDs on ${controller.name}`}
      accessibilityState={{
        expanded: colorControllerId === controller.id,
      }}
      onPress={() => {
        onGlobalPickerClose();
        onColorControllerChange(colorControllerId === controller.id ? null : controller.id);
      }}
      style={[
        styles.colorButton,
        {
          backgroundColor:
            colorControllerId === controller.id
              ? theme.backgroundSelected
              : theme.backgroundElement,
        },
      ]}
    >
      <SymbolView
        name={{
          ios: "paintpalette",
          android: "palette",
          web: "palette",
        }}
        tintColor={theme.text}
        size={17}
      />
      <ThemedText type="smallBold">All</ThemedText>
    </Pressable>
  </View>

  {colorControllerId === controller.id ? (
    <ControllerColorPicker
      key={`${baseUrl}-${controller.id}`}
      baseUrl={baseUrl}
      accessToken={accessToken}
      controllerId={controller.id}
      visible
      onClose={() => onColorControllerChange(null)}
    />
  ) : null}
</View>
              
  );
}

/**
 * Maps the server's OpenRGB device type to a FontAwesome 6 icon name.
 * @param deviceType `type_name` value; separators and case are normalized.
 * @returns Matching FontAwesome 6 glyph name, or `computer` for unknown values.
 */
function getControllerIcon(deviceType: string) {
  const type = deviceType.trim().toUpperCase().replace(/[\s-]+/g, "_");

  switch (type) {
    case "MOTHERBOARD":
    case "GPU":
      return "microchip";
    case "DRAM":
      return "memory";
    case "COOLER":
      return "fan";
    case "LED_STRIP":
    case "LIGHT":
      return "lightbulb";
    case "KEYBOARD":
      return "keyboard";
    case "MOUSE":
      return "computer-mouse";
    case "MOUSEMAT":
      return "rug";
    case "HEADSET":
    case "HEADSET_STAND":
      return "headset";
    case "GAMEPAD":
      return "gamepad";
    case "SPEAKER":
      return "volume-high";
    case "VIRTUAL":
      return "cube";
    case "STORAGE":
      return "hard-drive";
    case "PC_CASE":
      return "computer";
    case "MICROPHONE":
      return "microphone";
    case "ACCESSORY":
      return "puzzle-piece";
    case "KEYPAD":
      return "calculator";
    case "LAPTOP":
      return "laptop";
    case "MONITOR":
      return "display";
    case "UNKNOWN":
    default:
      return "computer";
  }
}
