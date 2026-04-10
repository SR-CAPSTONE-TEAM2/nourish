// journal/index.tsx
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MealJournalModal } from '@/app/(protected)/(modals)/meal-journal-modal';
import { AVAILABLE_MEAL_TYPES, TemplateMeal } from '@/types/diets-meals';
import { useUserDiet } from '@/hooks/useUserDiet';
import { useRouter } from 'expo-router';

// ─── Sub-Components ──────────────────────────────────────────────────────────

/** Individual meal card within a section */
function MealCard({
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
        styles.mealCard,
        { backgroundColor: isDark ? '#252536' : '#FFFFFF' },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.mealCardImage,
          { backgroundColor: isDark ? '#2D2D3D' : '#F0EBF8' },
        ]}
      >
        <ThemedText style={styles.mealCardEmoji}>🍽️</ThemedText>
      </View>
      <View style={styles.mealCardInfo}>
        <ThemedText style={styles.mealCardName} numberOfLines={1}>
          {meal.name}
        </ThemedText>
        <ThemedText style={[styles.mealCardCals, { color: '#f97316' }]}>
          {meal.totalCalories} kcal
        </ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={16} color={isDark ? '#555' : '#CCC'} />
    </TouchableOpacity>
  );
}

/** Meal section container */
function MealSectionCard({
  mealKey,
  label,
  icon,
  meals,
  isDark,
  onMealPress,
  onAddPress,
}: {
  mealKey: string;
  label: string;
  icon: string;
  meals: TemplateMeal[];
  isDark: boolean;
  onMealPress: (meal: TemplateMeal) => void;
  onAddPress: () => void;
}) {
  const sectionTotals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.totalCalories || 0),
      protein: acc.protein + (meal.totalProtein || 0),
      carbs: acc.carbs + (meal.totalCarbs || 0),
      fat: acc.fat + (meal.totalFat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <View
      style={[
        styles.sectionCard,
        { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' },
      ]}
    >
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View
          style={[
            styles.sectionIconWrap,
            { backgroundColor: isDark ? '#2D2D3D' : '#F0EBF8' },
          ]}
        >
          <Ionicons name={icon as any} size={20} color="#8B5CF6" />
        </View>
        <View style={styles.sectionHeaderInfo}>
          <ThemedText style={styles.sectionLabel}>{label}</ThemedText>
          {sectionTotals.calories > 0 && (
            <ThemedText style={styles.sectionCalories}>
              {sectionTotals.calories} kcal total
            </ThemedText>
          )}
        </View>
        <TouchableOpacity
          style={styles.sectionAddButton}
          onPress={onAddPress}
          hitSlop={8}
        >
          <Ionicons name="add-circle" size={26} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      {/* Meal Cards */}
      {meals.length > 0 ? (
        <View style={styles.mealsContainer}>
          {meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              isDark={isDark}
              onPress={() => onMealPress(meal)}
            />
          ))}
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.emptyMealsPlaceholder,
            { borderColor: isDark ? '#3D3D4D' : '#E0E0E0' },
          ]}
          onPress={onAddPress}
          activeOpacity={0.7}
        >
          <Ionicons name="restaurant-outline" size={20} color={isDark ? '#555' : '#BBB'} />
          <ThemedText style={styles.emptyMealsText}>
            No meals planned. Tap to add.
          </ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function JournalScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { activeDiet, isLoading } = useUserDiet();

  const [selectedMeal, setSelectedMeal] = useState<TemplateMeal | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<{ key: string; label: string; icon: string } | null>(null);

  // Get meal types from active diet's meal structure
  const mealTypes = activeDiet
    ? AVAILABLE_MEAL_TYPES.filter((m) => activeDiet.meal_structure.includes(m.key))
    : [];

  // Get meal entries from the active diet
  const mealEntries: Record<string, TemplateMeal[]> = React.useMemo(() => {
    const dm = activeDiet?.diet_meals;

    if (!dm) return {};

    return dm.reduce<Record<string, TemplateMeal[]>>((acc, row) => {
      const m = row.user_meals;
      if (!m) return acc;
      const meal: TemplateMeal = {
        id: row.id,
        meal_id: m.meal_id,
        name: m.meal_name || m.meal_type,
        meal_image: m.meal_image ?? null,
        ingredients: m.meal_items?.map((i) => ({
          fdc_id: 0,
          ingredient_name: i.ingredient_name,
          calories: null, protein: null, carbs: null, fat: null,
          amount: null, unit: null, modifier: null, qty: 1,
        })) ?? [],
        totalCalories: m.total_calories ?? 0,
        totalProtein: m.total_protein ?? 0,
        totalCarbs: m.total_carbs ?? 0,
        totalFat: m.total_fat ?? 0,
        rating: m.meal_rating ?? null,
      };
      if (!acc[row.meal_type]) acc[row.meal_type] = [];
      acc[row.meal_type].push(meal);
      return acc;
    }, {});
  }, [activeDiet]);

  // Calculate daily totals
  const dailyTotals = mealTypes.reduce(
    (acc, mealType) => {
      const meals = mealEntries[mealType.key] || [];
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

  const handleMealPress = (meal: TemplateMeal, mealType: { key: string; label: string; icon: string }) => {
    // Guard against empty diets (diet has no meal)
    if (!meal.meal_id) return;
    setSelectedMeal(meal);
    setSelectedMealType(mealType);
  };

  const handleAddPress = (mealType: { key: string; label: string; icon: string }) => {
    if (activeDiet) {
      router.push({
        pathname: '/(protected)/(pages)/journal/diets-edit',
        params: { dietId: activeDiet.diet_id },
      });
    }
  };

  const handleCloseModal = () => {
    setSelectedMeal(null);
    setSelectedMealType(null);
  };

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
                <Ionicons name="chevron-down" size={16} color="#8B5CF6" style={{ marginLeft: 4 }} />
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

          {mealTypes.map((mealType) => (
            <MealSectionCard
              key={mealType.key}
              mealKey={mealType.key}
              label={mealType.label}
              icon={mealType.icon}
              meals={mealEntries[mealType.key] || []}
              isDark={isDark}
              onMealPress={(meal) => handleMealPress(meal, mealType)}
              onAddPress={() => handleAddPress(mealType)}
            />
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
        
        {/* AI Diet Generator Button */}
        <TouchableOpacity 
          style={styles.aiFab} 
          onPress={() => router.push('/(protected)/(pages)/journal/ai-generate' as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles" size={24} color="#FFF" />
        </TouchableOpacity>
      </ThemedView>

      {/* Meal Journal Modal */}
      <MealJournalModal
        visible={selectedMeal !== null}
        meal={selectedMeal}
        mealType={selectedMealType}
        onClose={handleCloseModal}
      />
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

  // Section Card
  sectionCard: {
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionCalories: {
    fontSize: 12,
    color: '#f97316',
    fontWeight: '500',
  },
  sectionAddButton: {
    padding: 4,
  },

  // Meals Container
  mealsContainer: {
    gap: 8,
  },

  // Meal Card
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    gap: 10,
  },
  mealCardImage: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealCardEmoji: {
    fontSize: 20,
  },
  mealCardInfo: {
    flex: 1,
    gap: 2,
  },
  mealCardName: {
    fontSize: 14,
    fontWeight: '600',
  },
  mealCardCals: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Empty Meals Placeholder
  emptyMealsPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  emptyMealsText: {
    fontSize: 13,
    opacity: 0.5,
  },
  aiFab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});
