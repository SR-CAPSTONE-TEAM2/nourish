import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/user-context';

export interface AddMealToDietInput {
  meal_name: string;
  meal_type: string;
  total_calories: number;
  total_protein: number;
  total_fat: number;
  total_carbs: number;
  meal_image?: string | null;
  meal_rating?: number | null;
  ingredients: {
    fdc_id?: number | null;
    ingredient_name: string;
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    quantity: number;
    gram_weight: number;
    portion_label?: string | null;
  }[];
}

export function useDietMeals(onSuccess?: () => void) {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Creates a template meal (no meal_date) and links it to the diet slot */
  const addMealToDiet = useCallback(async (
    dietId: string,
    mealType: string,
    input: AddMealToDietInput,
  ): Promise<string | null> => {
    if (!user?.id || !dietId) return null;
    setIsLoading(true);
    setError(null);
    try {
      // 1. Insert the meal (meal_date is null → template)
      const { data: meal, error: mealError } = await supabase
        .from('user_meals')
        .insert({
          user_id: user.id,
          meal_name: input.meal_name,
          meal_type: input.meal_type,
          total_calories: input.total_calories,
          total_protein: input.total_protein,
          total_fat: input.total_fat,
          total_carbs: input.total_carbs,
          meal_image: input.meal_image ?? null,
          meal_rating: input.meal_rating ?? null,
          // meal_date intentionally omitted (nullable template)
        })
        .select()
        .single();

      if (mealError) throw mealError;

      // 2. Insert ingredients
      if (input.ingredients.length > 0) {
        const { error: itemsError } = await supabase
          .from('meal_items')
          .insert(
            input.ingredients.map((ing) => ({
              meal_id: meal.meal_id,
              fdc_id: ing.fdc_id ?? null,
              ingredient_name: ing.ingredient_name,
              calories: ing.calories ?? 0,
              protein: ing.protein ?? 0,
              carbs: ing.carbs ?? 0,
              fat: ing.fat ?? 0,
              quantity: ing.quantity,
              gram_weight: ing.gram_weight,
              portion_label: ing.portion_label ?? null,
            }))
          );
        if (itemsError) throw itemsError;
      }

      // 3. Link meal to diet slot
      const { error: linkError } = await supabase
        .from('diet_meals')
        .insert({ diet_id: dietId, meal_type: mealType, meal_id: meal.meal_id });

      if (linkError) throw linkError;

      onSuccess?.();
      return meal.meal_id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add meal to diet');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, onSuccess]);

  /** Removes a meal from a diet slot (deletes diet_meals row + the template meal) */
  const removeMealFromDiet = useCallback(async (
    dietMealId: string,
    mealId: string,
  ): Promise<boolean> => {
    if (!user?.id) return false;
    setIsLoading(true);
    setError(null);
    try {
      // Unlink first (diet_meals has ON DELETE CASCADE so meal_items will follow)
      const { error: unlinkError } = await supabase
        .from('diet_meals')
        .delete()
        .eq('id', dietMealId);

      if (unlinkError) throw unlinkError;

      // Delete the template meal itself
      const { error: mealError } = await supabase
        .from('user_meals')
        .delete()
        .eq('meal_id', mealId)
        .is('meal_date', null); // safety: only delete templates

      if (mealError) throw mealError;

      onSuccess?.();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove meal from diet');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  return { addMealToDiet, removeMealFromDiet, isLoading, error };
}
