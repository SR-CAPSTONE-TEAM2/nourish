// components/themed-view.tsx
import { View, ViewProps } from 'react-native';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({
  style,
  lightColor,
  darkColor = '#121212',
  ...otherProps
}: ThemedViewProps) {
  // App always uses dark theme (consistent with useThemeColor)
  const backgroundColor = darkColor;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
