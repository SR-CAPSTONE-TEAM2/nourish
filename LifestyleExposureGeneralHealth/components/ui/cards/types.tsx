import { ImageSource } from 'expo-image'

export interface BaseCardData {
  id: string;
}

export interface DefaultCardData extends BaseCardData {
  title: string;
  desc?: string;
}

export interface Macros {
  protein?: string;
  carbs?: string;
  fat?: string;
  calories?: number;
}

export interface MealCardData extends BaseCardData {
  name: string;
  macros: Macros;
  image: ImageSource;
  rating: number;
}
