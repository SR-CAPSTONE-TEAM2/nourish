import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FoodItem } from '@/types/types';
import { SAMPLE_MEALS } from '@/constants/recommended';

interface FoodModalProps {
  visible: boolean;
  foodItem: FoodItem | null;
  onClose: () => void;
}

export default function FoodModal() {
  const { foodId, foodName, calories, protein, carbs, fat } = useLocalSearchParams();

  const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const sampleItem = SAMPLE_MEALS.find(item => item.id === pick(foodId));

  const display = sampleItem ?? {
    name: pick(foodName) ?? 'Food item',
    calories: Number(pick(calories) ?? 0),
    protein: Number(pick(protein) ?? 0),
    carbs: Number(pick(carbs) ?? 0),
    fat: Number(pick(fat) ?? 0),
  };

  return (
    <View style={styles.modalOverlay}>
      <ThemedView style={styles.modalContent}>
        <TouchableOpacity
          style={styles.modalClose}
          onPress={() => router.back()}
        >
        <ThemedText type="title">×</ThemedText>
        </TouchableOpacity>
        <ThemedText type="title" style={styles.modalTitle}>{display.name}</ThemedText>
        <View style={styles.modalNutrientRow}>
          <ThemedText type="subtitle">Calories</ThemedText>
          <ThemedText type="defaultSemiBold">{display.calories} kcal</ThemedText>
        </View>
        <View style={styles.modalNutrientRow}>
          <ThemedText type="subtitle">Protein</ThemedText>
          <ThemedText type="defaultSemiBold">{display.protein}g</ThemedText>
        </View>
        <View style={styles.modalNutrientRow}>
          <ThemedText type="subtitle">Carbs</ThemedText>
          <ThemedText type="defaultSemiBold">{display.carbs}g</ThemedText>
        </View>
        <View style={styles.modalNutrientRow}>
          <ThemedText type="subtitle">Fat</ThemedText>
          <ThemedText type="defaultSemiBold">{display.fat}g</ThemedText>
        </View>
      </ThemedView>
    </View>
  );
};


export const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalContent: {
    width: '85%',
    borderRadius: 12,
    padding: 20,
    paddingTop: 14,
  },
  modalClose: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    marginBottom: 16,
  },
  modalNutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
})
