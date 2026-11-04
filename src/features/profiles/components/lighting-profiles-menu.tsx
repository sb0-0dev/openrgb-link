import { SymbolView } from "expo-symbols";
import { useState } from "react";
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
import { useLightingProfiles } from "@/features/profiles/hooks/use-lighting-profiles";
import { useTheme } from "@/hooks/use-theme";

/**
 * Loads, saves, refreshes, and confirms deletion of lighting profiles.
 * @param props Connected server URL and bearer token.
 * @returns Profile list and controls with async status/error feedback.
 */
export function LightingProfilesMenu({
  baseUrl,
  accessToken,
}: {
  baseUrl: string;
  accessToken: string;
}) {
  const theme = useTheme();
  const profiles = useLightingProfiles(baseUrl, accessToken);
  const [newProfileName, setNewProfileName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.backgroundElement,
      borderColor: theme.backgroundSelected,
      color: theme.text,
    },
  ];

  return (
    <ScrollView
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.heading}>
        <View>
          <ThemedText type="smallBold">Lighting profiles</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Load a saved look or save the current lighting.
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh profiles"
          onPress={profiles.refresh}
          style={styles.iconButton}
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

      <View style={styles.saveForm}>
        <TextInput
          accessibilityLabel="New lighting profile name"
          autoCapitalize="words"
          onChangeText={setNewProfileName}
          onSubmitEditing={() => profiles.save(newProfileName)}
          placeholder="New profile name"
          placeholderTextColor={theme.textSecondary}
          returnKeyType="done"
          style={[inputStyle, styles.nameInput]}
          value={newProfileName}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save current lighting as profile"
          disabled={profiles.busyProfile !== null}
          onPress={() => profiles.save(newProfileName)}
          style={[styles.saveButton, { backgroundColor: theme.text }]}
        >
          <SymbolView
            name={{
              ios: "square.and.arrow.down",
              android: "save",
              web: "save",
            }}
            tintColor={theme.background}
            size={19}
          />
        </Pressable>
      </View>

      {profiles.message ? (
        <ThemedText type="small" style={styles.success}>
          {profiles.message}
        </ThemedText>
      ) : null}
      {profiles.error ? (
        <ThemedText style={styles.error}>{profiles.error}</ThemedText>
      ) : null}
      {profiles.isLoading ? (
        <ActivityIndicator style={styles.loading} color={theme.text} />
      ) : null}
      {!profiles.isLoading && profiles.profiles.length === 0 ? (
        <ThemedText themeColor="textSecondary">
          No saved lighting profiles.
        </ThemedText>
      ) : null}

      {profiles.profiles.map((profile) => (
        <View
          key={profile}
          style={[
            styles.profileRow,
            { borderBottomColor: theme.backgroundSelected },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            disabled={profiles.busyProfile !== null}
            onPress={() => profiles.load(profile)}
            style={styles.loadButton}
          >
            <View
              style={[
                styles.profileIcon,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <SymbolView
                name={{
                  ios: "square.stack.3d.up",
                  android: "view_list",
                  web: "view_list",
                }}
                tintColor={theme.text}
                size={18}
              />
            </View>
            <ThemedText
              type="smallBold"
              numberOfLines={1}
              style={styles.profileName}
            >
              {profile}
            </ThemedText>
            {profiles.busyProfile === profile ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Load
              </ThemedText>
            )}
          </Pressable>
          {confirmDelete === profile ? (
            <View style={styles.confirmActions}>
              <Pressable onPress={() => setConfirmDelete(null)}>
                <ThemedText type="small" themeColor="textSecondary">
                  Cancel
                </ThemedText>
              </Pressable>
              <Pressable
                disabled={profiles.busyProfile !== null}
                onPress={async () => {
                  await profiles.remove(profile);
                  setConfirmDelete(null);
                }}
              >
                <ThemedText type="smallBold" style={styles.error}>
                  Delete
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete ${profile}`}
              onPress={() => setConfirmDelete(profile)}
              style={styles.deleteButton}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, minHeight: 0 },
  content: {
    gap: Spacing.two,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.two,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  saveForm: { flexDirection: "row", gap: Spacing.two, marginTop: Spacing.two },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  nameInput: { flex: 1 },
  saveButton: {
    width: 48,
    minHeight: 48,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  loading: { marginVertical: Spacing.three },
  success: { color: "#247A45" },
  error: { color: "#C0392B" },
  profileRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
  },
  loadButton: {
    flex: 1,
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: { flex: 1 },
  deleteButton: {
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmActions: {
    alignItems: "flex-end",
    gap: Spacing.two,
    paddingRight: Spacing.one,
  },
});
