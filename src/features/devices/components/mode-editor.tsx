import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    View,
} from "react-native";
import ColorPicker, {
    ColorFormatsObject,
    HueSlider,
    Panel1,
    Preview,
} from "reanimated-color-picker";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import {
    listControllerLeds,
    listControllerModes,
    listControllerZones,
    listZoneSegments,
    setControllerColor,
    setControllerMode,
    type ControllerColorTarget,
    type OpenRgbLed,
    type OpenRgbSegmentInfo,
    type OpenRgbZone,
} from "@/features/devices/api";
import { averageColorHex } from "@/features/devices/color-utils";
import { OpenRgbMode } from "@/features/devices/types";
import { useTheme } from "@/hooks/use-theme";
import { OpenRgbClient } from "@/services/openrgb/client";

/** Server connection and controller identity required by the mode editor. */
type ModeEditorProps = {
  baseUrl: string;
  accessToken: string;
  controllerId: number;
};

/** Editable values kept locally until the user applies the selected mode. */
type ModeDraft = {
  mode: OpenRgbMode;
  speed: number;
  speedPreset: SpeedPreset;
  brightness: number;
  direction: string;
  colorMode: number;
  colors: OpenRgbMode["colors"];
  saveToDevice: boolean;
};

const COLOR_MODE_PER_LED = 1;
const COLOR_MODE_SPECIFIC = 2;
const COLOR_MODE_RANDOM = 3;
type SpeedPreset = "slow" | "normal" | "fast";

const speedPresets: { value: SpeedPreset; label: string }[] = [
  { value: "slow", label: "Slow" },
  { value: "normal", label: "Normal" },
  { value: "fast", label: "Fast" },
];

/**
 * Direct mode is a per-target color action rather than a named lighting mode.
 * @param mode Mode reported by the controller.
 * @returns True when the mode name represents OpenRGB's Direct mode.
 */
function isDirectMode(mode: OpenRgbMode) {
  return mode.name.trim().toLowerCase() === "direct";
}

/**
 * Converts a user-facing speed preset using the controller's ordered endpoints.
 * Some controllers report a descending range, where the fastest value is lower.
 * @param mode Mode capability limits supplied by the controller.
 * @param preset User-facing slow, normal, or fast preset.
 * @returns Integer speed clamped to the advertised minimum/maximum interval.
 */
function speedForPreset(mode: OpenRgbMode, preset: SpeedPreset) {
  const progress = preset === "slow" ? 0 : preset === "normal" ? 0.5 : 1;
  return Math.round(
    mode.speed_min + (mode.speed_max - mode.speed_min) * progress,
  );
}

/** Direct-color destination selected in the mode editor. */
type DirectColorTarget =
  | { kind: "all" }
  | { kind: "zone"; zone: number }
  | { kind: "segment"; zone: number; segment: number }
  | { kind: "led"; led: number };

/**
 * Builds a valid editable mode draft within the device's advertised limits.
 * @param mode Mode selected from the controller's mode list.
 * @returns Draft with valid color count, supported color mode, and defaults.
 */
function createDraft(mode: OpenRgbMode): ModeDraft {
  const colorModes = [
    mode.supports_unique_led_color ? COLOR_MODE_PER_LED : null,
    mode.supports_mode_color ? COLOR_MODE_SPECIFIC : null,
    mode.supports_random_color ? COLOR_MODE_RANDOM : null,
  ].filter((value): value is number => value !== null);
  const colorMode = colorModes.includes(mode.color_mode)
    ? mode.color_mode
    : (colorModes[0] ?? mode.color_mode);
  const minimumColorCount = Math.min(mode.colors_min, mode.colors_max);
  const maximumColorCount = Math.max(mode.colors_min, mode.colors_max);
  const colors = mode.colors.slice(0, maximumColorCount);

  while (colors.length < minimumColorCount) {
    colors.push({ R: 255, G: 255, B: 255 });
  }

  return {
    mode,
    speed: speedForPreset(mode, "normal"),
    speedPreset: "normal",
    brightness: mode.brightness_max,
    direction: mode.supports_direction_lr
      ? "left"
      : mode.supports_direction_ud
        ? "up"
        : "horizontal",
    colorMode,
    colors,
    saveToDevice: false,
  };
}

/** @param color OpenRGB uppercase RGB channels. @returns CSS `#RRGGBB` string. */
function colorToHex(color: OpenRgbMode["colors"][number]) {
  return `#${[color.R, color.G, color.B]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

/**
 * Converts a six-digit hex color into the channel shape used by mode payloads.
 * @param hex Color string with or without a leading `#`.
 * @returns Uppercase OpenRGB RGB channels.
 */
function hexToColor(hex: string): OpenRgbMode["colors"][number] {
  const value = hex.replace("#", "");
  return {
    R: parseInt(value.slice(0, 2), 16),
    G: parseInt(value.slice(2, 4), 16),
    B: parseInt(value.slice(4, 6), 16),
  };
}

/**
 * Edits and applies named modes or direct colors for one controller.
 * @param props Server URL, bearer token, and selected controller identifier.
 * @returns Scrollable editor for mode settings and direct LED colors.
 */
export function ModeEditor({
  baseUrl,
  accessToken,
  controllerId,
}: ModeEditorProps) {
  const theme = useTheme();
  const [modes, setModes] = useState<OpenRgbMode[]>([]);
  const [zones, setZones] = useState<OpenRgbZone[]>([]);
  const [zoneSegments, setZoneSegments] = useState<OpenRgbSegmentInfo[][]>([]);
  const [leds, setLeds] = useState<OpenRgbLed[]>([]);
  const [draft, setDraft] = useState<ModeDraft | null>(null);
  const [isDirectModeSelected, setIsDirectModeSelected] = useState(false);
  const [directColor, setDirectColor] = useState("#FFFFFF");
  const [directTarget, setDirectTarget] = useState<DirectColorTarget>({
    kind: "all",
  });
  const [isTargetListOpen, setIsTargetListOpen] = useState(false);
  const [isModeListOpen, setIsModeListOpen] = useState(false);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTargets, setIsLoadingTargets] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetError, setTargetError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    const client = new OpenRgbClient({ baseUrl, accessToken });
    listControllerModes(client, controllerId)
      .then((items) => {
        if (!isCurrent) return;
        setModes(items);
        const currentMode = items.find((mode) => mode.is_current) ?? items[0];
        if (currentMode && isDirectMode(currentMode)) {
          setIsDirectModeSelected(true);
          setDraft(null);
        } else if (currentMode) {
          setDraft(createDraft(currentMode));
        }
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load controller modes.",
          );
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    Promise.all([
      listControllerZones(client, controllerId)
        .then(async (items) => {
          if (!isCurrent) return;
          setZones(items);
          const segments = await Promise.all(
            items.map((_, zoneIndex) =>
              listZoneSegments(client, controllerId, zoneIndex),
            ),
          );
          if (isCurrent) setZoneSegments(segments);
        })
        .catch((requestError) => {
          if (isCurrent) {
            setTargetError(
              requestError instanceof Error
                ? requestError.message
                : "Could not load zones and segments.",
            );
          }
        }),
      listControllerLeds(client, controllerId)
        .then((items) => {
          if (isCurrent) {
            setLeds(items);
            setDirectColor(averageColorHex(items.map((led) => led.color)));
          }
        })
        .catch((requestError) => {
          if (isCurrent) {
            setTargetError(
              requestError instanceof Error
                ? requestError.message
                : "Could not load LEDs.",
            );
          }
        }),
    ]).finally(() => {
      if (isCurrent) setIsLoadingTargets(false);
    });

    return () => {
      isCurrent = false;
    };
  }, [accessToken, baseUrl, controllerId]);

  /**
   * Selects a named mode and initializes its editable settings.
   * @param mode Mode selected from the server-provided list.
   */
  function selectMode(mode: OpenRgbMode) {
    setIsDirectModeSelected(false);
    setDraft(createDraft(mode));
    setSelectedColorIndex(0);
    setIsModeListOpen(false);
    setError(null);
    setMessage(null);
  }

  /** Switches from named-mode settings to direct LED color controls. */
  function selectDirectMode() {
    setIsDirectModeSelected(true);
    setDraft(null);
    setIsModeListOpen(false);
    setError(null);
    setMessage(null);
  }

  /**
   * Finds the current LED colors belonging to a direct-color target.
   * @param target All LEDs, one LED, a zone, or a zone segment.
   * @returns Current colors in the selected range; missing colors are undefined.
   */
  function getTargetColors(target: DirectColorTarget) {
    if (target.kind === "all") return leds.map((led) => led.color);
    if (target.kind === "led") {
      return [leds.find((led) => led.value === target.led)?.color];
    }

    const zoneOffset = zones
      .slice(0, target.zone)
      .reduce((total, zone) => total + zone.leds, 0);
    const range =
      target.kind === "zone"
        ? { start: zoneOffset, count: zones[target.zone]?.leds ?? 0 }
        : (() => {
            const segment = zoneSegments[target.zone]?.find(
              (item) => item.index === target.segment,
            );
            return segment
              ? {
                  start: zoneOffset + segment.start_idx,
                  count: segment.num_leds,
                }
              : { start: zoneOffset, count: 0 };
          })();
    return leds
      .filter(
        (led) =>
          led.value >= range.start && led.value < range.start + range.count,
      )
      .map((led) => led.color);
  }

  /** Selects a target and seeds its picker from the target's average color. */
  function selectDirectTarget(target: DirectColorTarget) {
    setDirectTarget(target);
    setDirectColor(averageColorHex(getTargetColors(target)));
    setIsTargetListOpen(false);
  }

  /**
   * Merges one or more edited fields into the current mode draft.
   * @param update Partial draft values changed by a control.
   */
  function updateDraft(update: Partial<ModeDraft>) {
    setDraft((current) => (current ? { ...current, ...update } : current));
    setMessage(null);
  }

  /**
   * Writes the color-picker value into the currently selected color slot.
   * @param color Picker result containing a CSS hex value.
   */
  function updateColor({ hex }: ColorFormatsObject) {
    if (!draft) return;
    setDraft({
      ...draft,
      colors: draft.colors.map((color, index) =>
        index === selectedColorIndex ? hexToColor(hex) : color,
      ),
    });
    setMessage(null);
  }

  /**
   * Adds or removes a mode color while respecting the device's advertised range.
   * @param delta Number of color slots to add (positive) or remove (negative).
   */
  function changeColorCount(delta: number) {
    if (!draft) return;
    const minimum = Math.min(draft.mode.colors_min, draft.mode.colors_max);
    const maximum = Math.max(draft.mode.colors_min, draft.mode.colors_max);
    const nextCount = Math.max(
      minimum,
      Math.min(maximum, draft.colors.length + delta),
    );
    const colors = draft.colors.slice(0, nextCount);
    while (colors.length < nextCount) {
      colors.push({ R: 255, G: 255, B: 255 });
    }
    setDraft({ ...draft, colors });
    setSelectedColorIndex(
      Math.min(selectedColorIndex, Math.max(colors.length - 1, 0)),
    );
    setMessage(null);
  }

  /**
   * Sends the current mode draft and updates local selection after success.
   * Server failures are shown through the editor's error state.
   * @returns Resolves after the request completes; does not rethrow API failures.
   */
  async function applyMode() {
    if (!draft) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await setControllerMode(
        new OpenRgbClient({ baseUrl, accessToken }),
        controllerId,
        {
          mode: draft.mode.name,
          brightness: draft.brightness,
          speed: draft.speed,
          direction: draft.direction,
          colors: draft.colorMode === COLOR_MODE_RANDOM ? [] : draft.colors,
          color_mode: draft.colorMode,
          save_to_device: draft.saveToDevice,
        },
      );
      setModes((current) =>
        current.map((mode) => ({
          ...mode,
          is_current: mode.name === draft.mode.name,
        })),
      );
      setMessage(`${draft.mode.name} applied.`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not apply this mode.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Applies the selected color to the current LED target.
   * A server failure is captured in the editor's error state.
   * @returns Resolves after the request completes; does not rethrow API failures.
   */
  async function applyDirectColor() {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const target: ControllerColorTarget | undefined =
        directTarget.kind === "all"
          ? undefined
          : directTarget.kind === "zone"
            ? { zone: directTarget.zone }
            : directTarget.kind === "segment"
              ? {
                  zone: directTarget.zone,
                  segment: directTarget.segment,
                }
              : { led: directTarget.led };
      await setControllerColor(
        new OpenRgbClient({ baseUrl, accessToken }),
        controllerId,
        (() => {
          const { R, G, B } = hexToColor(directColor);
          return { r: R, g: G, b: B };
        })(),
        target,
      );
      setModes((current) =>
        current.map((mode) => ({ ...mode, is_current: false })),
      );
      setMessage(`Direct color applied to ${directTargetLabel}.`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not apply direct color.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const directions = draft
    ? [
        ...(draft.mode.supports_direction_lr
          ? [
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
            ]
          : []),
        ...(draft.mode.supports_direction_ud
          ? [
              { value: "up", label: "Up" },
              { value: "down", label: "Down" },
            ]
          : []),
        ...(draft.mode.supports_direction_hv
          ? [
              { value: "horizontal", label: "Horizontal" },
              { value: "vertical", label: "Vertical" },
            ]
          : []),
      ]
    : [];
  const colorModes = draft
    ? [
        ...(draft.mode.supports_unique_led_color
          ? [{ value: COLOR_MODE_PER_LED, label: "Per LED" }]
          : []),
        ...(draft.mode.supports_mode_color
          ? [{ value: COLOR_MODE_SPECIFIC, label: "Mode colors" }]
          : []),
        ...(draft.mode.supports_random_color
          ? [{ value: COLOR_MODE_RANDOM, label: "Random" }]
          : []),
      ]
    : [];
  const directTargetLabel =
    directTarget.kind === "all"
      ? "all LEDs"
      : directTarget.kind === "zone"
        ? (zones.find((zone, index) => index === directTarget.zone)?.name ??
          `zone ${directTarget.zone + 1}`)
        : directTarget.kind === "segment"
          ? `${zones[directTarget.zone]?.name ?? `Zone ${directTarget.zone + 1}`} / ${zoneSegments[directTarget.zone]?.find((segment) => segment.index === directTarget.segment)?.name ?? `Segment ${directTarget.segment + 1}`}`
          : (leds.find((led) => led.value === directTarget.led)?.name ??
            `LED ${directTarget.led + 1}`);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <ThemedText type="smallBold">Lighting mode</ThemedText>
        </View>

        {isLoading ? <ActivityIndicator color={theme.text} /> : null}
        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
        {message ? (
          <ThemedText style={styles.success}>{message}</ThemedText>
        ) : null}
        {!isLoading && modes.length === 0 && !error && !isDirectModeSelected ? (
          <ThemedText themeColor="textSecondary">
            No modes are available.
          </ThemedText>
        ) : null}

        {!isLoading ? (
          <View
            style={[
              styles.modeSelector,
              { borderColor: theme.backgroundSelected },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Lighting mode: ${isDirectModeSelected ? "Direct" : (draft?.mode.name ?? "Choose a mode")}`}
              accessibilityState={{ expanded: isModeListOpen }}
              onPress={() => setIsModeListOpen((isOpen) => !isOpen)}
              style={styles.modeSelectButton}
            >
              <ThemedText type="smallBold" numberOfLines={1}>
                {isDirectModeSelected
                  ? "Direct"
                  : (draft?.mode.name ?? "Choose a mode")}
              </ThemedText>
              <SymbolView
                name={
                  isModeListOpen
                    ? {
                        ios: "chevron.up",
                        android: "expand_less",
                        web: "expand_less",
                      }
                    : {
                        ios: "chevron.down",
                        android: "expand_more",
                        web: "expand_more",
                      }
                }
                tintColor={theme.text}
                size={18}
              />
            </Pressable>
            {isModeListOpen ? (
              <View
                style={[
                  styles.modeOptions,
                  { borderTopColor: theme.backgroundSelected },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isDirectModeSelected }}
                  onPress={selectDirectMode}
                  style={[
                    styles.modeOption,
                    {
                      backgroundColor: isDirectModeSelected
                        ? theme.backgroundElement
                        : "transparent",
                    },
                  ]}
                >
                  <ThemedText type="smallBold" numberOfLines={1}>
                    Direct
                  </ThemedText>
                  {isDirectModeSelected ? (
                    <SymbolView
                      name={{
                        ios: "checkmark",
                        android: "check",
                        web: "check",
                      }}
                      tintColor={theme.text}
                      size={18}
                    />
                  ) : null}
                </Pressable>
                {modes
                  .filter((mode) => !isDirectMode(mode))
                  .map((mode) => {
                    const selected =
                      !isDirectModeSelected && mode.name === draft?.mode.name;
                    return (
                      <Pressable
                        key={mode.name}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => selectMode(mode)}
                        style={[
                          styles.modeOption,
                          {
                            backgroundColor: selected
                              ? theme.backgroundElement
                              : "transparent",
                          },
                        ]}
                      >
                        <ThemedText type="smallBold" numberOfLines={1}>
                          {mode.name}
                        </ThemedText>
                        {selected ? (
                          <SymbolView
                            name={{
                              ios: "checkmark",
                              android: "check",
                              web: "check",
                            }}
                            tintColor={theme.text}
                            size={18}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
              </View>
            ) : null}
          </View>
        ) : null}

        {isDirectModeSelected ? (
          <View style={styles.settingGroup}>
            <View style={styles.modeLabel}>
              <ThemedText type="smallBold">Direct color</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Apply one solid color to all LEDs, a zone, or an individual LED.
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Color target: ${directTargetLabel}`}
              accessibilityState={{ expanded: isTargetListOpen }}
              onPress={() => setIsTargetListOpen((isOpen) => !isOpen)}
              style={[
                styles.targetSelectButton,
                { borderColor: theme.backgroundSelected },
              ]}
            >
              <ThemedText type="smallBold" numberOfLines={1}>
                {directTargetLabel}
              </ThemedText>
              <SymbolView
                name={
                  isTargetListOpen
                    ? {
                        ios: "chevron.up",
                        android: "expand_less",
                        web: "expand_less",
                      }
                    : {
                        ios: "chevron.down",
                        android: "expand_more",
                        web: "expand_more",
                      }
                }
                tintColor={theme.text}
                size={18}
              />
            </Pressable>
            {isTargetListOpen ? (
              <ScrollView
                style={styles.targetOptions}
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                <TargetOption
                  label="All LEDs"
                  selected={directTarget.kind === "all"}
                  onPress={() => {
                    selectDirectTarget({ kind: "all" });
                  }}
                />
                {zones.map((zone, index) => (
                  <TargetOption
                    key={`zone-${index}`}
                    label={`Zone: ${zone.name}`}
                    selected={
                      directTarget.kind === "zone" &&
                      directTarget.zone === index
                    }
                    onPress={() => {
                      selectDirectTarget({ kind: "zone", zone: index });
                    }}
                  />
                ))}
                {zoneSegments.flatMap((segments, zoneIndex) =>
                  segments.map((segment) => (
                    <TargetOption
                      key={`segment-${zoneIndex}-${segment.index}`}
                      label={`Segment: ${zones[zoneIndex]?.name ?? `Zone ${zoneIndex + 1}`} / ${segment.name}`}
                      selected={
                        directTarget.kind === "segment" &&
                        directTarget.zone === zoneIndex &&
                        directTarget.segment === segment.index
                      }
                      onPress={() => {
                        selectDirectTarget({
                          kind: "segment",
                          zone: zoneIndex,
                          segment: segment.index,
                        });
                      }}
                    />
                  )),
                )}
                {leds.map((led) => (
                  <TargetOption
                    key={`led-${led.value}`}
                    label={`LED ${led.value + 1}: ${led.name}`}
                    selected={
                      directTarget.kind === "led" &&
                      directTarget.led === led.value
                    }
                    onPress={() => {
                      selectDirectTarget({ kind: "led", led: led.value });
                    }}
                  />
                ))}
              </ScrollView>
            ) : null}
            {isLoadingTargets ? <ActivityIndicator color={theme.text} /> : null}
            {targetError ? (
              <ThemedText style={styles.error}>{targetError}</ThemedText>
            ) : null}
            <ColorPicker
              value={directColor}
              onChangeJS={({ hex }) => {
                setDirectColor(hex);
                setMessage(null);
              }}
              style={styles.picker}
              thumbSize={18}
              sliderThickness={18}
            >
              <Preview style={styles.preview} />
              <Panel1 style={styles.panel} />
              <HueSlider style={styles.hue} />
            </ColorPicker>
            <Pressable
              accessibilityRole="button"
              disabled={
                isSaving || (isLoadingTargets && directTarget.kind !== "all")
              }
              onPress={applyDirectColor}
              style={[
                styles.applyButton,
                { backgroundColor: theme.text, opacity: isSaving ? 0.65 : 1 },
              ]}
            >
              {isSaving ? (
                <ActivityIndicator color={theme.background} />
              ) : (
                <ThemedText
                  type="smallBold"
                  style={{ color: theme.background }}
                >
                  Apply direct color
                </ThemedText>
              )}
            </Pressable>
          </View>
        ) : null}

        {draft?.mode.supports_speed ? (
          <View style={styles.settingGroup}>
            <ThemedText type="smallBold">Speed</ThemedText>
            <View style={styles.optionRow}>
              {speedPresets.map((preset) => (
                <OptionButton
                  key={preset.value}
                  label={preset.label}
                  selected={draft.speedPreset === preset.value}
                  onPress={() =>
                    updateDraft({
                      speedPreset: preset.value,
                      speed: speedForPreset(draft.mode, preset.value),
                    })
                  }
                />
              ))}
            </View>
          </View>
        ) : null}

        {directions.length > 0 ? (
          <View style={styles.settingGroup}>
            <ThemedText type="smallBold">Direction</ThemedText>
            <View style={styles.optionRow}>
              {directions.map((direction) => (
                <OptionButton
                  key={direction.value}
                  label={direction.label}
                  selected={draft?.direction === direction.value}
                  onPress={() => updateDraft({ direction: direction.value })}
                />
              ))}
            </View>
          </View>
        ) : null}

        {colorModes.length > 0 && draft ? (
          <View style={styles.settingGroup}>
            <ThemedText type="smallBold">Color behavior</ThemedText>
            <View style={styles.optionRow}>
              {colorModes.map((colorMode) => (
                <OptionButton
                  key={colorMode.value}
                  label={colorMode.label}
                  selected={draft.colorMode === colorMode.value}
                  onPress={() => updateDraft({ colorMode: colorMode.value })}
                />
              ))}
            </View>
          </View>
        ) : null}

        {draft &&
        draft.colorMode !== COLOR_MODE_RANDOM &&
        (draft.mode.supports_unique_led_color ||
          draft.mode.supports_mode_color) ? (
          <View style={styles.settingGroup}>
            <View style={styles.colorHeading}>
              <View style={styles.modeLabel}>
                <ThemedText type="smallBold">Colors</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {draft.mode.colors_min} to {draft.mode.colors_max} supported
                </ThemedText>
              </View>
              {draft.mode.colors_max > draft.mode.colors_min ? (
                <View style={styles.colorCount}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Remove a mode color"
                    disabled={draft.colors.length <= draft.mode.colors_min}
                    onPress={() => changeColorCount(-1)}
                    style={styles.stepButton}
                  >
                    <ThemedText type="smallBold">-</ThemedText>
                  </Pressable>
                  <ThemedText type="smallBold">
                    {draft.colors.length}
                  </ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add a mode color"
                    disabled={draft.colors.length >= draft.mode.colors_max}
                    onPress={() => changeColorCount(1)}
                    style={styles.stepButton}
                  >
                    <ThemedText type="smallBold">+</ThemedText>
                  </Pressable>
                </View>
              ) : null}
            </View>
            {draft.colors.length > 0 ? (
              <View style={styles.swatches}>
                {draft.colors.map((color, index) => (
                  <Pressable
                    key={index}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit color ${index + 1}`}
                    accessibilityState={{
                      selected: selectedColorIndex === index,
                    }}
                    onPress={() => setSelectedColorIndex(index)}
                    style={[
                      styles.swatch,
                      {
                        backgroundColor: colorToHex(color),
                        borderColor:
                          selectedColorIndex === index
                            ? theme.text
                            : theme.backgroundSelected,
                      },
                    ]}
                  />
                ))}
              </View>
            ) : null}
            {draft.colors[selectedColorIndex] ? (
              <ColorPicker
                key={`${draft.mode.name}-${selectedColorIndex}`}
                value={colorToHex(draft.colors[selectedColorIndex])}
                onChangeJS={updateColor}
                style={styles.picker}
                thumbSize={18}
                sliderThickness={18}
              >
                <Preview style={styles.preview} />
                <Panel1 style={styles.panel} />
                <HueSlider style={styles.hue} />
              </ColorPicker>
            ) : null}
          </View>
        ) : null}

        {draft ? (
          <View
            style={[
              styles.saveDeviceRow,
              { borderTopColor: theme.backgroundSelected },
            ]}
          >
            <View style={styles.modeLabel}>
              <ThemedText type="smallBold">Save to device</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Store this mode on the controller.
              </ThemedText>
            </View>
            <Switch
              value={draft.saveToDevice}
              onValueChange={(saveToDevice) => updateDraft({ saveToDevice })}
              trackColor={{ true: theme.text, false: theme.backgroundSelected }}
            />
          </View>
        ) : null}

        {draft ? (
          <Pressable
            accessibilityRole="button"
            disabled={isSaving || isLoading}
            onPress={applyMode}
            style={[
              styles.applyButton,
              { backgroundColor: theme.text, opacity: isSaving ? 0.65 : 1 },
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                Apply mode
              </ThemedText>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

/** Renders one selectable option used by mode settings. */
function OptionButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.optionButton,
        {
          backgroundColor: selected ? theme.text : theme.backgroundElement,
          borderColor: selected ? theme.text : theme.backgroundSelected,
        },
      ]}
    >
      <ThemedText
        type="small"
        style={{ color: selected ? theme.background : theme.text }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** Renders a target row and indicates the current direct-color destination. */
function TargetOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.targetOption,
        {
          backgroundColor: selected ? theme.backgroundElement : "transparent",
        },
      ]}
    >
      <ThemedText type="smallBold" numberOfLines={1}>
        {label}
      </ThemedText>
      {selected ? (
        <SymbolView
          name={{ ios: "checkmark", android: "check", web: "check" }}
          tintColor={theme.text}
          size={18}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  container: {
    gap: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
  },
  backButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  heading: { gap: Spacing.one },
  modeSelector: {
    borderWidth: 1,
    borderRadius: 6,
    overflow: "hidden",
  },
  modeSelectButton: {
    minHeight: 48,
    paddingHorizontal: Spacing.two,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  modeOptions: { borderTopWidth: StyleSheet.hairlineWidth },
  modeOption: {
    minHeight: 44,
    paddingHorizontal: Spacing.two,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  modeLabel: { flex: 1, gap: Spacing.one },
  targetSelectButton: {
    minHeight: 44,
    paddingHorizontal: Spacing.two,
    borderWidth: 1,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  targetOptions: {
    maxHeight: 220,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
  },
  targetOption: {
    minHeight: 44,
    paddingHorizontal: Spacing.two,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  settingGroup: { gap: Spacing.two },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  optionButton: {
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(128, 128, 128, 0.12)",
  },
  colorHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  colorCount: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  swatch: { width: 38, height: 38, borderRadius: 6, borderWidth: 2 },
  picker: { width: "100%", gap: Spacing.two },
  preview: { height: 34 },
  panel: { width: "100%", height: 142, borderRadius: 6 },
  hue: { width: "100%", height: 22, borderRadius: 11 },
  saveDeviceRow: {
    minHeight: 64,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  applyButton: {
    minHeight: 48,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  error: { color: "#C0392B" },
  success: { color: "#23804D" },
});
