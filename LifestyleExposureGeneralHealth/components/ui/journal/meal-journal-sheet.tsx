// components/ui/journal/meal-journal-sheet.tsx
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  useColorScheme,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MealEntryForm } from '@/components/ui/journal/meal-entry-form';
import { MealEntryCard } from '@/components/ui/journal/meal-entry-card';
import { useMealEntries } from '@/hooks/useMealEntries';
import { MealEntry } from '@/types/journal';

interface MealJournalSheetProps {
  mealKey: string;
  mealLabel: string;
  mealIcon: string;
  onClose: () => void;
}

export function MealJournalSheet({
  mealKey,
  mealLabel,
  mealIcon,
  onClose,
}: MealJournalSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { entries, isLoading, addEntry, updateEntry, deleteEntry } =
    useMealEntries(mealKey);

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MealEntry | null>(null);

  const handleEdit = (entry: MealEntry) => {
    setEditingEntry(entry);
    setIsFormVisible(true);
  };

  const handleCloseForm = () => {
    setIsFormVisible(false);
    setEditingEntry(null);
  };

  const handleSubmit = async (entryData: Omit<MealEntry, 'id' | 'createdAt'>) => {
    if (editingEntry) {
      await updateEntry({ ...editingEntry, ...entryData });
    } else {
      await addEntry(entryData);
    }
    handleCloseForm();
  };

  // Use the most recent entry's image in the header if available
  const latestImage = (entries[0] as any)?.imageUrl ?? null;

  return (
    <ThemedView style={styles.container}>
      {/* Sheet Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: isDark ? '#2D2D3D' : '#EBEBEB' },
        ]}
      >
        {/* ~20% width: meal image or icon placeholder */}
        <View style={styles.imageArea}>
          {latestImage ? (
            <Image source={{ uri: latestImage }} style={styles.mealImage} />
          ) : (
            <View
              style={[
                styles.iconPlaceholder,
                { backgroundColor: isDark ? '#2D2D3D' : '#F0EBF8' },
              ]}
            >
              <Ionicons name={mealIcon as any} size={28} color="#8B5CF6" />
            </View>
          )}
        </View>

        {/* Meal title + entry count */}
        <View style={styles.headerMeta}>
          <ThemedText style={styles.sheetTitle}>{mealLabel}</ThemedText>
          {!isLoading && (
            <ThemedText style={styles.entryCountText}>
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </ThemedText>
          )}
        </View>

        <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={8}>
          <Ionicons
            name="close-circle"
            size={28}
            color={isDark ? '#555' : '#CCC'}
          />
        </TouchableOpacity>
      </View>

      {/* Entry History */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator
            size="large"
            color="#8B5CF6"
            style={styles.loader}
          />
        ) : entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="journal-outline"
              size={44}
              color="#8B5CF6"
              style={{ opacity: 0.4 }}
            />
            <ThemedText style={styles.emptyTitle}>No entries yet</ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              Tap below to log your first {mealLabel.toLowerCase()} entry.
            </ThemedText>
          </View>
        ) : (
          entries.map((entry) => (
            <MealEntryCard
              key={entry.id}
              entry={entry}
              onEdit={() => handleEdit(entry)}
              onDelete={() => deleteEntry(entry.id)}
            />
          ))
        )}
      </ScrollView>

      {/* Footer: Add Entry */}
      <View
        style={[
          styles.footer,
          { borderTopColor: isDark ? '#2D2D3D' : '#EBEBEB' },
        ]}
      >
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setEditingEntry(null);
            setIsFormVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <ThemedText style={styles.addButtonText}>Add Entry</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Nested Entry Form Modal */}
      <Modal
        visible={isFormVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseForm}
      >
        <ThemedView style={{ flex: 1 }}>
          <MealEntryForm
            onSubmit={handleSubmit}
            onCancel={handleCloseForm}
            initialEntry={editingEntry ?? undefined}
            lockedMealType={mealKey}
          />
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  imageArea: {
    width: '20%',
  },
  mealImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
  },
  iconPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerMeta: {
    flex: 1,
    gap: 2,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  entryCountText: {
    fontSize: 13,
    opacity: 0.5,
  },
  closeButton: {
    padding: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  loader: {
    marginTop: 60,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    opacity: 0.6,
  },
  emptySubtitle: {
    fontSize: 13,
    opacity: 0.45,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
