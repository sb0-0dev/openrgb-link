import { View, type ViewProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Props for a view that supports a semantic theme background.
 * @property type Background token; defaults to `background`.
 * @property lightColor Optional light-mode color override.
 * @property darkColor Optional dark-mode color override.
 */
export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
};

/**
 * View primitive that uses a semantic background token from the active theme.
 * @param props Native view props plus the desired semantic background.
 * @returns A React Native `View` with its theme-derived background color.
 */
export function ThemedView({ style, lightColor, darkColor, type, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();

  return <View style={[{ backgroundColor: theme[type ?? 'background'] }, style]} {...otherProps} />;
}
