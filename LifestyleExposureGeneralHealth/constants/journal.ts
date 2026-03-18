import { MealType, PhysicalFeeling, EmotionalFeeling } from '@/types/journal';

export const MEAL_TYPES: { value: MealType; label: string; icon: string }[] = [
  { value: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { value: 'lunch', label: 'Lunch', icon: '☀️' },
  { value: 'dinner', label: 'Dinner', icon: '🌙' },
  { value: 'snack', label: 'Snack', icon: '🍎' },
];

export const PHYSICAL_FEELINGS: { value: PhysicalFeeling; label: string; icon: string }[] = [
  { value: 'energized', label: 'Energized', icon: '⚡' },
  { value: 'satisfied', label: 'Satisfied', icon: '😊' },
  { value: 'bloated', label: 'Bloated', icon: '🎈' },
  { value: 'tired', label: 'Tired', icon: '😴' },
  { value: 'hungry', label: 'Still Hungry', icon: '🍽️' },
  { value: 'nauseous', label: 'Nauseous', icon: '🤢' },
  { value: 'comfortable', label: 'Comfortable', icon: '😌' },
  { value: 'uncomfortable', label: 'Uncomfortable', icon: '😣' },
];

export const EMOTIONAL_FEELINGS: { value: EmotionalFeeling; label: string; icon: string }[] = [
  { value: 'happy', label: 'Happy', icon: '😄' },
  { value: 'content', label: 'Content', icon: '🙂' },
  { value: 'stressed', label: 'Stressed', icon: '😰' },
  { value: 'anxious', label: 'Anxious', icon: '😟' },
  { value: 'calm', label: 'Calm', icon: '😌' },
  { value: 'guilty', label: 'Guilty', icon: '😔' },
  { value: 'proud', label: 'Proud', icon: '🥲' },
  { value: 'neutral', label: 'Neutral', icon: '😐' },
];

export const MOOD_RATINGS = [
  { value: 1, label: 'Very Bad', emoji: '😢' },
  { value: 2, label: 'Bad', emoji: '😕' },
  { value: 3, label: 'Okay', emoji: '😐' },
  { value: 4, label: 'Good', emoji: '🙂' },
  { value: 5, label: 'Great', emoji: '😄' },
] as const;

export const STORAGE_KEY = '@meal_journal_entries';
