export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type MoodRating = 1 | 2 | 3 | 4 | 5;

export type PhysicalFeeling =
  | 'energized'
  | 'satisfied'
  | 'bloated'
  | 'tired'
  | 'hungry'
  | 'nauseous'
  | 'comfortable'
  | 'uncomfortable';

export type EmotionalFeeling =
  | 'happy'
  | 'content'
  | 'stressed'
  | 'anxious'
  | 'calm'
  | 'guilty'
  | 'proud'
  | 'neutral';

export interface MealEntry {
  id: string;
  mealType: MealType;
  foodDescription: string;
  physicalFeelings: PhysicalFeeling[];
  emotionalFeelings: EmotionalFeeling[];
  moodRating: MoodRating;
  notes: string;
  timestamp: string;
  createdAt: string;
}

export interface JournalState {
  entries: MealEntry[];
  isLoading: boolean;
  error: string | null;
}
