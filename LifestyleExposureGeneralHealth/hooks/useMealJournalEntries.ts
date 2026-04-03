import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/user-context';

export interface JournalEntry {
  id: string;
  meal_id: string;
  user_id: string;
  text: string;
  timestamp: string;
}

export function useMealJournalEntries(mealId: string | null | undefined) {
  const { user } = useUser();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!mealId || !user?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('meal_journal_entries')
        .select('*')
        .eq('meal_id', mealId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setEntries((data ?? []).map((e) => ({ ...e, timestamp: e.created_at })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch journal entries');
    } finally {
      setIsLoading(false);
    }
  }, [mealId, user?.id]);

  const addEntry = useCallback(async (text: string): Promise<boolean> => {
    if (!mealId || !user?.id || !text.trim()) return false;
    try {
      const { data, error: insertError } = await supabase
        .from('meal_journal_entries')
        .insert({ meal_id: mealId, user_id: user.id, text: text.trim() })
        .select()
        .single();

      if (insertError) throw insertError;

      // Optimistic prepend
      setEntries((prev) => [{ ...data, timestamp: data.created_at }, ...prev]);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add entry');
      return false;
    }
  }, [mealId, user?.id]);

  const deleteEntry = useCallback(async (entryId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('meal_journal_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user?.id ?? '');

      if (deleteError) throw deleteError;

      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
      return false;
    }
  }, [user?.id]);

  const updateEntry = useCallback(async (entryId: string, text: string): Promise<boolean> => {
    if (!text.trim()) return false;
    try {
      const { data, error: updateError } = await supabase
        .from('meal_journal_entries')
        .update({ text: text.trim() })
        .eq('id', entryId)
        .eq('user_id', user?.id ?? '')
        .select()
        .single();

      if (updateError) throw updateError;

      setEntries((prev) => prev.map((e) => (e.id === entryId ? data : e)));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update entry');
      return false;
    }
  }, [user?.id]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return { entries, isLoading, error, addEntry, deleteEntry, updateEntry, refresh: fetchEntries };
}
