import React from 'react';
import { View, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useMealEntryCount } from '@/hooks/useMealEntryCount'; // see note below

interface MealCardProps {
  mealKey: string;
  label: string;
  icon: string;
  onPress: () => void;
}

export function MealCard({ mealKey, label, icon, onPress }: MealCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Optional: show how many entries exist for this meal today
  const { count } = useMealEntryCount(mealKey);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: isDark ? '#1E1E2E' : '#FFFFFF' },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: isDark ? '#2D2D3D' : '#F0EBF8' },
        ]}
      >
        <Ionicons name={icon as any} size={22} color="#8B5CF6" />
      </View>

      <View style={styles.labelContainer}>
        <ThemedText style={styles.label}>{label}</ThemedText>
        {count > 0 && (
          <ThemedText style={styles.entryCount}>
            {count} {count === 1 ? 'entry' : 'entries'} today
          </ThemedText>
        )}
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={isDark ? '#555' : '#CCC'}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelContainer: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  entryCount: {
    fontSize: 12,
    color: '#8B5CF6',
    opacity: 0.8,
  },
});
