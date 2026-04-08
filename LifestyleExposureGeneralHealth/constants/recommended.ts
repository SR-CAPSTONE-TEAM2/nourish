import { FoodItem, Vitamins, Minerals } from '@/types/types';

export const SAMPLE_MEALS: FoodItem[] = [
  { id: '1', name: 'Oatmeal', meal: 'Breakfast', calories: 220, protein: 6, carbs: 38, fat: 4, quantity: 1, vitamins: { vitaminA: 0, vitaminB1: 0.19, vitaminB2: 0.12, vitaminB3: 0.96, vitaminB5: 1.17, vitaminB6: 0.12, vitaminB12: 0, folate: 56, vitaminC: 0, vitaminD: 0, vitaminE: 0.42, vitaminK: 0 }, minerals: { calcium: 42, copper: 0.2, iron: 4.3, magnesium: 44, manganese: 1.3, phosphorus: 180, selenium: 20, sodium: 2, zinc: 2.7 } },
  { id: '2', name: 'Banana', meal: 'Breakfast', calories: 105, protein: 1, carbs: 27, fat: 0, quantity: 1, vitamins: { vitaminA: 3, vitaminB1: 0.03, vitaminB2: 0.07, vitaminB3: 0.67, vitaminB5: 0.27, vitaminB6: 0.43, vitaminB12: 0, folate: 24, vitaminC: 8.7, vitaminD: 0, vitaminE: 0.1, vitaminK: 0 }, minerals: { calcium: 5, copper: 0.1, iron: 0.3, magnesium: 27, manganese: 0.3, phosphorus: 22, selenium: 1, sodium: 1, zinc: 0.2 } },
  { id: '3', name: 'Turkey Sandwich', meal: 'Lunch', calories: 350, protein: 28, carbs: 30, fat: 10, quantity: 1, vitamins: { vitaminA: 18, vitaminB1: 0.2, vitaminB2: 0.2, vitaminB3: 4.5, vitaminB5: 0.5, vitaminB6: 0.5, vitaminB12: 0.5, folate: 60, vitaminC: 0, vitaminD: 0, vitaminE: 1.5, vitaminK: 10 }, minerals: { calcium: 40, copper: 0.15, iron: 2.5, magnesium: 35, manganese: 0.2, phosphorus: 280, selenium: 35, sodium: 450, zinc: 4.5 } },
  { id: '4', name: 'Salad', meal: 'Dinner', calories: 180, protein: 5, carbs: 12, fat: 12, quantity: 1, vitamins: { vitaminA: 423, vitaminB1: 0.1, vitaminB2: 0.15, vitaminB3: 0.4, vitaminB5: 0.2, vitaminB6: 0.2, vitaminB12: 0, folate: 80, vitaminC: 20, vitaminD: 0, vitaminE: 0.8, vitaminK: 483 }, minerals: { calcium: 36, copper: 0.08, iron: 1.2, magnesium: 14, manganese: 0.3, phosphorus: 38, selenium: 2, sodium: 64, zinc: 0.4 } },
];

export const RECOMMENDED = {
  calories: 2000,
  protein: 50, // grams
  carbs: 275, // grams
  fat: 70, // grams
};

export const RECOMMENDED_VITAMINS: Vitamins = {
  vitaminA: 900, // mcg
  vitaminB1: 1.2, // mg
  vitaminB2: 1.3, // mg
  vitaminB3: 16, // mg
  vitaminB5: 5, // mg
  vitaminB6: 1.3, // mg
  vitaminB12: 2.4, // mcg
  folate: 400, // mcg
  vitaminC: 90, // mg
  vitaminD: 20, // mcg (800 IU)
  vitaminE: 15, // mg
  vitaminK: 120, // mcg
};

export const RECOMMENDED_MINERALS: Minerals = {
  calcium: 1000, // mg
  copper: 0.9, // mg
  iron: 8, // mg
  magnesium: 310, // mg
  manganese: 2.3, // mg
  phosphorus: 700, // mg
  selenium: 55, // mcg
  sodium: 2300, // mg
  zinc: 8, // mg
};
