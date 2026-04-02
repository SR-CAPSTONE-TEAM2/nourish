// journal/index.tsx
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
import { MealJournalSheet } from '@/components/ui/journal/meal-journal-sheet';
import { AVAILABLE_MEAL_TYPES, MealType } from '@/types/journal';
import { useUserDiet } from '@/hooks/useUserDiet';
import { useRouter } from 'expo-router';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TemplateMeal {
  id: string;
  name: string;
  ingredients: any[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  rating: number | null;
  isVegetarian?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🍳',
  morning_snack: '🍌',
  brunch: '🥐',
  lunch: '🥗',
  afternoon_snack: '🍎',
  dinner: '🍽️',
  evening_snack: '🌙',
  pre_workout: '💪',
  post_workout: '🏋️',
};

// ─── Sub-Components ──────────────────────────────────────────────────────────

/** Template meal card displayed in the journal */
function JournalMealCard({
  meal,
  isDark,
  onPress,
}: {
  meal: TemplateMeal;
  isDark: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.templateMealCard,
        { backgroundColor: isDark ? '#1E1E2E' : '#FFFFFF' },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.mealImagePlaceholder,
          { backgroundColor: isDark ? '#2D2D3D' : '#F0EBF8' },
        ]}
      >
        <ThemedText style={styles.mealEmoji}>🍽️</ThemedText>
      </View>

      <View style={styles.mealInfo}>
        <ThemedText style={styles.mealName} numberOfLines={1}>
          {meal.name}
        </ThemedText>

        <View style={styles.macrosRow}>
          <ThemedText style={[styles.macroText, { color: '#f97316' }]}>
            {meal.totalCalories} kcal
          </ThemedText>
          <ThemedText style={[styles.macroText, { color: '#34d399' }]}>
            P: {meal.totalProtein}g
          </ThemedText>
          <ThemedText style={[styles.macroText, { color: '#a78bfa' }]}>
            C: {meal.totalCarbs}g
          </ThemedText>
          <ThemedText style={[styles.macroText, { color: '#60a5fa' }]}>
            F: {meal.totalFat}g
          </ThemedText>
        </View>

        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={meal.rating && meal.rating >= star ? 'star' : 'star-outline'}
              size={12}
              color={meal.rating && meal.rating >= star ? '#fbbf24' : isDark ? '#444' : '#CCC'}
            />
          ))}
          {meal.ingredients.length > 1 && (
            <ThemedText style={styles.ingredientCount}>
              {meal.ingredients.length} ingredients
            </ThemedText>
          )}
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={isDark ? '#555' : '#CCC'}
      />
    </TouchableOpacity>
  );
}

/** Meal section header with icon and label */
function MealSectionHeader({
  mealKey,
  label,
  icon,
  mealCount,
  isDark,
  onPress,
}: {
  mealKey: string;
  label: string;
  icon: string;
  mealCount: number;
  isDark: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.sectionHeader,
        { backgroundColor: isDark ? '#1A1A2E' : '#FAFAFA' },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.sectionIconWrap,
          { backgroundColor: isDark ? '#2D2D3D' : '#F0EBF8' },
        ]}
      >
        <Ionicons name={icon as any} size={20} color="#8B5CF6" />
      </View>
      <View style={styles.sectionLabelContainer}>
        <ThemedText style={styles.sectionLabel}>{label}</ThemedText>
        {mealCount > 0 && (
          <ThemedText style={styles.sectionMealCount}>
            {mealCount} {mealCount === 1 ? 'meal' : 'meals'} planned
          </ThemedText>
        )}
      </View>
      <View style={styles.sectionActions}>
        {mealCount > 0 && (
          <View style={styles.mealCountBadge}>
            <ThemedText style={styles.mealCountText}>{mealCount}</ThemedText>
          </View>
        )}
        <Ionicons
          name="add-circle-outline"
          size={22}
          color="#8B5CF6"
        />
      </View>
    </TouchableOpacity>
  );
}

/** Empty meal section placeholder */
function EmptyMealSection({
  mealKey,
  label,
  icon,
  isDark,
  onPress,
}: {
  mealKey: string;
  label: string;
  icon: string;
  isDark: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.emptyMealCard,
        {
          borderColor: isDark ? '#3D3D4D' : '#D0D0D0',
          backgroundColor: isDark ? 'rgba(45,45,61,0.3)' : 'rgba(245,245,245,0.5)',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.emptyMealIconWrap,
          { backgroundColor: isDark ? '#2D2D3D' : '#F0EBF8' },
        ]}
      >
        <Ionicons name={icon as any} size={20} color="#8B5CF6" />
      </View>
      <View style={styles.emptyMealContent}>
        <ThemedText style={styles.emptyMealLabel}>{label}</ThemedText>
        <ThemedText style={styles.emptyMealHint}>
          Tap to log a meal
        </ThemedText>
      </View>
      <Ionicons name="add-circle" size={24} color="#8B5CF6" />
    </TouchableOpacity>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function JournalScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { activeDiet, isLoading } = useUserDiet();

  const [selectedMealKey, setSelectedMealKey] = useState<string | null>(null);

  // Get meal types from active diet's meal structure
  const mealTypes = activeDiet
    ? AVAILABLE_MEAL_TYPES.filter((m) =>
      activeDiet.meal_structure.includes(m.key)
    )
    : [];

  // Get meal entries from the active diet
  const mealEntries: Record<string, TemplateMeal[]> = (activeDiet as any)?.meal_entries || {};

  const selectedMeal = AVAILABLE_MEAL_TYPES.find((m) => m.key === selectedMealKey) ?? null;

  // Calculate daily totals from planned meals
  const dailyTotals = mealTypes.reduce(
    (acc, meal) => {
      const meals = mealEntries[meal.key] || [];
      meals.forEach((m) => {
        acc.calories += m.totalCalories || 0;
        acc.protein += m.totalProtein || 0;
        acc.carbs += m.totalCarbs || 0;
        acc.fat += m.totalFat || 0;
      });
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

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

        {/* Daily Summary */}
        {activeDiet && dailyTotals.calories > 0 && (
          <View style={[styles.dailySummary, { backgroundColor: isDark ? '#1A1A2E' : '#FAFAFA' }]}>
            <ThemedText style={styles.summaryTitle}>Daily Plan</ThemedText>
            <View style={styles.summaryMacros}>
              <View style={styles.summaryMacroItem}>
                <ThemedText style={[styles.summaryMacroValue, { color: '#f97316' }]}>
                  {dailyTotals.calories}
                </ThemedText>
                <ThemedText style={styles.summaryMacroLabel}>kcal</ThemedText>
              </View>
              <View style={styles.summaryMacroDivider} />
              <View style={styles.summaryMacroItem}>
                <ThemedText style={[styles.summaryMacroValue, { color: '#34d399' }]}>
                  {dailyTotals.protein}g
                </ThemedText>
                <ThemedText style={styles.summaryMacroLabel}>protein</ThemedText>
              </View>
              <View style={styles.summaryMacroDivider} />
              <View style={styles.summaryMacroItem}>
                <ThemedText style={[styles.summaryMacroValue, { color: '#a78bfa' }]}>
                  {dailyTotals.carbs}g
                </ThemedText>
                <ThemedText style={styles.summaryMacroLabel}>carbs</ThemedText>
              </View>
              <View style={styles.summaryMacroDivider} />
              <View style={styles.summaryMacroItem}>
                <ThemedText style={[styles.summaryMacroValue, { color: '#60a5fa' }]}>
                  {dailyTotals.fat}g
                </ThemedText>
                <ThemedText style={styles.summaryMacroLabel}>fat</ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* Meal Sections */}
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

          {mealTypes.map((mealType) => {
            const meals = mealEntries[mealType.key] || [];
            const hasMeals = meals.length > 0;

            return (
              <View key={mealType.key} style={styles.mealSection}>
                {/* Section Header */}
                <MealSectionHeader
                  mealKey={mealType.key}
                  label={mealType.label}
                  icon={mealType.icon}
                  mealCount={meals.length}
                  isDark={isDark}
                  onPress={() => setSelectedMealKey(mealType.key)}
                />

                {/* Meal Cards or Empty State */}
                {hasMeals ? (
                  <View style={styles.mealCardsContainer}>
                    {meals.map((meal) => (
                      <JournalMealCard
                        key={meal.id}
                        meal={meal}
                        isDark={isDark}
                        onPress={() => setSelectedMealKey(mealType.key)}
                      />
                    ))}
                  </View>
                ) : (
                  <EmptyMealSection
                    mealKey={mealType.key}
                    label={mealType.label}
                    icon={mealType.icon}
                    isDark={isDark}
                    onPress={() => setSelectedMealKey(mealType.key)}
                  />
                )}
              </View>
            );
          })}

          <View style={{ height: 40 }} />
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
            templateMeals={mealEntries[selectedMeal.key] || []}
            onClose={() => setSelectedMealKey(null)}
          />
        )}
      </Modal>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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
    gap: 16,
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

  // Daily Summary
  dailySummary: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  summaryMacros: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryMacroItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryMacroValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryMacroLabel: {
    fontSize: 10,
    opacity: 0.5,
    marginTop: 2,
  },
  summaryMacroDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#3D3D4D',
    opacity: 0.3,
  },

  // Meal Section
  mealSection: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  sectionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabelContainer: {
    flex: 1,
    gap: 2,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionMealCount: {
    fontSize: 12,
    opacity: 0.5,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealCountBadge: {
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  mealCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Meal Cards Container
  mealCardsContainer: {
    gap: 8,
  },

  // Template Meal Card
  templateMealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  mealImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealEmoji: {
    fontSize: 24,
  },
  mealInfo: {
    flex: 1,
    gap: 4,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '600',
  },
  macrosRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  macroText: {
    fontSize: 11,
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  ingredientCount: {
    fontSize: 10,
    opacity: 0.5,
    marginLeft: 6,
  },

  // Empty Meal Card
  emptyMealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  emptyMealIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyMealContent: {
    flex: 1,
    gap: 2,
  },
  emptyMealLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyMealHint: {
    fontSize: 12,
    opacity: 0.5,
  },
});
