// components/ui/journal/meal-entry-list.tsx

import React from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { MealEntry } from '@/types/diets-meals';
import { MealEntryCard } from './meal-entry-card';
import { ThemedText } from '@/components/themed-text';

interface MealEntryListProps {
  entries: MealEntry[];
  isLoading: boolean;
  onEdit: (entry: MealEntry) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export const MealEntryList: React.FC<MealEntryListProps> = ({
  entries,
  isLoading,
  onEdit,
  onDelete,
  onRefresh,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const groupEntriesByDate = (entries: MealEntry[]) => {
    const groups: { [key: string]: MealEntry[] } = {};

    entries.forEach((entry) => {
      const date = new Date(entry.timestamp).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    });

    return Object.entries(groups).map(([date, entries]) => ({
      date,
      entries,
    }));
  };

  if (isLoading && entries.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <ThemedText style={styles.loadingText}>Loading entries...</ThemedText>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText style={styles.emptyIcon}>📝</ThemedText>
        <ThemedText type="subtitle" style={styles.emptyTitle}>
          No entries yet
        </ThemedText>
        <ThemedText style={styles.emptySubtitle}>
          Start tracking your meals to see how different foods make you feel!
        </ThemedText>
      </View>
    );
  }

  const groupedEntries = groupEntriesByDate(entries);

  return (
    <View style={styles.listContainer}>
      {groupedEntries.map((group) => (
        <View key={group.date} style={styles.dateGroup}>
          <ThemedText style={styles.dateHeader}>{group.date}</ThemedText>
          {group.entries.map((entry) => (
            <MealEntryCard
              key={entry.id}
              entry={entry}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </View>
      ))}
      <View style={styles.bottomSpacer} />
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.7,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.7,
  },
  listContainer: {
    marginTop: 16,
  },
  dateGroup: {
    marginBottom: 8,
  },
  dateHeader: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.5,
    marginBottom: 12,
    marginTop: 8,
  },
  bottomSpacer: {
    height: 100,
  },
});
