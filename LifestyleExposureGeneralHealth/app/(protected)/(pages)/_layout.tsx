import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';

import { useUser } from '@/context/user-context';
import { useTheme } from '@/context/theme-context';

export default function TabLayout() {
  const { loading } = useUser();
  const { isDark, colors } = useTheme();

  if (loading) return null;
  return (
    <Tabs
      screenOptions={{
        lazy: true,
        freezeOnBlur: true,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: isDark ? '#0F0F1A' : '#FFFFFF',
          borderTopColor: isDark ? 'rgba(255,255,255,0.07)' : '#E5E5E7',
          borderTopWidth: 1,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Ubuntu_400Regular',
          marginBottom: 2,
        },
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          popToTopOnBlur: true,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          popToTopOnBlur: true,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="book.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          popToTopOnBlur: true,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          popToTopOnBlur: true,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="magnifyingglass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          popToTopOnBlur: true,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
