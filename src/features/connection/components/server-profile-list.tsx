import { ActivityIndicator, Alert, BackHandler, Platform, Pressable, ScrollView, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { ThemedText } from "@/components/themed-text";
import { ServerProfile } from "@/features/connection/storage";
import { styles } from "@/features/home/styles";
import { useTheme } from "@/hooks/use-theme";

/**
 * Lists saved server profiles and exposes connect and confirmed-removal actions.
 * @param props Saved profile/status data and connect/removal callbacks.
 * @returns Scrollable profiles with loading, empty, and error feedback.
 */
export function ServerProfileList({ profiles, statuses, isLoading, connectingId, confirmRemoveId, connectionError, compatibilityError, onConnect, onRemoveRequest, onRemoveConfirm, onCancelRemove, onAddFirst }: {
  profiles: ServerProfile[]; statuses: Record<string, "checking" | "online" | "offline" | undefined>; isLoading: boolean;
  connectingId: string | null; confirmRemoveId: string | null; connectionError: string | null; compatibilityError: string | null;
  onConnect: (profile: ServerProfile) => void; onRemoveRequest: (id: string) => void;
  onRemoveConfirm: (profile: ServerProfile) => void; onCancelRemove: () => void; onAddFirst: () => void;
}) {
  const theme = useTheme();
  function quitApp() {
    if (Platform.OS === "web") {
      window.close();
    } else if (Platform.OS === "android") {
      BackHandler.exitApp();
    } else {
      Alert.alert("Close OpenRGB Link", "Close the app from the app switcher to continue.");
    }
  }
  return (
    <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            <ThemedText themeColor="textSecondary">
              {profiles.length > 0
                ? "Choose a server to connect."
                : "Add a server to get started."}
            </ThemedText>

            {compatibilityError ? (
              <View style={{ gap: 12, padding: 16, borderRadius: 12, backgroundColor: theme.backgroundElement }}>
                <ThemedText type="smallBold">This app version is not supported</ThemedText>
                <ThemedText style={styles.errorText}>{compatibilityError}</ThemedText>
                <Pressable accessibilityRole="button" onPress={quitApp} style={{ alignSelf: "flex-start", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: theme.text }}>
                  <ThemedText type="smallBold" style={{ color: theme.background }}>Quit app</ThemedText>
                </Pressable>
              </View>
            ) : null}

            {isLoading ? (
              <ActivityIndicator style={styles.loading} color={theme.text} />
            ) : null}

            {!isLoading && profiles.length === 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => onAddFirst()}
                style={[
                  styles.emptyAction,
                  { borderColor: theme.backgroundSelected },
                ]}
              >
                <View
                  style={[
                    styles.emptyIcon,
                    { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <SymbolView
                    name={{ ios: "plus", android: "add", web: "add" }}
                    tintColor={theme.text}
                    size={22}
                  />
                </View>
                <ThemedText type="smallBold">Add your first server</ThemedText>
              </Pressable>
            ) : null}

            {profiles.map((profile) => (
              <View
                key={profile.id}
                style={[
                  styles.profileRow,
                  { borderBottomColor: theme.backgroundSelected },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  disabled={connectingId !== null}
                  onPress={() => onConnect(profile)}
                  style={styles.profileMain}
                >
                  <View
                    style={[
                      styles.serverIcon,
                      { backgroundColor: theme.backgroundElement },
                    ]}
                  >
                    <SymbolView
                      name={{
                        ios: "desktopcomputer",
                        android: "computer",
                        web: "computer",
                      }}
                      tintColor={theme.text}
                      size={19}
                    />
                  </View>

                  <View style={styles.profileDetails}>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {profile.name}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      numberOfLines={1}
                    >
                      {profile.baseUrl}
                    </ThemedText>
                    <View style={styles.statusLine}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor:
                              statuses[profile.id] === "online"
                                ? "#26925A"
                                : statuses[profile.id] === "offline"
                                  ? "#C44B42"
                                  : theme.textSecondary,
                          },
                        ]}
                      />
                      <ThemedText type="small" themeColor="textSecondary">
                        {statuses[profile.id] === "online"
                          ? "Online"
                          : statuses[profile.id] === "offline"
                            ? "Offline"
                            : "Checking"}
                      </ThemedText>
                    </View>
                  </View>

                  {connectingId === profile.id ? (
                    <ActivityIndicator color={theme.text} />
                  ) : (
                    <SymbolView
                      name={{
                        ios: "chevron.right",
                        android: "chevron_right",
                        web: "chevron_right",
                      }}
                      tintColor={theme.textSecondary}
                      size={18}
                    />
                  )}
                </Pressable>

                {confirmRemoveId === profile.id ? (
                  <View style={styles.removeActions}>
                    <Pressable onPress={() => onCancelRemove()}>
                      <ThemedText type="small" themeColor="textSecondary">
                        Cancel
                      </ThemedText>
                    </Pressable>
                    <Pressable onPress={() => onRemoveConfirm(profile)}>
                      <ThemedText type="smallBold" style={styles.removeText}>
                        Remove
                      </ThemedText>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${profile.name}`}
                    onPress={() => onRemoveRequest(profile.id)}
                    style={styles.removeButton}
                  >
                    <SymbolView
                      name={{ ios: "trash", android: "delete", web: "delete" }}
                      tintColor={theme.textSecondary}
                      size={17}
                    />
                  </Pressable>
                )}
              </View>
            ))}

            {connectionError ? (
              <ThemedText style={styles.errorText}>
                {connectionError}
              </ThemedText>
            ) : null}
          </ScrollView>
  );
}
