import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { styles } from "@/features/home/styles";

/**
 * Bottom navigation between the connected server's feature areas.
 * @param props Selected tab and selection callback.
 * @returns Accessible controllers, effects, and profiles tabs.
 */
export function ServerTabNavigation({ activeTab, onSelect, features }: {
  activeTab: "controllers" | "effects" | "profiles";
  onSelect: (tab: "controllers" | "effects" | "profiles") => void;
  features: string[];
}) {
  const theme = useTheme();
  return <View style={[styles.bottomNavigation, { backgroundColor: theme.backgroundElement }]}>
    <ServerTabButton active={activeTab === "controllers"} label="Controllers" onPress={() => onSelect("controllers")} />
    {features.includes("effects") ? <ServerTabButton active={activeTab === "effects"} label="Effects" onPress={() => onSelect("effects")} /> : null}
    {features.includes("lightingProfiles") ? <ServerTabButton active={activeTab === "profiles"} label="Profiles" onPress={() => onSelect("profiles")} /> : null}
  </View>;
}

/** One accessible tab in the server's bottom navigation. */
function ServerTabButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: "Controllers" | "Effects" | "Profiles";
  onPress: () => void;
}) {
  const theme = useTheme();

  const icon =
    label === "Controllers"
      ? ({ ios: "lightbulb", android: "lightbulb", web: "lightbulb" } as const)
      : label === "Effects"
        ? ({
            ios: "sparkles",
            android: "auto_awesome",
            web: "auto_awesome",
          } as const)
        : ({
            ios: "square.stack.3d.up",
            android: "view_list",
            web: "view_list",
          } as const);

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.tabButton, active && { backgroundColor: theme.backgroundSelected }]}
    >
      <SymbolView
        name={icon}
        tintColor={active ? theme.text : theme.textSecondary}
        size={20}
      />
      <ThemedText type="small" themeColor={active ? "text" : "textSecondary"}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

