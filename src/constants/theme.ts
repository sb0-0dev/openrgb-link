/** Light and dark palettes; keep each semantic token present in both modes. */

import "@/global.css";

import { Platform } from "react-native";

/** Shared light/dark design tokens consumed by themed components and screens. */
export const Colors = {
  light: {
    text: "#192033",
    title: "#5B45D6",
    accent: "#654FE4",
    background: "#F5F6FA",
    backgroundElement: "#FFFFFF",
    backgroundSelected: "#E5E7F0",
    textSecondary: "#70778A",
  },
  dark: {
    text: "#F2F3FA",
    title: "#B9A9FF",
    accent: "#A797FF",
    background: "#101321",
    backgroundElement: "#1A1E30",
    backgroundSelected: "#30354B",
    textSecondary: "#A3A8BA",
  },
} as const;

/** Color token names available in both appearance modes. */
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Platform font families used by shared text styles. */
export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

/** Base spacing scale in density-independent pixels. */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Extra room reserved for native bottom tab bars on each platform. */
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
/** Maximum readable content width on larger screens and web. */
export const MaxContentWidth = 800;
