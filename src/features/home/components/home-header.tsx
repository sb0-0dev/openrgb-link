import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ServerProfile } from "@/features/connection/storage";
import { styles } from "@/features/home/styles";
import { useTheme } from "@/hooks/use-theme";

/**
 * Persistent app header; its back action follows the current controller view.
 * @param props Active server/controller state and header action callbacks.
 * @returns App header with contextual back navigation and global actions.
 */
export function HomeHeader({ activeProfile, activeTab, selectedController, isModeEditorOpen, isZoneEditorOpen, mode, onBackToControllers, onBackToControllerSettings, onDisconnect, onToggleTheme, onAddServer }: {
  activeProfile: ServerProfile | null; activeTab: "controllers" | "effects" | "profiles";
  selectedController: { id: number } | null; mode: "light" | "dark";
  isModeEditorOpen: boolean; isZoneEditorOpen: boolean; onBackToControllerSettings: () => void;
  onBackToControllers: () => void; onDisconnect: () => void; onToggleTheme: () => void; onAddServer: () => void;
}) {
  const theme = useTheme();
  return (
    <>
        <View style={styles.header}>
          {activeProfile &&
          activeTab === "controllers" &&
          selectedController ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isModeEditorOpen || isZoneEditorOpen ? "Back to controller settings" : "Back to all controllers"}
              onPress={() => isModeEditorOpen || isZoneEditorOpen ? onBackToControllerSettings() : onBackToControllers()}
              style={styles.controllerHeaderBack}
            >
              <SymbolView
                name={{
                  ios: "chevron.left",
                  android: "arrow_back",
                  web: "arrow_back",
                }}
                tintColor={theme.text}
                size={24}
              />
              <ThemedText type="smallBold">{isZoneEditorOpen ? "Controllers settings" : isModeEditorOpen ? "Controller settings" : "All controllers"}</ThemedText>
            </Pressable>
          ) : (
            <>
              {activeProfile && (activeTab === "controllers" || activeTab === "profiles" || activeTab === "effects") ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Back to server profiles"
                  onPress={() => {
                    onDisconnect();
                  }}
                  style={styles.headerIconButton}
                >
                  <SymbolView
                    name={{
                      ios: "chevron.left",
                      android: "arrow_back",
                      web: "arrow_back",
                    }}
                    tintColor={theme.text}
                    size={30}
                  />
                </Pressable>
              ) : null}

              <View style={styles.headerTitle}>
                {!activeProfile ? (
                  <View style={styles.brandLabel}>
                    <Image
                      source={require("../../../../assets/images/OpenRGB.png")}
                      style={styles.brandIcon}
                      contentFit="contain"
                      accessibilityLabel="OpenRGB logo"
                    />
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      OPENRGB LINK
                    </ThemedText>
                  </View>
                ) : null}

                <ThemedText themeColor="title" style={styles.title}>
                  {activeProfile?.name ?? "Servers"}
                </ThemedText>
              </View>
            </>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${mode === "dark" ? "light" : "dark"} theme`}
            onPress={() => onToggleTheme()}
            style={styles.headerIconButton}
          >
            <SymbolView
              name={
                mode === "dark"
                  ? {
                      ios: "sun.max",
                      android: "light_mode",
                      web: "light_mode",
                    }
                  : {
                      ios: "moon",
                      android: "dark_mode",
                      web: "dark_mode",
                    }
              }
              tintColor={theme.text}
              size={26}
            />
          </Pressable>

          {!activeProfile ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add server profile"
              onPress={() => onAddServer()}
              style={[styles.addButton, { backgroundColor: theme.text }]}
            >
              <SymbolView
                name={{ ios: "plus", android: "add", web: "add" }}
                tintColor={theme.background}
                size={22}
              />
            </Pressable>
          ) : null}
        </View>

        {activeProfile ? (
          <View
            style={[
              styles.headerDivider,
              { backgroundColor: theme.backgroundSelected },
            ]}
          />
        ) : null}
    </>
  );
}
