import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FoodItem, MealType } from '@/types/types';

interface MealSectionsProps {
  items: FoodItem[];
  expandedMeals: Set<MealType>;
  onToggleMeal: (meal: MealType) => void;
  onSelectItem: (item: FoodItem) => void;
}

export const MealSections = ({ items, expandedMeals, onToggleMeal, onSelectItem }: MealSectionsProps) => {
  const mealTypes: MealType[] = ['Breakfast', 'Lunch', 'Dinner'];

  return (
    <>
      {mealTypes.map((meal) => {
        const mealItems = items.filter((i) => i.meal === meal);
        const isExpanded = expandedMeals.has(meal);
        const mealCalories = mealItems.reduce((sum, i) => sum + i.calories, 0);
        return (
          <ThemedView key={meal} style={styles.mealSection}>
            <TouchableOpacity
              onPress={() => onToggleMeal(meal)}
              style={styles.mealHeader}
              activeOpacity={0.7}
            >
              <View style={styles.mealHeaderLeft}>
                <ThemedText type="subtitle">{meal}</ThemedText>
                <ThemedText style={styles.itemCount}>
                  {mealItems.length} item{mealItems.length !== 1 ? 's' : ''}
                </ThemedText>
              </View>
              <View style={styles.mealHeaderRight}>
                {mealCalories > 0 && (
                  <View style={styles.caloriePill}>
                    <ThemedText style={styles.caloriePillText}>{mealCalories} kcal</ThemedText>
                  </View>
                )}
                <ThemedText type="defaultSemiBold" style={styles.chevron}>
                  {isExpanded ? '▼' : '▶'}
                </ThemedText>
              </View>
            </TouchableOpacity>
            {isExpanded && (
              <View style={styles.foodList}>
                {mealItems.length === 0 ? (
                  <ThemedText style={styles.noItems}>No items logged</ThemedText>
                ) : (
                  mealItems.map((it) => (
                    <TouchableOpacity
                      key={it.id}
                      style={styles.foodRow}
                      onPress={() => onSelectItem(it)}
                      activeOpacity={0.7}
                    >
                      <ThemedText type="defaultSemiBold" style={styles.foodName}>{it.name}</ThemedText>
                      <ThemedText style={styles.foodCalories}>{it.calories} kcal</ThemedText>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </ThemedView>
        );
      })}
    </>
  );
};

export const toggleMeal = (
  meal: MealType,
  expandedMeals: Set<MealType>,
  setExpandedMeals: (meals: Set<MealType>) => void
) => {
  const updated = new Set(expandedMeals);
  if (updated.has(meal)) {
    updated.delete(meal);
  } else {
    updated.add(meal);
  }
  setExpandedMeals(updated);
};
export const styles = StyleSheet.create({
  chevron: {
    fontSize: 11,
    color: '#6B6B8A',
  },
  noItems: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontStyle: 'italic',
    color: '#6B6B8A',
  },
  foodList: {
    paddingBottom: 8,
    gap: 4,
  },
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  foodName: {
    flex: 1,
    marginRight: 8,
  },
  foodCalories: {
    color: '#6B6B8A',
    fontSize: 14,
  },
  mealSection: {
    borderRadius: 14,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
    backgroundColor: '#1C1C2E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  mealHeaderLeft: {
    gap: 3,
  },
  itemCount: {
    fontSize: 12,
    color: '#6B6B8A',
    fontFamily: 'Ubuntu_400Regular',
  },
  mealHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  caloriePill: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  caloriePillText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontFamily: 'Ubuntu_700Bold',
    fontWeight: '700',
  },
})
