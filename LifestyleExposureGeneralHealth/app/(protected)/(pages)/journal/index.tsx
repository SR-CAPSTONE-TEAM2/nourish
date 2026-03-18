import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  useColorScheme,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MealEntry } from '@/types/journal';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { MealEntryForm } from '@/components/ui/journal/meal-entry-form';
import { MealEntryList } from '@/components/ui/journal/meal-entry-list';
import { ThemedText } from '@/components/themed-text';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedView } from '@/components/themed-view';

export default function JournalScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const iconColor = isDark ? 'white' : 'black';
  const router = useRouter();

  const {
    entries,
    isLoading,
    error,
    addEntry,
    updateEntry,
    deleteEntry,
    refreshEntries,
  } = useJournalEntries();

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MealEntry | null>(null);

  const handleAddNew = () => {
    setEditingEntry(null);
    setIsFormVisible(true);
  };

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
      await updateEntry({
        ...editingEntry,
        ...entryData,
      });
    } else {
      await addEntry(entryData);
    }
    handleCloseForm();
  };

  const handleDelete = async (id: string) => {
    await deleteEntry(id);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Journal',
        }}
      />

      <ParallaxScrollView
        headerBackgroundColor={{ light: '#1C1C2E', dark: '#1C1C2E' }}
      >
        <View style={styles.titleContainer}>
          <ThemedText type="title">Meal Journal 📝</ThemedText>
          <ThemedText type="default" style={styles.subtitle}>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} recorded
          </ThemedText>
        </View>

        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <TouchableOpacity onPress={refreshEntries}>
              <ThemedText style={styles.retryText}>Retry</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Entry List */}
        <MealEntryList
          entries={entries}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRefresh={refreshEntries}
        />
      </ParallaxScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddNew}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Form Modal */}
      <Modal
        visible={isFormVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseForm}
      >
        <ThemedView style={styles.modalContainer}>
          <MealEntryForm
            onSubmit={handleSubmit}
            onCancel={handleCloseForm}
            initialEntry={editingEntry || undefined}
          />
        </ThemedView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    marginRight: 16,
  },
  titleContainer: {
    marginBottom: 20,
  },
  subtitle: {
    opacity: 0.7,
    marginTop: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(198, 40, 40, 0.2)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef5350',
    fontSize: 14,
  },
  retryText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
