// hooks/useMealEntries.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/user-context';
import { MealEntry } from '@/types/journal';

export function useMealEntries(mealKey: string) {
  const { user } = useUser();
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('meal_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('meal_type', mealKey)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setEntries(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch entries');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, mealKey]);

  const addEntry = useCallback(async (entry: Omit<MealEntry, 'id' | 'createdAt'>) => {
    if (!user?.id) return;
    await supabase.from('meal_entries').insert({ ...entry, user_id: user.id });
    await fetchEntries();
  }, [user?.id, fetchEntries]);

  const updateEntry = useCallback(async (entry: MealEntry) => {
    await supabase.from('meal_entries').update(entry).eq('id', entry.id);
    await fetchEntries();
  }, [fetchEntries]);

  const deleteEntry = useCallback(async (id: string) => {
    await supabase.from('meal_entries').delete().eq('id', id);
    await fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return { entries, isLoading, error, addEntry, updateEntry, deleteEntry, refresh: fetchEntries };
}
