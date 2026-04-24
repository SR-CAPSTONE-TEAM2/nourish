// (protected)/(pages)/journal/diets-create.tsx)
import React, { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { CreateDietForm } from '@/components/ui/journal/create-diet-form';
import { useUserDiet } from '@/hooks/useUserDiet';
import { useDietMeals } from '@/hooks/useDietMeals';
import { CreateDietInput, Diet, TemplateMeal } from '@/types/diets-meals';

export default function CreateDietScreen() {
  const router = useRouter();
  const { createDiet, selectDiet, refreshDiets } = useUserDiet();
  const { addMealToDiet } = useDietMeals(refreshDiets);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleSubmit = async (input: CreateDietInput): Promise<void> => {
    // Prevent double submission
    if (isNavigating) return;

    try {
      const newDiet = await createDiet(input);
      if (!newDiet) throw new Error('Failed to create diet');

      if (input.meal_entries) {
        for (const [mealType, meals] of Object.entries(input.meal_entries)) {
          for (const meal of meals) {
            await addMealToDiet(newDiet.diet_id, mealType, {
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

      setIsNavigating(true);

      // Cross-platform confirmation
      if (Platform.OS === 'web') {
        const activate = window.confirm('Diet Created! Would you like to set this as your active diet?');
        if (activate) {
          try {
            await selectDiet(newDiet.diet_id);
          } catch {}
        }
        router.back();
      } else {
        Alert.alert(
          'Diet Created',
          'Would you like to set this as your active diet?',
          [
            { text: 'Not Now', style: 'cancel', onPress: () => router.back() },
            {
              text: 'Yes, Activate',
              onPress: async () => {
                try {
                  await selectDiet(newDiet.diet_id);
                  if (router.canDismiss()) router.dismiss(2);
                  else router.back();
                } catch {
                  router.back();
                }
              },
            },
          ],
          { cancelable: false }
        );
      }
    } catch (error) {
      setIsNavigating(false);
      if (Platform.OS === 'web') {
        window.alert('Failed to create diet. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to create diet. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    if (!isNavigating) {
      router.back();
    }
  };

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
          isEditing={false}
        />
      </ThemedView>
    </>
  );
}
