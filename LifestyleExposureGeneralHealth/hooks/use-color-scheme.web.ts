import { useTheme } from '@/context/theme-context';

export function useColorScheme() {
  const { isDark } = useTheme();
  return isDark ? 'dark' : 'light';
}
