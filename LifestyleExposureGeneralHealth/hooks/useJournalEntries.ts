// hooks/useJournalEntries.ts

import { useState, useEffect, useCallback } from 'react';
import { MealEntry } from '@/types/journal';
import { storageUtils, generateId } from '@/context/storage';

interface UseJournalEntriesReturn {
  entries: MealEntry[];
  isLoading: boolean;
  error: string | null;
  addEntry: (entry: Omit<MealEntry, 'id' | 'createdAt'>) => Promise<void>;
  updateEntry: (entry: MealEntry) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  refreshEntries: () => Promise<void>;
}

export const useJournalEntries = (): UseJournalEntriesReturn => {
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedEntries = await storageUtils.getEntries();
      setEntries(loadedEntries);
    } catch (err) {
      setError('Failed to load entries');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const addEntry = useCallback(
    async (entryData: Omit<MealEntry, 'id' | 'createdAt'>) => {
      try {
        setError(null);
        const newEntry: MealEntry = {
          ...entryData,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        const updatedEntries = await storageUtils.addEntry(newEntry);
        setEntries(updatedEntries);
      } catch (err) {
        setError('Failed to add entry');
        throw err;
      }
    },
    []
  );

  const updateEntry = useCallback(async (entry: MealEntry) => {
    try {
      setError(null);
      const updatedEntries = await storageUtils.updateEntry(entry);
      setEntries(updatedEntries);
    } catch (err) {
      setError('Failed to update entry');
      throw err;
    }
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    try {
      setError(null);
      const updatedEntries = await storageUtils.deleteEntry(id);
      setEntries(updatedEntries);
    } catch (err) {
      setError('Failed to delete entry');
      throw err;
    }
  }, []);

  return {
    entries,
    isLoading,
    error,
    addEntry,
    updateEntry,
    deleteEntry,
    refreshEntries: loadEntries,
  };
};
