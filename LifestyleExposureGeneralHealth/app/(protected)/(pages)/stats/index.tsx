import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { FoodItem, MealType, Vitamins, Minerals } from '@/types/types';
import { SAMPLE_MEALS, RECOMMENDED, RECOMMENDED_VITAMINS, RECOMMENDED_MINERALS } from '@/constants/recommended';
import { SummarySection } from '@/components/ui/meals/summary-section';
import { MealSections, toggleMeal } from '@/components/ui/meals/meal-section';
import { NutrientReport, toggleReportSection } from '@/components/ui/meals/nutrient-report';

export default function HomeScreen() {
  const [items] = useState<FoodItem[]>(SAMPLE_MEALS);
  const [expandedMeals, setExpandedMeals] = useState<Set<MealType>>(new Set());
  const [expandedReportSections, setExpandedReportSections] = useState<Set<string>>(new Set());

  // Calculate macro totals
  const totals = useMemo(() => {
    return items.reduce(
      (acc, it) => {
        acc.calories += it.calories;
        acc.protein += it.protein;
        acc.carbs += it.carbs;
        acc.fat += it.fat;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [items]);

  // Calculate macro percentages (allow >100 for numeric display)
  const percents = useMemo(() => {
    const p = (value: number, rec: number) => Math.round((value / rec) * 100);
    return {
      calories: p(totals.calories, RECOMMENDED.calories),
      protein: p(totals.protein, RECOMMENDED.protein),
      carbs: p(totals.carbs, RECOMMENDED.carbs),
      fat: p(totals.fat, RECOMMENDED.fat),
    };
  }, [totals]);

  // Calculate vitamin totals
  const totalVitamins = useMemo(() => {
    return items.reduce(
      (acc, it) => {
        acc.vitaminA += it.vitamins.vitaminA;
        acc.vitaminB1 += it.vitamins.vitaminB1;
        acc.vitaminB2 += it.vitamins.vitaminB2;
        acc.vitaminB3 += it.vitamins.vitaminB3;
        acc.vitaminB5 += it.vitamins.vitaminB5;
        acc.vitaminB6 += it.vitamins.vitaminB6;
        acc.vitaminB12 += it.vitamins.vitaminB12;
        acc.folate += it.vitamins.folate;
        acc.vitaminC += it.vitamins.vitaminC;
        acc.vitaminD += it.vitamins.vitaminD;
        acc.vitaminE += it.vitamins.vitaminE;
        acc.vitaminK += it.vitamins.vitaminK;
        return acc;
      },
      { vitaminA: 0, vitaminB1: 0, vitaminB2: 0, vitaminB3: 0, vitaminB5: 0, vitaminB6: 0, vitaminB12: 0, folate: 0, vitaminC: 0, vitaminD: 0, vitaminE: 0, vitaminK: 0 }
    );
  }, [items]);

  // Calculate vitamin percentages (allow >100 for numeric display)
  const vitaminPercents = useMemo(() => {
    const p = (value: number, rec: number) => Math.round((value / rec) * 100);
    return {
      vitaminA: p(totalVitamins.vitaminA, RECOMMENDED_VITAMINS.vitaminA),
      vitaminB1: p(totalVitamins.vitaminB1, RECOMMENDED_VITAMINS.vitaminB1),
      vitaminB2: p(totalVitamins.vitaminB2, RECOMMENDED_VITAMINS.vitaminB2),
      vitaminB3: p(totalVitamins.vitaminB3, RECOMMENDED_VITAMINS.vitaminB3),
      vitaminB5: p(totalVitamins.vitaminB5, RECOMMENDED_VITAMINS.vitaminB5),
      vitaminB6: p(totalVitamins.vitaminB6, RECOMMENDED_VITAMINS.vitaminB6),
      vitaminB12: p(totalVitamins.vitaminB12, RECOMMENDED_VITAMINS.vitaminB12),
      folate: p(totalVitamins.folate, RECOMMENDED_VITAMINS.folate),
      vitaminC: p(totalVitamins.vitaminC, RECOMMENDED_VITAMINS.vitaminC),
      vitaminD: p(totalVitamins.vitaminD, RECOMMENDED_VITAMINS.vitaminD),
      vitaminE: p(totalVitamins.vitaminE, RECOMMENDED_VITAMINS.vitaminE),
      vitaminK: p(totalVitamins.vitaminK, RECOMMENDED_VITAMINS.vitaminK),
    };
  }, [totalVitamins]);

  // Calculate mineral totals
  const totalMinerals = useMemo(() => {
    return items.reduce(
      (acc, it) => {
        acc.calcium += it.minerals.calcium;
        acc.copper += it.minerals.copper;
        acc.iron += it.minerals.iron;
        acc.magnesium += it.minerals.magnesium;
        acc.manganese += it.minerals.manganese;
        acc.phosphorus += it.minerals.phosphorus;
        acc.selenium += it.minerals.selenium;
        acc.sodium += it.minerals.sodium;
        acc.zinc += it.minerals.zinc;
        return acc;
      },
      { calcium: 0, copper: 0, iron: 0, magnesium: 0, manganese: 0, phosphorus: 0, selenium: 0, sodium: 0, zinc: 0 }
    );
  }, [items]);

  // Calculate mineral percentages (allow >100 for numeric display)
  const mineralPercents = useMemo(() => {
    const p = (value: number, rec: number) => Math.round((value / rec) * 100);
    return {
      calcium: p(totalMinerals.calcium, RECOMMENDED_MINERALS.calcium),
      copper: p(totalMinerals.copper, RECOMMENDED_MINERALS.copper),
      iron: p(totalMinerals.iron, RECOMMENDED_MINERALS.iron),
      magnesium: p(totalMinerals.magnesium, RECOMMENDED_MINERALS.magnesium),
      manganese: p(totalMinerals.manganese, RECOMMENDED_MINERALS.manganese),
      phosphorus: p(totalMinerals.phosphorus, RECOMMENDED_MINERALS.phosphorus),
      selenium: p(totalMinerals.selenium, RECOMMENDED_MINERALS.selenium),
      sodium: p(totalMinerals.sodium, RECOMMENDED_MINERALS.sodium),
      zinc: p(totalMinerals.zinc, RECOMMENDED_MINERALS.zinc),
    };
  }, [totalMinerals]);

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#1C1C2E', dark: '#1C1C2E' }}
      headerImage={
        <View style={styles.headerContent}>
          <View style={styles.headerGlow} />
          <View style={styles.headerGlow2} />
          <ThemedText style={styles.headerDate}>{dateLabel}</ThemedText>
          <ThemedText style={styles.headerTitle}>Daily Nutrition</ThemedText>
        </View>
      }
    >
      {/* Title and Add Button */}
      <View style={styles.titleContainer}>
        <ThemedText type="title">Today's Stats</ThemedText>
        <TouchableOpacity
          onPress={() => alert('Add food (placeholder)')}
          activeOpacity={0.8}
          style={styles.addButton}
        >
          <ThemedText style={styles.addButtonLabel}>+ Add Food</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Summary Section */}
      <SummarySection totals={totals} percents={percents} />

      {/* Meals label */}
      <View style={styles.sectionHeaderRow}>
        <ThemedText style={styles.sectionLabel}>TODAY'S MEALS</ThemedText>
      </View>

      {/* Meal Sections */}
      <MealSections
        items={items}
        expandedMeals={expandedMeals}
        onToggleMeal={(meal) => toggleMeal(meal, expandedMeals, setExpandedMeals)}
        onSelectItem={(item) => router.push({
          pathname: '/(modals)/food-modal',
          params: { foodId: item.id }
        })} />

      {/* Nutrient Report label */}
      <View style={styles.sectionHeaderRow}>
        <ThemedText style={styles.sectionLabel}>NUTRIENT BREAKDOWN</ThemedText>
      </View>

      {/* Nutrient Report */}
      <NutrientReport
        totalVitamins={totalVitamins}
        vitaminPercents={vitaminPercents}
        totalMinerals={totalMinerals}
        mineralPercents={mineralPercents}
        expandedReportSections={expandedReportSections}
        onToggleSection={(section) => toggleReportSection(section, expandedReportSections, setExpandedReportSections)}
      />
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 24,
    paddingBottom: 28,
  },
  headerGlow: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  headerGlow2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(99,102,241,0.1)',
  },
  headerDate: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontFamily: 'Ubuntu_400Regular',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  headerTitle: {
    color: 'white',
    fontSize: 30,
    fontFamily: 'Ubuntu_700Bold',
    fontWeight: 'bold',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionHeaderRow: {
    marginTop: 16,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: '#6B6B8A',
    fontFamily: 'Ubuntu_400Regular',
  },
  addButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonLabel: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Ubuntu_700Bold',
    fontWeight: '600',
  },
})
