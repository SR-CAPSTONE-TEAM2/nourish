import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { HorizCardList } from '@/components/ui/carousels/horiz-card-list';
import { DefaultCard } from '@/components/ui/cards/default-card';
import { OptionsRow, ProfileOptionsContainer } from '@/components/ui/containers/profile-options-container';
import { UserProfile, Meal, Metric } from '@/types/types';
import { useUser } from '@/context/user-context';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';

  const [storeMealsDays, setStoreMealsDays] = useState('60 days');

  const { profile } = useUser();

  const router = useRouter();
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/(protected)/(pages)/profile/settings')}
              style={{ marginRight: 24 }}>
              <Ionicons name="settings-outline" size={24} color={iconColor} />
            </TouchableOpacity >
          ),
        }}
      />
      < ParallaxScrollView
        headerBackgroundColor={{ light: '#1C1C2E', dark: '#1C1C2E' }}>
        <ThemedText type="title">
          {`Hi, \n${profile?.first_name ?? profile?.username ?? 'there'} 👋`}
        </ThemedText>

        <HorizCardList
          data={[{ id: 'ask-ai', title: 'Ask AI' }]}
          renderCard={(item, onPress) => (
            <DefaultCard data={item} onPress={onPress} />
          )}
          title="AI Assistant"
          onCardPress={() => router.push('/(protected)/(pages)/profile/ask-ai')}
          containerStyle={{ marginTop: 20 }}
        />

        <ProfileOptionsContainer style={{ marginTop: 20 }}>
          <OptionsRow
            type="select"
            label="Store Meals For"
            value={storeMealsDays}
            options={['7 days', '14 days', '30 days', '60 days', '90 days', 'Always']}
            onSelect={setStoreMealsDays}
          />
          <OptionsRow
            type="navigation"
            label="View linked third-party apps"
            onPress={() => router.push('/(protected)/(pages)/profile/linked-apps')}
          />
        </ProfileOptionsContainer>
      </ParallaxScrollView >
    </>
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
  numberInput: {
    backgroundColor: '#1C1C2E',
    color: 'white',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 6,
    textAlign: 'center',
    minWidth: 60,
  },
});
