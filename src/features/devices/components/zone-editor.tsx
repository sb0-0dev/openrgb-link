import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import {
    listControllerZones,
    listZoneSegments,
    OpenRgbSegment,
    OpenRgbZone,
    replaceZoneSegments,
    resizeControllerZone,
} from "@/features/devices/api";
import { useTheme } from "@/hooks/use-theme";
import { OpenRgbClient } from "@/services/openrgb/client";

/** Editable segment shape; the stable key is local UI identity only. */
type SegmentDraft = Omit<OpenRgbSegment, "start_idx"> & { key: string };

/**
 * Returns the number of LEDs currently assigned across a zone's draft segments.
 * @param segments Draft segment values.
 * @returns Sum of each segment's LED count.
 */
function assignedLedCount(segments: SegmentDraft[]) {
  return segments.reduce((total, segment) => total + segment.num_leds, 0);
}

/**
 * Checks the constraints required before replacing a zone's segments.
 * @param segments Draft segments to validate.
 * @param zone Zone whose LED count must be fully assigned.
 * @returns True only when all segment counts are positive integers and sum to the zone size.
 */
function canSaveSegments(segments: SegmentDraft[], zone: OpenRgbZone) {
  return (
    segments.length === 0 ||
    (assignedLedCount(segments) === zone.leds &&
      segments.every(
        (segment) => Number.isInteger(segment.num_leds) && segment.num_leds > 0,
      ))
  );
}

type ZoneEditorProps = {
  baseUrl: string;
  accessToken: string;
  controllerId: number;
};

/**
 * Edits zone sizes and segment layouts for one controller.
 * @param props Server credentials and controller ID.
 * @returns Scrollable zone and segment editor.
 */
export function ZoneEditor({
  baseUrl,
  accessToken,
  controllerId,
}: ZoneEditorProps) {
  const theme = useTheme();
  const [zones, setZones] = useState<OpenRgbZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resizingIndex, setResizingIndex] = useState<number | null>(null);
  const [resizeValue, setResizeValue] = useState("");
  const [editingSegmentsIndex, setEditingSegmentsIndex] = useState<
    number | null
  >(null);
  const [segments, setSegments] = useState<SegmentDraft[]>([]);
  const [loadedSegmentsIndex, setLoadedSegmentsIndex] = useState<number | null>(
    null,
  );
  const [isLoadingSegments, setIsLoadingSegments] = useState(false);
  const [isSavingSegments, setIsSavingSegments] = useState(false);
  const segmentLoadRequestId = useRef(0);

  useEffect(() => {
    let isCurrent = true;
    listControllerZones(
      new OpenRgbClient({ baseUrl, accessToken }),
      controllerId,
    )
      .then((items) => {
        if (isCurrent) setZones(items);
      })
      .catch((requestError) => {
        if (isCurrent) {
          setLoadingError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load zones.",
          );
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [accessToken, baseUrl, controllerId]);

  /** Reloads the zone list after a layout mutation. */
  async function reloadZones() {
    const items = await listControllerZones(
      new OpenRgbClient({ baseUrl, accessToken }),
      controllerId,
    );
    setZones(items);
  }

  /**
   * Validates and applies the pending LED count for one zone.
   * @param zone Zone being resized.
   * @param zoneIndex Zero-based position used for local edit state.
   * @returns Resolves after the request and reload; errors are stored in the editor.
   * API and validation errors are displayed in the editor instead of rethrown.
   */
  async function saveZoneSize(zone: OpenRgbZone, zoneIndex: number) {
    const size = Number(resizeValue);
    if (!Number.isInteger(size) || size < 1) {
      setError("Enter a whole number of LEDs greater than zero.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await resizeControllerZone(
        new OpenRgbClient({ baseUrl, accessToken }),
        controllerId,
        zone.name,
        size,
      );
      await reloadZones();
      setResizingIndex(null);
      setMessage(`${zone.name} resized to ${size} LEDs.`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not resize this zone.",
      );
    } finally {
      setBusy(false);
    }
  }

  /**
   * Opens a zone's segment editor or closes it if already selected.
   * @param zoneIndex Zero-based zone index to load from the server.
   */
  async function openSegments(zoneIndex: number) {
    if (editingSegmentsIndex === zoneIndex) {
      segmentLoadRequestId.current += 1;
      setEditingSegmentsIndex(null);
      setLoadedSegmentsIndex(null);
      setIsLoadingSegments(false);
      return;
    }

    const requestId = ++segmentLoadRequestId.current;
    setEditingSegmentsIndex(zoneIndex);
    setLoadedSegmentsIndex(null);
    setSegments([]);
    setIsLoadingSegments(true);
    setError(null);
    setMessage(null);
    try {
      const items = await listZoneSegments(
        new OpenRgbClient({ baseUrl, accessToken }),
        controllerId,
        zoneIndex,
      );
      if (requestId === segmentLoadRequestId.current) {
        setLoadedSegmentsIndex(zoneIndex);
        setSegments(
          [...items]
            .sort((left, right) => left.start_idx - right.start_idx)
            .map((segment) => ({
              key: `existing-${segment.index}`,
              name: segment.name,
              segment_type: segment.segment_type,
              num_leds: segment.num_leds,
            })),
        );
      }
    } catch (requestError) {
      if (requestId === segmentLoadRequestId.current) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not load zone segments.",
        );
      }
    } finally {
      if (requestId === segmentLoadRequestId.current) {
        setIsLoadingSegments(false);
      }
    }
  }

  /**
   * Adds a draft segment initialized with the zone's unassigned LED count.
   * @param zone Zone whose remaining LEDs initialize the new segment.
   */
  function addSegment(zone: OpenRgbZone) {
    const remainingLeds = Math.max(0, zone.leds - assignedLedCount(segments));
    setSegments((current) => [
      ...current,
      {
        key: `new-${Date.now()}`,
        name: "",
        segment_type: 0,
        num_leds: remainingLeds,
      },
    ]);
  }

  /**
   * Updates one named segment field, coercing invalid LED counts to zero.
   * @param key Stable local key identifying the segment draft.
   * @param field Segment property being edited.
   * @param value Text input value before numeric validation.
   */
  function updateSegment(
    key: string,
    field: "name" | "num_leds",
    value: string,
  ) {
    setSegments((current) =>
      current.map((segment) => {
        if (segment.key !== key) return segment;
        if (field === "name") return { ...segment, name: value };
        const numericValue = value === "" ? 0 : Number(value);
        return {
          ...segment,
          [field]: Number.isFinite(numericValue) ? numericValue : 0,
        };
      }),
    );
  }

  /**
   * Validates, normalizes, and replaces a zone's segment layout.
   * Segment starts are recalculated sequentially from zero before the API call.
   * @param zone Zone whose total LED count constrains the segments.
   * @param zoneIndex Zero-based API zone index.
   * API and validation errors are exposed through editor state.
   */
  async function saveSegments(zone: OpenRgbZone, zoneIndex: number) {
    if (loadedSegmentsIndex !== zoneIndex) return;
    if (!canSaveSegments(segments, zone)) {
      setError(`Assign exactly ${zone.leds} LEDs across the segments.`);
      return;
    }

    let nextStart = 0;
    const normalizedSegments: OpenRgbSegment[] = segments.map(
      ({ key: _key, ...segment }, index) => {
        const normalized = {
          ...segment,
          name: segment.name.trim() || `Segment ${index + 1}`,
          start_idx: nextStart,
        };
        nextStart += segment.num_leds;
        return normalized;
      },
    );

    setIsSavingSegments(true);
    setError(null);
    setMessage(null);
    try {
      await replaceZoneSegments(
        new OpenRgbClient({ baseUrl, accessToken }),
        controllerId,
        zoneIndex,
        zone.leds,
        normalizedSegments,
      );
      await reloadZones();
      setEditingSegmentsIndex(null);
      setMessage(`Segments updated for ${zone.name}.`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not update zone segments.",
      );
    } finally {
      setIsSavingSegments(false);
    }
  }

  /**
   * Returns whether segment saving is blocked by loading, saving, or validation.
   * @param zone Zone whose LED total is used by the segment validation.
   * @returns True when saving is unavailable.
   */
  function isSegmentSaveDisabled(zone: OpenRgbZone, zoneIndex: number) {
    return (
      isSavingSegments ||
      isLoadingSegments ||
      loadedSegmentsIndex !== zoneIndex ||
      !canSaveSegments(segments, zone)
    );
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
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="smallBold">Zone layout</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Resize zones and define LED segments.
        </ThemedText>

        {isLoading ? <ActivityIndicator color={theme.text} /> : null}
        {loadingError ? (
          <ThemedText style={styles.error}>{loadingError}</ThemedText>
        ) : null}
        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
        {message ? (
          <ThemedText style={styles.success}>{message}</ThemedText>
        ) : null}

        {!isLoading && zones.length === 0 ? (
          <ThemedText themeColor="textSecondary">
            No zones are available.
          </ThemedText>
        ) : null}

        {zones.map((zone, zoneIndex) => (
          <View
            key={`${zoneIndex}-${zone.name}`}
            style={[
              styles.zone,
              { borderBottomColor: theme.backgroundSelected },
            ]}
          >
            <View style={styles.zoneHeader}>
              <View style={styles.zoneName}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {zone.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {zone.leds} LEDs · {zone.segments} segments
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Resize ${zone.name}`}
                onPress={() => {
                  setError(null);
                  setMessage(null);
                  setResizeValue(String(zone.leds));
                  setResizingIndex((current) =>
                    current === zoneIndex ? null : zoneIndex,
                  );
                }}
                style={styles.zoneAction}
              >
                <SymbolView
                  name={{
                    ios: "slider.horizontal.3",
                    android: "tune",
                    web: "tune",
                  }}
                  tintColor={theme.text}
                  size={17}
                />
                <ThemedText type="smallBold">Resize</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  expanded: editingSegmentsIndex === zoneIndex,
                }}
                onPress={() => openSegments(zoneIndex)}
                style={styles.zoneAction}
              >
                <SymbolView
                  name={{
                    ios: "square.split.2x2",
                    android: "view_agenda",
                    web: "view_agenda",
                  }}
                  tintColor={theme.text}
                  size={17}
                />
                <ThemedText type="smallBold">Segments</ThemedText>
              </Pressable>
            </View>

            {resizingIndex === zoneIndex ? (
              <View style={styles.resizeForm}>
                <TextInput
                  accessibilityLabel={`LED count for ${zone.name}`}
                  keyboardType="number-pad"
                  onChangeText={setResizeValue}
                  selectTextOnFocus
                  style={[inputStyle, styles.sizeInput]}
                  value={resizeValue}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => saveZoneSize(zone, zoneIndex)}
                  style={[
                    styles.primaryButton,
                    { backgroundColor: busy ? "#777777" : theme.text },
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color={theme.background} />
                  ) : (
                    <ThemedText
                      type="smallBold"
                      style={{ color: busy ? "#FFFFFF" : theme.background }}
                    >
                      Save
                    </ThemedText>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setResizingIndex(null)}
                  style={styles.cancelButton}
                >
                  <ThemedText type="small" themeColor="textSecondary">
                    Cancel
                  </ThemedText>
                </Pressable>
              </View>
            ) : null}

            {editingSegmentsIndex === zoneIndex ? (
              <View style={styles.segmentEditor}>
                {isLoadingSegments ? (
                  <ActivityIndicator color={theme.text} />
                ) : null}
                {!isLoadingSegments && segments.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    No segments defined.
                  </ThemedText>
                ) : null}
                {segments.map((segment, segmentIndex) => {
                  const startIndex = segments
                    .slice(0, segmentIndex)
                    .reduce((total, item) => total + item.num_leds, 0);
                  const lastIndex = startIndex + segment.num_leds - 1;
                  return (
                    <View key={segment.key} style={styles.segmentRow}>
                      <View style={styles.segmentFields}>
                        <TextInput
                          accessibilityLabel={`Segment ${segmentIndex + 1} name`}
                          onChangeText={(value) =>
                            updateSegment(segment.key, "name", value)
                          }
                          placeholder="Segment name"
                          placeholderTextColor={theme.textSecondary}
                          style={[inputStyle, styles.segmentNameInput]}
                          value={segment.name}
                        />
                        <TextInput
                          accessibilityLabel={`LED count for segment ${segmentIndex + 1}`}
                          keyboardType="number-pad"
                          onChangeText={(value) =>
                            updateSegment(segment.key, "num_leds", value)
                          }
                          placeholder="LED count"
                          placeholderTextColor={theme.textSecondary}
                          style={[inputStyle, styles.segmentCountInput]}
                          value={String(segment.num_leds)}
                        />
                        <ThemedText type="small" themeColor="textSecondary">
                          {segment.num_leds > 0
                            ? `LEDs ${startIndex}-${lastIndex}`
                            : "No LEDs assigned"}
                        </ThemedText>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove segment ${segment.name || segmentIndex + 1}`}
                        onPress={() =>
                          setSegments((current) =>
                            current.filter(({ key }) => key !== segment.key),
                          )
                        }
                        style={styles.removeSegmentButton}
                      >
                        <SymbolView
                          name={{
                            ios: "minus.circle",
                            android: "remove_circle_outline",
                            web: "remove_circle_outline",
                          }}
                          tintColor="#C0392B"
                          size={20}
                        />
                      </Pressable>
                    </View>
                  );
                })}
                <Pressable
                  onPress={() => addSegment(zone)}
                  style={styles.addSegmentButton}
                >
                  <SymbolView
                    name={{ ios: "plus", android: "add", web: "add" }}
                    tintColor={theme.text}
                    size={17}
                  />
                  <ThemedText type="smallBold">Add segment</ThemedText>
                </Pressable>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {assignedLedCount(segments)} / {zone.leds} LEDs assigned
                </ThemedText>
                <View style={styles.segmentSaveActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSegmentSaveDisabled(zone, zoneIndex)}
                    onPress={() => saveSegments(zone, zoneIndex)}
                    style={[
                      styles.primaryButton,
                      {
                        backgroundColor: isSegmentSaveDisabled(zone, zoneIndex)
                          ? "#777777"
                          : theme.text,
                      },
                    ]}
                  >
                    {isSavingSegments ? (
                      <ActivityIndicator color={theme.background} />
                    ) : (
                      <ThemedText
                        type="smallBold"
                        style={{
                          color: isSegmentSaveDisabled(zone, zoneIndex)
                            ? "#FFFFFF"
                            : theme.background,
                        }}
                      >
                        Save segments
                      </ThemedText>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => setEditingSegmentsIndex(null)}
                    style={styles.cancelButton}
                  >
                    <ThemedText type="small" themeColor="textSecondary">
                      Cancel
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  container: { gap: Spacing.two, paddingBottom: Spacing.four },
  backButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  zone: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  zoneHeader: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  zoneName: { flex: 1, gap: Spacing.one },
  zoneAction: {
    minHeight: 40,
    paddingHorizontal: Spacing.two,
    borderRadius: 6,
    backgroundColor: "rgba(128,128,128,0.12)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one,
  },
  resizeForm: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: Spacing.two,
    fontSize: 15,
  },
  sizeInput: { flex: 1 },
  primaryButton: {
    minHeight: 44,
    minWidth: 76,
    paddingHorizontal: Spacing.three,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: Spacing.one,
  },
  segmentEditor: { gap: Spacing.two, paddingTop: Spacing.two },
  segmentRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  segmentFields: { flex: 1, gap: Spacing.two },
  segmentNameInput: { width: "100%" },
  segmentCountInput: { width: "100%" },
  removeSegmentButton: {
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  addSegmentButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  segmentSaveActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  error: { color: "#C0392B" },
  success: { color: "#247A45" },
});
