// utils/storage.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MealEntry } from '@/types/journal';
import { STORAGE_KEY } from '@/constants/journal';

export const storageUtils = {
  async getEntries(): Promise<MealEntry[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading entries:', error);
      return [];
    }
  },

  async saveEntries(entries: MealEntry[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Error saving entries:', error);
      throw error;
    }
  },

  async addEntry(entry: MealEntry): Promise<MealEntry[]> {
    const entries = await this.getEntries();
    const updatedEntries = [entry, ...entries];
    await this.saveEntries(updatedEntries);
    return updatedEntries;
  },

  async updateEntry(updatedEntry: MealEntry): Promise<MealEntry[]> {
    const entries = await this.getEntries();
    const updatedEntries = entries.map((entry) =>
      entry.id === updatedEntry.id ? updatedEntry : entry
    );
    await this.saveEntries(updatedEntries);
    return updatedEntries;
  },

  async deleteEntry(id: string): Promise<MealEntry[]> {
    const entries = await this.getEntries();
    const updatedEntries = entries.filter((entry) => entry.id !== id);
    await this.saveEntries(updatedEntries);
    return updatedEntries;
  },

  async clearAllEntries(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing entries:', error);
      throw error;
    }
  },
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
