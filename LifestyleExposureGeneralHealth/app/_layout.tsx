import { useFonts, Ubuntu_400Regular, Ubuntu_700Bold } from '@expo-google-fonts/ubuntu';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

// Custom dark navigation theme
const AppDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0A0A12',
    card: '#0F0F1A',
    text: '#E8E8F0',
    border: 'rgba(255,255,255,0.07)',
    primary: '#8B5CF6',
    notification: '#8B5CF6',
  },
};

export const unstable_settings = {
  anchor: '(pages)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Ubuntu_400Regular,
    Ubuntu_700Bold
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={AppDarkTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(pages)" options={{ headerShown: false }} />
        {/*Add modals as we go */}
        <Stack.Screen name="(modals)/food-modal" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
