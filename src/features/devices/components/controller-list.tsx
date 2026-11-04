import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { ThemedText } from "@/components/themed-text";
import { ControllerColorPicker } from "@/features/devices/components/controller-color-picker";
import { OpenRgbController } from "@/features/devices/types";
import { ControllerListItem } from "@/features/devices/components/controller-list-item";
import { useTheme } from "@/hooks/use-theme";
import { styles } from "@/features/home/styles";

type Devices = { controllers: OpenRgbController[]; error: string | null; isLoading: boolean; refresh: () => void };

/**
 * Shows discovered controllers, refresh controls, and global color actions.
 * @param props Device data, server credentials, and row/picker callbacks.
 * @returns Scrollable controller list and related loading/error states.
 */
export function ControllerList({ baseUrl, accessToken, devices, error, colorControllerId, onColorControllerChange, isGlobalColorPickerOpen, onGlobalPickerToggle, onGlobalPickerClose, onSelectController }: {
  baseUrl: string; accessToken: string; devices: Devices; error: string | null;
  colorControllerId: number | null; onColorControllerChange: (id: number | null) => void;
  isGlobalColorPickerOpen: boolean; onGlobalPickerToggle: () => void; onGlobalPickerClose: () => void;
  onSelectController: (controller: OpenRgbController) => void;
}) {
  const theme = useTheme();
  return (
<ScrollView
              style={styles.tabScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            >
              <View style={styles.sectionHeader}>
                <ThemedText type="subtitle" style={{ fontSize: 22, lineHeight: 28 }}>Controllers</ThemedText>

                <View style={styles.controllerHeaderActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Set color for all controllers"
                    accessibilityState={{
                      expanded: isGlobalColorPickerOpen,
                    }}
                    onPress={() => {
                      onGlobalPickerToggle();
                      onColorControllerChange(null);
                    }}
                    style={[
                      styles.headerIconButton,
                      isGlobalColorPickerOpen && {
                        backgroundColor: theme.backgroundSelected,
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
                      size={20}
                    />
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Refresh controllers"
                    onPress={devices.refresh}
                    style={styles.headerIconButton}
                  >
                    <SymbolView
                      name={{
                        ios: "arrow.clockwise",
                        android: "refresh",
                        web: "refresh",
                      }}
                      tintColor={theme.text}
                      size={18}
                    />
                  </Pressable>
                </View>
              </View>

              {isGlobalColorPickerOpen ? (
                <ControllerColorPicker
                  key={`${baseUrl}-global-color`}
                  baseUrl={baseUrl}
                  accessToken={accessToken}
                  controllerId={devices.controllers[0]?.id ?? 0}
                  controllers={devices.controllers}
                  visible
                  onClose={() => onGlobalPickerClose()}
                />
              ) : null}

              {devices.isLoading ? (
                <ActivityIndicator style={styles.loading} color={theme.text} />
              ) : null}

              {devices.error ? (
                <View style={styles.messageBlock}>
                  <ThemedText style={styles.errorText}>
                    {devices.error}
                  </ThemedText>
                  <Pressable onPress={devices.refresh}>
                    <ThemedText type="smallBold">Try again</ThemedText>
                  </Pressable>
                </View>
              ) : null}

              {error ? (
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              ) : null}

              {!devices.isLoading &&
              !devices.error &&
              devices.controllers.length === 0 ? (
                <ThemedText themeColor="textSecondary">
                  No controllers found.
                </ThemedText>
              ) : null}

              {devices.controllers.map((controller) => (
                <ControllerListItem
                  key={controller.id}
                  controller={controller}
                  baseUrl={baseUrl}
                  accessToken={accessToken}
                  colorControllerId={colorControllerId}
                  onColorControllerChange={onColorControllerChange}
                  onGlobalPickerClose={onGlobalPickerClose}
                  onSelectController={onSelectController}
                />
              ))}
            </ScrollView>
  );
}
