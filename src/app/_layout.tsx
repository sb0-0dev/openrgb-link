import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider as RouterThemeProvider,
    Stack,
} from "expo-router";
import { NavigationBar } from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ThemeModeProvider, useThemeMode } from "@/hooks/use-theme";

/** Connects Expo Router navigation to the app's current appearance mode. */
function AppNavigator() {
  const { mode } = useThemeMode();

  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <NavigationBar style={mode === "dark" ? "dark" : "light"} />
      <RouterThemeProvider value={mode === "dark" ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }} />
      </RouterThemeProvider>
    </>
  );
}

/** Installs gesture handling and theme context above every route. */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeModeProvider>
        <AppNavigator />
      </ThemeModeProvider>
    </GestureHandlerRootView>
  );
}
