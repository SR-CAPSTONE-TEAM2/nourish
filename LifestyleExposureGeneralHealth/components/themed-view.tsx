// components/themed-view.tsx
import { View, ViewProps } from 'react-native';
import { useTheme } from '@/context/theme-context';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  ...otherProps
}: ThemedViewProps) {
  const { isDark, colors } = useTheme();
  const backgroundColor = isDark ? (darkColor ?? colors.background) : (lightColor ?? colors.background);

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
