import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import AddMealModal, { AddMealSuccessPayload } from '../../(modals)/addmealmodal';

import { FoodItem, MealType, Vitamins, Minerals } from '@/types/types';
import { RECOMMENDED, RECOMMENDED_VITAMINS, RECOMMENDED_MINERALS } from '@/constants/recommended';
import { SummarySection } from '@/components/ui/meals/summary-section';
import { MealSections, toggleMeal } from '@/components/ui/meals/meal-section';
import { NutrientReport, toggleReportSection } from '@/components/ui/meals/nutrient-report';

interface FoodNutrientRow {
  fdc_id: number;
  display_name: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

interface UsdaFoodNutrientRow {
  fdc_id: number;
  nutrient_id: number;
  amount: number;
}

interface UsdaNutrientRow {
  id: number;
  name: string;
}

// Map a USDA nutrient name (lower-cased) to a Vitamins or Minerals field
function nutrientNameToField(
  name: string,
): { kind: 'vitamin'; field: keyof Vitamins } | { kind: 'mineral'; field: keyof Minerals } | null {
  const n = name.toLowerCase();
  if (n.includes('vitamin a')) return { kind: 'vitamin', field: 'vitaminA' };
  if (n.includes('thiamin')) return { kind: 'vitamin', field: 'vitaminB1' };
  if (n.includes('riboflavin')) return { kind: 'vitamin', field: 'vitaminB2' };
  if (n.includes('niacin')) return { kind: 'vitamin', field: 'vitaminB3' };
  if (n.includes('pantothenic')) return { kind: 'vitamin', field: 'vitaminB5' };
  if (n.includes('vitamin b-6') || n.includes('vitamin b6')) return { kind: 'vitamin', field: 'vitaminB6' };
  if (n.includes('vitamin b-12') || n.includes('vitamin b12')) return { kind: 'vitamin', field: 'vitaminB12' };
  if (n.includes('folate') || n.includes('folic')) return { kind: 'vitamin', field: 'folate' };
  if (n.includes('vitamin c')) return { kind: 'vitamin', field: 'vitaminC' };
  if (n.includes('vitamin d')) return { kind: 'vitamin', field: 'vitaminD' };
  if (n.includes('vitamin e')) return { kind: 'vitamin', field: 'vitaminE' };
  if (n.includes('vitamin k')) return { kind: 'vitamin', field: 'vitaminK' };
  if (n.includes('calcium')) return { kind: 'mineral', field: 'calcium' };
  if (n.includes('copper')) return { kind: 'mineral', field: 'copper' };
  if (n.includes('iron')) return { kind: 'mineral', field: 'iron' };
  if (n.includes('magnesium')) return { kind: 'mineral', field: 'magnesium' };
  if (n.includes('manganese')) return { kind: 'mineral', field: 'manganese' };
  if (n.includes('phosphorus')) return { kind: 'mineral', field: 'phosphorus' };
  if (n.includes('selenium')) return { kind: 'mineral', field: 'selenium' };
  if (n.includes('sodium')) return { kind: 'mineral', field: 'sodium' };
  if (n.includes('zinc')) return { kind: 'mineral', field: 'zinc' };
  return null;
}

interface UserMealRow {
  meal_id: string;
  meal_type: string | null;
}

interface MealItemRow {
  item_id: string;
  meal_id: string;
  fdc_id: number | null;
  quantity: number | null;
  ingredient_name: string | null;
}

const ZERO_VITAMINS: Vitamins = {
  vitaminA: 0,
  vitaminB1: 0,
  vitaminB2: 0,
  vitaminB3: 0,
  vitaminB5: 0,
  vitaminB6: 0,
  vitaminB12: 0,
  folate: 0,
  vitaminC: 0,
  vitaminD: 0,
  vitaminE: 0,
  vitaminK: 0,
};

const ZERO_MINERALS: Minerals = {
  calcium: 0,
  copper: 0,
  iron: 0,
  magnesium: 0,
  manganese: 0,
  phosphorus: 0,
  selenium: 0,
  sodium: 0,
  zinc: 0,
};

function normalizeMealType(mealType: string | null): MealType {
  const normalized = mealType?.toLowerCase();
  if (normalized === 'breakfast') return 'Breakfast';
  if (normalized === 'lunch') return 'Lunch';
  if (normalized === 'dinner') return 'Dinner';
  return 'Snack';
}

function appendSavedItems(
  prevItems: FoodItem[],
  payload: AddMealSuccessPayload,
): FoodItem[] {
  const optimisticItems: FoodItem[] = payload.items.map((item, index) => ({
    id: `optimistic-${payload.mealId}-${item.fdc_id}-${index}`,
    name: item.ingredient_name,
    meal: payload.mealType,
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    vitamins: ZERO_VITAMINS,
    minerals: ZERO_MINERALS,
  }));

  return [...optimisticItems, ...prevItems];
}

export default function HomeScreen() {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [expandedMeals, setExpandedMeals] = useState<Set<MealType>>(new Set());
  const [expandedReportSections, setExpandedReportSections] = useState<Set<string>>(new Set());
  const [showAddMeal, setShowAddMeal] = useState(false);

  // AI Q&A States
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [thought, setThought] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  const handleDeleteItem = useCallback(async (item: FoodItem) => {
    if (item.id.startsWith('optimistic-')) return; // not yet saved
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    await supabase.from('meal_items').delete().eq('item_id', item.id);
  }, []);

  const refreshMeals = useCallback(async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setItems([]);
      return;
    }

    const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

    const { data: userMeals, error: mealsError } = await supabase
      .from('user_meals')
      .select('meal_id, meal_type')
      .eq('user_id', user.id)
      .eq('meal_date', today)
      .order('meal_date', { ascending: false });

    if (mealsError || !userMeals) {
      console.error('Failed to fetch user meals for stats:', mealsError?.message);
      return;
    }

    const mealRows = userMeals as UserMealRow[];
    if (mealRows.length === 0) {
      return;
    }

    const mealTypeById = new Map(mealRows.map((meal) => [meal.meal_id, meal.meal_type]));
    const mealIds = mealRows.map((meal) => meal.meal_id);

    const { data: mealItems, error: itemsError } = await supabase
      .from('meal_items')
      .select('item_id, meal_id, fdc_id, quantity, ingredient_name')
      .in('meal_id', mealIds)
      .order('meal_id', { ascending: false });

    if (itemsError || !mealItems) {
      console.error('Failed to fetch meal items for stats:', itemsError?.message);
      return;
    }

    const itemRows = mealItems as MealItemRow[];
    const fdcIds = [...new Set(itemRows.map((item) => item.fdc_id).filter((id): id is number => typeof id === 'number'))];

    const nutrientByFdcId = new Map<number, FoodNutrientRow>();
    if (fdcIds.length > 0) {
      const { data: nutrientRows, error: nutrientsError } = await supabase
        .from('food_nutrients')
        .select('fdc_id, display_name, calories, protein, carbs, fat')
        .in('fdc_id', fdcIds);

      if (!nutrientsError && nutrientRows) {
        for (const nutrient of nutrientRows as FoodNutrientRow[]) {
          nutrientByFdcId.set(nutrient.fdc_id, nutrient);
        }
      } else if (nutrientsError) {
        console.warn('Failed to fetch food_nutrients for stats fallback:', nutrientsError.message);
      }
    }

    // ── Fetch USDA vitamins & minerals via nutrient name join (values per 100 g)
    const vitaminsByFdcId = new Map<number, Vitamins>();
    const mineralsByFdcId = new Map<number, Minerals>();

    if (fdcIds.length > 0) {
      // Step 1: get fdc_id → nutrient_id → amount rows
      const { data: usdaRows, error: usdaError } = await supabase
        .from('USDA_food_nutrient')
        .select('fdc_id, nutrient_id, amount')
        .in('fdc_id', fdcIds);

      if (usdaError) {
        console.error('USDA_food_nutrient fetch error:', usdaError.message);
      } else if (usdaRows && usdaRows.length > 0) {
        // Step 2: get nutrient names by id
        const nutrientIds = [...new Set((usdaRows as UsdaFoodNutrientRow[]).map(r => r.nutrient_id))];
        const { data: nutrientNameRows, error: nameError } = await supabase
          .from('USDA_nutrients')
          .select('id, name')
          .in('id', nutrientIds);

        if (nameError) {
          console.error('USDA_nutrients fetch error:', nameError.message);
        } else if (nutrientNameRows) {
          const nameById = new Map<number, string>(
            (nutrientNameRows as UsdaNutrientRow[]).map(r => [r.id, r.name])
          );

          const vitAccum = new Map<number, Partial<Vitamins>>();
          const minAccum = new Map<number, Partial<Minerals>>();

          for (const row of usdaRows as UsdaFoodNutrientRow[]) {
            const nutrientName = nameById.get(row.nutrient_id);
            if (!nutrientName) continue;
            const mapped = nutrientNameToField(nutrientName);
            if (!mapped) continue;

            if (mapped.kind === 'vitamin') {
              if (!vitAccum.has(row.fdc_id)) vitAccum.set(row.fdc_id, {});
              vitAccum.get(row.fdc_id)![mapped.field] = row.amount ?? 0;
            } else {
              if (!minAccum.has(row.fdc_id)) minAccum.set(row.fdc_id, {});
              minAccum.get(row.fdc_id)![mapped.field] = row.amount ?? 0;
            }
          }

          for (const [fdcId, partial] of vitAccum) {
            vitaminsByFdcId.set(fdcId, { ...ZERO_VITAMINS, ...partial });
          }
          for (const [fdcId, partial] of minAccum) {
            mineralsByFdcId.set(fdcId, { ...ZERO_MINERALS, ...partial });
          }
        }
      }
    }

    const mappedItems: FoodItem[] = itemRows.map((item, index) => {
      const qty = item.quantity ?? 1;
      const nutrient = item.fdc_id != null ? nutrientByFdcId.get(item.fdc_id) : undefined;

      // All macros come from food_nutrients (per-portion values)
      const calories = Math.round((nutrient?.calories ?? 0) * qty);
      const protein  = Math.round((nutrient?.protein  ?? 0) * qty);
      const carbs    = Math.round((nutrient?.carbs    ?? 0) * qty);
      const fat      = Math.round((nutrient?.fat      ?? 0) * qty);

      // USDA amounts are per 100 g; scale by qty (servings)
      const vitMin_scale = qty;

      const rawVit = item.fdc_id != null ? vitaminsByFdcId.get(item.fdc_id) : undefined;
      const rawMin = item.fdc_id != null ? mineralsByFdcId.get(item.fdc_id) : undefined;

      const vitamins: Vitamins = rawVit ? {
        vitaminA:  rawVit.vitaminA  * vitMin_scale,
        vitaminB1: rawVit.vitaminB1 * vitMin_scale,
        vitaminB2: rawVit.vitaminB2 * vitMin_scale,
        vitaminB3: rawVit.vitaminB3 * vitMin_scale,
        vitaminB5: rawVit.vitaminB5 * vitMin_scale,
        vitaminB6: rawVit.vitaminB6 * vitMin_scale,
        vitaminB12:rawVit.vitaminB12* vitMin_scale,
        folate:    rawVit.folate    * vitMin_scale,
        vitaminC:  rawVit.vitaminC  * vitMin_scale,
        vitaminD:  rawVit.vitaminD  * vitMin_scale,
        vitaminE:  rawVit.vitaminE  * vitMin_scale,
        vitaminK:  rawVit.vitaminK  * vitMin_scale,
      } : ZERO_VITAMINS;

      const minerals: Minerals = rawMin ? {
        calcium:    rawMin.calcium    * vitMin_scale,
        copper:     rawMin.copper     * vitMin_scale,
        iron:       rawMin.iron       * vitMin_scale,
        magnesium:  rawMin.magnesium  * vitMin_scale,
        manganese:  rawMin.manganese  * vitMin_scale,
        phosphorus: rawMin.phosphorus * vitMin_scale,
        selenium:   rawMin.selenium   * vitMin_scale,
        sodium:     rawMin.sodium     * vitMin_scale,
        zinc:       rawMin.zinc       * vitMin_scale,
      } : ZERO_MINERALS;

      return {
        id: item.item_id,
        name: nutrient?.display_name ?? item.ingredient_name ?? 'Food item',
        meal: normalizeMealType(mealTypeById.get(item.meal_id) ?? null),
        calories,
        protein,
        carbs,
        fat,
        vitamins,
        minerals,
      };
    });

    setItems(mappedItems);
  }, []);

  useEffect(() => {
    refreshMeals();
  }, [refreshMeals]);

  useEffect(() => {
    if (!showAddMeal) {
      refreshMeals();
    }
  }, [showAddMeal, refreshMeals]);

  const handleAskAI = async () => {
    if (!question.trim()) return;

    setIsAsking(true);
    setAnswer("");
    setThought("");

    try {
      const nutritionData = {
        totals,
        percents,
        totalVitamins,
        vitaminPercents,
        totalMinerals,
        mineralPercents
      };

      // Get the current session to pass the auth token
      const { data: { session } } = await supabase.auth.getSession();

      // Make a direct request to the local edge function, bypassing the cloud client URL
      // so we can reach the local Tailscale network for Ollama while keeping cloud DB auth.
      const res = await fetch('http://127.0.0.1:54321/functions/v1/gemini-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ query: question, nutritionData })
      });

      if (!res.ok) {
        console.error("Supabase edge function error:", await res.text());
        setAnswer("Sorry, I encountered an error connecting to the AI assistant.");
        setThought("");
      } else {
        const data = await res.json();
        setAnswer(data?.message || "No response received.");
        if (data?.thought) {
          setThought(data.thought);
        }
      }
    } catch (err) {
      console.error("Ask AI error:", err);
      setAnswer("An unexpected error occurred.");
      setThought("");
    } finally {
      setIsAsking(false);
      setQuestion("");
    }
  };

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
        <ThemedText type="title" style={{ color: '#ffffff' }}>Today's Stats</ThemedText>
        <TouchableOpacity
          onPress={() => setShowAddMeal(true)}
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
        onDeleteItem={handleDeleteItem}
        onSelectItem={(item) => router.push({
          pathname: '/(modals)/food-modal',
          params: {
            foodId: item.id,
            foodName: item.name,
            calories: String(item.calories),
            protein: String(item.protein),
            carbs: String(item.carbs),
            fat: String(item.fat),
          }
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

      {/* AI Q&A Section */}
      <View style={styles.sectionHeaderRow}>
        <ThemedText style={styles.sectionLabel}>ASK AI ABOUT YOUR NUTRITION</ThemedText>
      </View>

      <ThemedView style={styles.qaContainer}>
        {thought ? (
          <View style={styles.thoughtContainer}>
            <ThemedText style={styles.thoughtLabel}>AI THOUGHT PROCESS</ThemedText>
            <ThemedText style={styles.thoughtText}>{thought}</ThemedText>
          </View>
        ) : null}

        {answer ? (
          <View style={styles.answerContainer}>
            <ThemedText style={styles.answerText}>{answer}</ThemedText>
          </View>
        ) : null}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="What should I eat to hit my goals?"
            placeholderTextColor="#6B6B8A"
            value={question}
            onChangeText={setQuestion}
            onSubmitEditing={handleAskAI}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, (!question.trim() || isAsking) && styles.sendButtonDisabled]}
            onPress={handleAskAI}
            disabled={!question.trim() || isAsking}
          >
            {isAsking ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <ThemedText style={styles.sendButtonText}>Ask</ThemedText>
            )}
          </TouchableOpacity>
        </View>
      </ThemedView>

      <AddMealModal
        visible={showAddMeal}
        onClose={() => setShowAddMeal(false)}
        onSuccess={(payload) => {
          if (payload) {
            setItems((prev) => appendSavedItems(prev, payload));
          }
          refreshMeals();
        }}
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
  qaContainer: {
    backgroundColor: '#27273C',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1C1C2E',
    color: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Ubuntu_400Regular',
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#6B6B8A',
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Ubuntu_700Bold',
    fontSize: 14,
  },
  answerContainer: {
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
  },
  answerText: {
    color: '#E2E8F0',
    fontFamily: 'Ubuntu_400Regular',
    fontSize: 14,
    lineHeight: 22,
  },
  thoughtContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  thoughtLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#8B5CF6',
    fontFamily: 'Ubuntu_700Bold',
    marginBottom: 8,
  },
  thoughtText: {
    color: '#94A3B8',
    fontFamily: 'Ubuntu_400Regular',
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
})
