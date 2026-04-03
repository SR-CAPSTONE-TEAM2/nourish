import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Diet, CreateDietInput, UpdateDietInput } from '@/types/journal';
import { useUser } from '@/context/user-context';

export function useUserDiet() {
  const { user, activeDiet: contextActiveDiet, setActiveDiet: setContextActiveDiet } = useUser();
  const [activeDiet, setActiveDiet] = useState<Diet | null>(contextActiveDiet);
  const [userDiets, setUserDiets] = useState<Diet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveDiet(contextActiveDiet);
  }, [contextActiveDiet]);

  const fetchDiets = useCallback(async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      setError(null);

      const { data: diets, error: dietsError } = await supabase
        .from('diets')
        .select(`
        *,
        diet_meals (
          id,
          meal_type,
          user_meals (
            meal_id,
            meal_name,
            meal_type,
            total_calories,
            total_protein,
            total_fat,
            total_carbs,
            meal_image,
            meal_rating,
            meal_items (*)
          )
        )
      `)
        .eq('user_id', user.id)
        .order('diet_name');

      if (dietsError) throw dietsError;
      setUserDiets(diets ?? []);

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('active_diet_id, diets(*, diet_meals(*, user_meals(*, meal_items(*))))')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      const active = (profile?.diets as unknown as Diet) ?? null;
      setActiveDiet(active);
      setContextActiveDiet(active);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch diets');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, setContextActiveDiet]);
  const createDiet = useCallback(async (input: CreateDietInput): Promise<Diet | null> => {
    if (!user?.id) return null;
    try {
      const { data, error: createError } = await supabase
        .from('diets')
        .insert({
          user_id: user.id,
          diet_name: input.diet_name,
          description: input.description ?? null,
          meal_structure: input.meal_structure,
        })
        .select()
        .single();

      if (createError) throw createError;
      await fetchDiets();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create diet');
      return null;
    }
  }, [user?.id, fetchDiets]);

  const updateDiet = useCallback(async (dietId: string, input: UpdateDietInput): Promise<boolean> => {
    if (!user?.id) return false;
    try {
      const { error: updateError } = await supabase
        .from('diets')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('diet_id', dietId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;
      await fetchDiets();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update diet');
      return false;
    }
  }, [user?.id, fetchDiets]);

  const deleteDiet = useCallback(async (dietId: string): Promise<boolean> => {
    if (!user?.id) {
      console.log('No user ID, cannot delete');
      return false;
    }

    try {
      console.log('Attempting to delete diet:', dietId);

      // If deleting the active diet, clear it from profile first
      if (activeDiet?.diet_id === dietId) {
        console.log('Deleting active diet, clearing from profile first');
        const { error: clearError } = await supabase
          .from('user_profiles')
          .update({ active_diet_id: null })
          .eq('user_id', user.id);

        if (clearError) {
          console.error('Error clearing active diet:', clearError);
          // Continue anyway to try to delete
        }
      }

      // Delete the diet
      const { error: deleteError } = await supabase
        .from('diets')
        .delete()
        .eq('diet_id', dietId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error deleting diet:', deleteError);
        throw deleteError;
      }

      console.log('Diet deleted successfully');

      // Update local state
      if (activeDiet?.diet_id === dietId) {
        setActiveDiet(null);
        setContextActiveDiet(null);
      }

      // Refresh the diets list
      await fetchDiets();

      return true;
    } catch (err) {
      console.error('Delete diet error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete diet');
      return false;
    }
  }, [user?.id, activeDiet, fetchDiets, setContextActiveDiet]);
  const selectDiet = useCallback(async (dietId: string): Promise<boolean> => {
    if (!user?.id) return false;
    try {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ active_diet_id: dietId })
        .eq('user_id', user.id);

      if (updateError) throw updateError;
      await fetchDiets();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select diet');
      return false;
    }
  }, [user?.id, fetchDiets]);

  const deselectDiet = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ active_diet_id: null })
        .eq('user_id', user.id);

      if (error) throw error;
      setActiveDiet(null);
      setContextActiveDiet(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deselect diet');
      return false;
    }
  }, [user?.id, setContextActiveDiet]);

  useEffect(() => {
    if (user?.id) fetchDiets();
  }, [user?.id, fetchDiets]);

  return {
    activeDiet,
    userDiets,
    isLoading,
    error,
    createDiet,
    updateDiet,
    deleteDiet,
    selectDiet,
    deselectDiet,
    refreshDiets: fetchDiets,
  };
}
