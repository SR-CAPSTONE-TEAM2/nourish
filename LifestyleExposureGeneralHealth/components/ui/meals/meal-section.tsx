import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FoodItem, MealType } from '@/types/types';
import { useTheme } from '@/context/theme-context';

interface MealSectionsProps {
  items: FoodItem[];
  expandedMeals: Set<MealType>;
  onToggleMeal: (meal: MealType) => void;
  onSelectItem: (item: FoodItem) => void;
  onDeleteItem?: (item: FoodItem) => void;
}

export const MealSections = ({ items, expandedMeals, onToggleMeal, onSelectItem, onDeleteItem }: MealSectionsProps) => {
  const { isDark, colors } = useTheme();
  const mealTypes: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  return (
    <>
      {mealTypes.map((meal) => {
        const mealItems = items.filter((i) => i.meal === meal);
        const isExpanded = expandedMeals.has(meal);
        const mealCalories = mealItems.reduce((sum, i) => sum + i.calories, 0);
        const totalQty = mealItems.reduce((sum, i) => sum + (i.quantity ?? 1), 0);
        return (
          <View key={meal} style={[styles.mealSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => onToggleMeal(meal)}
              style={styles.mealHeader}
              activeOpacity={0.7}
            >
              <View style={styles.mealHeaderLeft}>
                <ThemedText type="subtitle" style={{ color: colors.text }}>{meal}</ThemedText>
                <ThemedText style={[styles.itemCount, { color: colors.textMuted }]}>
                  {totalQty} item{totalQty !== 1 ? 's' : ''}
                </ThemedText>
              </View>
              <View style={styles.mealHeaderRight}>
                {mealCalories > 0 && (
                  <View style={styles.caloriePill}>
                    <ThemedText style={styles.caloriePillText}>{mealCalories} kcal</ThemedText>
                  </View>
                )}
                <ThemedText type="defaultSemiBold" style={[styles.chevron, { color: colors.textMuted }]}>
                  {isExpanded ? '▼' : '▶'}
                </ThemedText>
              </View>
            </TouchableOpacity>
            {isExpanded && (
              <View style={styles.foodList}>
                {mealItems.length === 0 ? (
                  <ThemedText style={[styles.noItems, { color: colors.textMuted }]}>No items logged</ThemedText>
                ) : (
                  mealItems.map((it) => (
                    <View key={it.id} style={[styles.foodRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
                      <TouchableOpacity
                        style={styles.foodRowContent}
                        onPress={() => onSelectItem(it)}
                        activeOpacity={0.7}
                      >
                        <ThemedText type="defaultSemiBold" style={[styles.foodName, { color: colors.text }]}>{it.name}</ThemedText>
                        <ThemedText style={[styles.foodCalories, { color: colors.textMuted }]}>{it.calories} kcal</ThemedText>
                      </TouchableOpacity>
                      {onDeleteItem && (
                        <TouchableOpacity
                          onPress={() => onDeleteItem(it)}
                          style={styles.deleteBtn}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <ThemedText style={styles.deleteIcon}>×</ThemedText>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
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
  },
  noItems: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontStyle: 'italic',
  },
  foodList: {
    paddingBottom: 8,
    gap: 4,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
    borderRadius: 10,
  },
  foodRowContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    fontSize: 20,
    color: '#ff4444',
    lineHeight: 22,
  },
  foodName: {
    flex: 1,
    marginRight: 8,
  },
  foodCalories: {
    fontSize: 14,
  },
  mealSection: {
    borderRadius: 14,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
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
