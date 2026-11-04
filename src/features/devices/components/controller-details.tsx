import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { ThemedText } from "@/components/themed-text";
import { ControllerColorPicker } from "@/features/devices/components/controller-color-picker";
import { OpenRgbController } from "@/features/devices/types";
import { useTheme } from "@/hooks/use-theme";
import { styles } from "@/features/home/styles";

/**
 * Shows a controller summary and its configuration/color entry points.
 * @param props Controller data, editor actions, and picker visibility callbacks.
 * @returns Controller summary with metadata, zones, mode, and color actions.
 */
export function ControllerDetails({
  controller,
  onColor,
  onCloseColor,
  onZones,
  onModes,
  baseUrl,
  accessToken,
  colorOpen,
}: {
  controller: OpenRgbController;
  onColor: () => void;
  onCloseColor: () => void;
  onZones: () => void;
  onModes: () => void;
  baseUrl: string;
  accessToken: string;
  colorOpen: boolean;
}) {
  const theme = useTheme();
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);

  return (
    <View style={styles.detailScreen}>
      <ScrollView
        style={styles.detailScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.detailContent}
      >
        <View style={styles.detailHeading}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            CONTROLLER
          </ThemedText>
          <ThemedText style={styles.detailTitle}>{controller.name}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {controller.type_name.toLowerCase()}
          </ThemedText>
        </View>

        <View
          style={[
            styles.detailStats,
            { borderColor: theme.backgroundSelected },
          ]}
        >
          <View style={styles.detailStatsValues}>
            <DetailStat label="Zones" value={controller.zones} />
            <DetailStat label="LEDs" value={controller.leds} />
            <DetailStat label="Modes" value={controller.modes} />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit zones"
            onPress={onZones}
            style={[
              styles.detailStatsEdit,
              { borderLeftColor: theme.backgroundSelected },
            ]}
          >
            <SymbolView
              name={{ ios: "pencil", android: "edit", web: "edit" }}
              tintColor={theme.text}
              size={16}
            />
            <ThemedText type="smallBold">Edit</ThemedText>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: isMetadataExpanded }}
          onPress={() => setIsMetadataExpanded((expanded) => !expanded)}
          style={[
            styles.metadataToggle,
            { borderBottomColor: theme.backgroundSelected },
          ]}
        >
          <ThemedText type="smallBold">Device metadata</ThemedText>
          <SymbolView
            name={{
              ios: isMetadataExpanded ? "chevron.up" : "chevron.down",
              android: isMetadataExpanded ? "expand_less" : "expand_more",
              web: isMetadataExpanded ? "expand_less" : "expand_more",
            }}
            tintColor={theme.textSecondary}
            size={18}
          />
        </Pressable>

        {isMetadataExpanded ? (
          <View style={styles.detailMeta}>
            {controller.vendor ? (
              <DetailLine label="Vendor" value={controller.vendor} />
            ) : null}
            {controller.model ? (
              <DetailLine label="Model" value={controller.model} />
            ) : null}
            {controller.serial ? (
              <DetailLine label="Serial" value={controller.serial} />
            ) : null}
            <DetailLine label="Controller ID" value={String(controller.id)} />
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: colorOpen }}
          onPress={onColor}
          style={[
            styles.detailAction,
            { backgroundColor: theme.backgroundElement },
          ]}
        >
          <SymbolView
            name={{ ios: "paintpalette", android: "palette", web: "palette" }}
            tintColor={theme.text}
            size={19}
          />
          <ThemedText type="smallBold">Update all LEDs</ThemedText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onModes}
          style={[
            styles.detailAction,
            { backgroundColor: theme.backgroundElement },
          ]}
        >
          <SymbolView
            name={{
              ios: "gearshape",
              android: "settings",
              web: "settings",
            }}
            tintColor={theme.text}
            size={19}
          />
          <ThemedText type="smallBold">Configure mode</ThemedText>
        </Pressable>

        {colorOpen ? (
          <ControllerColorPicker
            key={`${baseUrl}-${controller.id}-detail`}
            baseUrl={baseUrl}
            accessToken={accessToken}
            controllerId={controller.id}
            visible
            onClose={onCloseColor}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

function DetailStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.detailStat}>
      <ThemedText type="smallBold">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.detailLine,
        { borderBottomColor: theme.backgroundSelected },
      ]}
    >
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.detailValue}>
        {value}
      </ThemedText>
    </View>
  );
}

