// (protected)/(pages)/journal/diets-edit.tsx)
import React, { useEffect, useState } from 'react';
import {
  View,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { CreateDietForm } from '@/components/ui/journal/create-diet-form';
import { useUserDiet } from '@/hooks/useUserDiet';
import { useDietMeals } from '@/hooks/useDietMeals';
import { CreateDietInput, Diet, TemplateMeal } from '@/types/journal';


export default function EditDietScreen() {
  const router = useRouter();
  const { dietId } = useLocalSearchParams<{ dietId: string }>();

  const { userDiets, updateDiet, isLoading, refreshDiets } = useUserDiet();
  const { addMealToDiet, removeMealFromDiet } = useDietMeals(refreshDiets);
  const [diet, setDiet] = useState<Diet | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleRemoveMeal = async (dietMealId: string, mealId: string) => {
    await removeMealFromDiet(dietMealId, mealId);
  };

  useEffect(() => {
    refreshDiets();
  }, []);

  useEffect(() => {
    if (dietId && userDiets.length > 0) {
      const foundDiet = userDiets.find((d) => d.diet_id === dietId);
      setDiet(foundDiet || null);
    }
  }, [dietId, userDiets]);

  const handleSubmit = async (input: CreateDietInput): Promise<void> => {
    if (!dietId || isNavigating) return;

    try {
      const success = await updateDiet(dietId, {
        diet_name: input.diet_name,
        description: input.description,
        meal_structure: input.meal_structure,
      });
      if (!success) throw new Error('Failed to update diet');

      // Persist any newly added meals (ones without meal_id)
      if (input.meal_entries) {
        for (const [mealType, meals] of Object.entries(input.meal_entries)) {
          for (const meal of meals) {
            if (!meal.meal_id) {  // only persist new ones
              await addMealToDiet(dietId, mealType, {
                meal_name: meal.name,
                meal_type: mealType,
                total_calories: meal.totalCalories,
                total_protein: meal.totalProtein,
                total_fat: meal.totalFat,
                total_carbs: meal.totalCarbs,
                meal_rating: meal.rating,
                ingredients: meal.ingredients.map((ing) => ({
                  fdc_id: ing.fdc_id,
                  ingredient_name: ing.ingredient_name,
                  calories: ing.calories,
                  protein: ing.protein,
                  carbs: ing.carbs,
                  fat: ing.fat,
                  quantity: ing.qty,
                  gram_weight: ing.amount ?? 100,
                  portion_label: ing.modifier ?? null,
                })),
              });
            }
          }
        }
      }

      setIsNavigating(true);
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to update diet. Please try again.');
      // Don't re-throw - let the form handle it gracefully
    }
  };

  const handleCancel = () => {
    if (!isNavigating) {
      router.back();
    }
  };

  // Loading state
  if (isLoading || (!diet && dietId)) {
    return (
      <>
        <Stack.Screen
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <ThemedText style={styles.loadingText}>Loading diet...</ThemedText>
        </ThemedView>
      </>
    );
  }

  // Diet not found
  if (!diet) {
    return (
      <>
        <Stack.Screen
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <ThemedView style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>Diet not found</ThemedText>
        </ThemedView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <ThemedView style={{ flex: 1 }}>
        <CreateDietForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onRemoveMeal={handleRemoveMeal}
          initialData={{
            diet_name: diet.diet_name,
            description: diet.description,
            meal_structure: diet.meal_structure,
            meal_descriptions: diet.meal_descriptions,
            meal_entries: diet.diet_meals?.reduce<Record<string, TemplateMeal[]>>((acc, row) => {
              const m = row.user_meals;
              if (!m) return acc;
              const meal: TemplateMeal = {
                id: row.id,
                meal_id: m.meal_id,
                name: m.meal_name || m.meal_type,
                ingredients: m.meal_items?.map((i) => ({
                  fdc_id: 0, ingredient_name: i.ingredient_name,
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
            }, {}),
          }}
          isEditing={true}
        />
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.6,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    opacity: 0.6,
  },
});
