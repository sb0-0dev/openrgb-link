import { SymbolView } from "expo-symbols";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useServerEffects } from "@/features/effects/hooks/use-server-effects";
import { useTheme } from "@/hooks/use-theme";

/**
 * Lists server effects and toggles each effect's active state.
 * @param props Connected server URL and bearer token.
 * @returns Effects list with active, loading, and update states.
 */
export function ServerEffectsMenu({
  baseUrl,
  accessToken,
}: {
  baseUrl: string;
  accessToken: string;
}) {
  const theme = useTheme();
  const effects = useServerEffects(baseUrl, accessToken);

  return (
    <ScrollView
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <View style={styles.heading}>
        <View>
          <ThemedText type="smallBold">Effects</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Activate or deactivate effects on this server.
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh effects"
          onPress={effects.refresh}
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

      {effects.isLoading ? (
        <ActivityIndicator style={styles.loading} color={theme.text} />
      ) : null}
      {effects.error ? (
        <View style={styles.message}>
          <ThemedText style={styles.error}>{effects.error}</ThemedText>
          <Pressable onPress={effects.refresh}>
            <ThemedText type="smallBold">Try again</ThemedText>
          </Pressable>
        </View>
      ) : null}
      {!effects.isLoading && !effects.error && effects.effects.length === 0 ? (
        <ThemedText themeColor="textSecondary">
          No effects are available on this server.
        </ThemedText>
      ) : null}

      {effects.effects.map((effect) => {
        const isActive = effects.activeEffects.includes(effect);
        const isUpdating = effects.isUpdating === effect;
        return (
          <Pressable
            key={effect}
            accessibilityRole="button"
            accessibilityState={{
              selected: isActive,
              disabled: effects.isUpdating !== null,
            }}
            disabled={effects.isUpdating !== null}
            onPress={() => effects.setEnabled(effect, !isActive)}
            style={[
              styles.effectRow,
              { borderBottomColor: theme.backgroundSelected },
            ]}
          >
            <View
              style={[
                styles.effectIcon,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <SymbolView
                name={{
                  ios: "sparkles",
                  android: "auto_awesome",
                  web: "auto_awesome",
                }}
                tintColor={theme.text}
                size={18}
              />
            </View>
            <ThemedText
              type="smallBold"
              style={styles.effectName}
              numberOfLines={1}
            >
              {effect}
            </ThemedText>
            {isUpdating ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                {isActive ? "Deactivate" : "Activate"}
              </ThemedText>
            )}
          </Pressable>
        );
      })}
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
  loading: { marginVertical: Spacing.three },
  message: { gap: Spacing.two },
  error: { color: "#C0392B" },
  effectRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  effectIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  effectName: { flex: 1 },
});
