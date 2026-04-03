// types/journal.ts
export type MealType =
  | 'breakfast'
  | 'brunch'
  | 'morning_snack'
  | 'lunch'
  | 'afternoon_snack'
  | 'dinner'
  | 'evening_snack'
  | 'first_meal'
  | 'second_meal'
  | 'third_meal'
  | 'fourth_meal'
  | 'pre_workout'
  | 'post_workout';

export interface MealTypeOption {
  key: MealType;
  label: string;
  icon: string;
}

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

export interface TemplateMeal {
  id: string;
  meal_id?: string;
  name: string;
  ingredients: SelectedIngredient[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  rating: number | null;
  isVegetarian?: boolean;
}

export interface FoodResult {
  fdc_id: number;
  ingredient_name: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  amount: number | null;
  unit: string | null;
  modifier: string | null;
}

export interface SelectedIngredient extends FoodResult {
  qty: number;
}

export interface JournalState {
  entries: MealEntry[];
  isLoading: boolean;
  error: string | null;
}

export interface DietMealRow {
  id: string;
  meal_type: string;
  user_meals: {
    meal_id: string;
    meal_name: string | null;
    meal_type: string;
    total_calories: number;
    total_protein: number;
    total_fat: number;
    total_carbs: number;
    meal_rating: number | null;
    meal_image: string | null;
    meal_items: { ingredient_name: string }[];
  };
}

export interface Diet {
  diet_id: string;
  user_id: string;
  diet_name: string;
  description?: string;
  meal_structure: MealType[];
  meal_descriptions?: Partial<Record<MealType, string>>;
  diet_meals?: DietMealRow[];   // ← add this
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}
export interface CreateDietInput {
  diet_name: string;
  description?: string;
  meal_structure: string[];
  meal_descriptions?: Partial<Record<MealType, string>>;
  meal_entries?: Record<string, TemplateMeal[]>;
}

export interface UpdateDietInput {
  diet_name?: string;
  description?: string;
  meal_structure?: string[];
}

// Available meal types for custom diet creation
export const AVAILABLE_MEAL_TYPES: MealTypeOption[] = [
  { key: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
  { key: 'morning_snack', label: 'Morning Snack', icon: 'cafe-outline' },
  { key: 'brunch', label: 'Brunch', icon: 'partly-sunny-outline' },
  { key: 'lunch', label: 'Lunch', icon: 'restaurant-outline' },
  { key: 'afternoon_snack', label: 'Afternoon Snack', icon: 'nutrition-outline' },
  { key: 'dinner', label: 'Dinner', icon: 'moon-outline' },
  { key: 'evening_snack', label: 'Evening Snack', icon: 'cloudy-night-outline' },
  { key: 'pre_workout', label: 'Pre-Workout', icon: 'barbell-outline' },
  { key: 'post_workout', label: 'Post-Workout', icon: 'fitness-outline' },
] as const;

