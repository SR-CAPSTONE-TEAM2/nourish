import { Stack, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { OptionsRow, ProfileOptionsContainer } from '@/components/ui/containers/profile-options-container';
import { useState } from 'react';

export default function SettingsScreen() {
  const user = "UserName";
  const router = useRouter();

  const [notificationsOn, setNotificationsOn] = useState(false);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#1C1C2E', dark: '#1C1C2E' }}>

      <ThemedText type="subtitle">
        Alerts
      </ThemedText>
      <ProfileOptionsContainer style={{ marginTop: 24 }}>
        <OptionsRow
          type="toggle"
          label="Enable Notifications"
          value={notificationsOn}
          onToggle={setNotificationsOn}
        />
      </ProfileOptionsContainer>

      <ThemedText type="subtitle" style={{ marginTop: 24 }}>
        User Account
      </ThemedText>

      <ProfileOptionsContainer style={{ marginTop: 24 }}>
        <OptionsRow
          type="navigation"
          label="Delete Account"
          onPress={() => router.push('/(pages)/profile/account-deletion')}
        />
      </ProfileOptionsContainer>
    </ParallaxScrollView >
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#8B5CF6',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  scrollContainer: {
    paddingRight: 16,
    gap: 12,
  },
});
