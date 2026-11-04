import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    createContext,
    createElement,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

/** Supported app appearance modes. */
export type ThemeMode = "light" | "dark";

type ThemeModeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const themePreferenceKey = "openrgb.theme-mode";
const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

/**
 * Provides the selected appearance and persists manual light/dark overrides.
 * @param props React children that can access theme context.
 * @returns The context provider for the application subtree.
 */
export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [modeOverride, setModeOverride] = useState<ThemeMode | null>(null);
  const mode = modeOverride ?? (systemScheme === "dark" ? "dark" : "light");

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(themePreferenceKey)
      .then((storedMode) => {
        if (isMounted && (storedMode === "light" || storedMode === "dark")) {
          setModeOverride(storedMode);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Changes appearance immediately and persists the preference for next launch.
   * @param nextMode Light or dark appearance.
   */
  function setMode(nextMode: ThemeMode) {
    setModeOverride(nextMode);
    AsyncStorage.setItem(themePreferenceKey, nextMode).catch(() => {});
  }

  return createElement(
    ThemeModeContext.Provider,
    { value: { mode, setMode } },
    children,
  );
}

/**
 * Returns the current appearance and its setter; requires ThemeModeProvider.
 * @returns Current mode and a setter that updates state and persisted preference.
 * @throws {Error} When rendered outside `ThemeModeProvider`.
 */
export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error("useThemeMode must be used inside ThemeModeProvider.");
  }
  return context;
}

/**
 * Returns the semantic color palette for the active appearance.
 * @returns Shared light or dark color tokens.
 */
export function useTheme() {
  const { mode } = useThemeMode();
  return Colors[mode];
}
