// components/themed-view.tsx
import { View, ViewProps, useColorScheme } from 'react-native';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({
  style,
  lightColor = '#FFFFFF',
  darkColor = '#121212',
  ...otherProps
}: ThemedViewProps) {
  const colorScheme = useColorScheme();
  // Default to 'light' if colorScheme is null (common on Android)
  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? darkColor : lightColor;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
