/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// Dark modern palette
const accent = '#8B5CF6';          // Purple accent
const accentMuted = '#6D4EC2';     // Deeper purple for light mode

export const Colors = {
  light: {
    text: '#11181C',
    background: '#F8F8FC',
    tint: accentMuted,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: accentMuted,
  },
  dark: {
    text: '#E8E8F0',
    background: '#0A0A12',         // Near-black base
    surface: '#12121E',            // Dark surface
    surfaceElevated: '#1C1C2E',    // Elevated cards
    tint: accent,
    icon: '#6B6B8A',
    tabIconDefault: '#6B6B8A',
    tabIconSelected: accent,
    border: 'rgba(255,255,255,0.07)',
    textMuted: '#6B6B8A',
    accent,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
