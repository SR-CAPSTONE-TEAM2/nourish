import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MealCard } from '@/components/ui/journal/meal-card';
import { MealJournalSheet } from '@/components/ui/journal/meal-journal-sheet';
import { AVAILABLE_MEAL_TYPES } from '@/types/journal';
import { useUserDiet } from '@/hooks/useUserDiet';
import { useRouter } from 'expo-router';

export default function JournalScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const { activeDiet, isLoading } = useUserDiet();
  const [selectedMealKey, setSelectedMealKey] = useState<string | null>(null);

  const mealTypes = activeDiet
    ? AVAILABLE_MEAL_TYPES.filter((m) =>
      activeDiet.meal_structure.includes(m.key)
    )
    : [];

  const selectedMeal = AVAILABLE_MEAL_TYPES.find((m) => m.key === selectedMealKey) ?? null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: isDark ? '#2D2D3D' : '#EBEBEB' }]}>
          <ThemedText style={styles.pageTitle}>Journal</ThemedText>
          <TouchableOpacity
            style={styles.dietSelector}
            onPress={() => router.push('/(protected)/(pages)/journal/diets')}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#8B5CF6" />
            ) : (
              <>
                <ThemedText style={styles.dietName} numberOfLines={1}>
                  {activeDiet?.diet_name ?? 'No diet selected'}
                </ThemedText>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color="#8B5CF6"
                  style={{ marginLeft: 4 }}
                />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Meal Cards */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!activeDiet && !isLoading && (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={48} color="#8B5CF6" style={{ opacity: 0.5 }} />
              <ThemedText style={styles.emptyTitle}>No diet selected</ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                Tap the diet name above to choose or create a diet plan.
              </ThemedText>
            </View>
          )}

          {mealTypes.map((meal) => (
            <MealCard
              key={meal.key}
              mealKey={meal.key}
              label={meal.label}
              icon={meal.icon}
              onPress={() => setSelectedMealKey(meal.key)}
            />
          ))}
        </ScrollView>
      </ThemedView>

      {/* Meal Journal Sheet */}
      <Modal
        visible={selectedMealKey !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedMealKey(null)}
      >
        {selectedMeal && (
          <MealJournalSheet
            mealKey={selectedMeal.key}
            mealLabel={selectedMeal.label}
            mealIcon={selectedMeal.icon}
            onClose={() => setSelectedMealKey(null)}
          />
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  dietSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  dietName: {
    fontSize: 15,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    opacity: 0.7,
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.5,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
