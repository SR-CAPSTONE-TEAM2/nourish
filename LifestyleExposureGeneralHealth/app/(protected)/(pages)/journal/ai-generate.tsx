import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useColorScheme,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/user-context';

type FoodItem = {
  original_name: string;
  fdc_id: number | null;
  ingredient_name: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  amount: number | null;
  unit: string | null;
};

type GeneratedDiet = {
  breakfast: FoodItem[];
  lunch: FoodItem[];
  dinner: FoodItem[];
  "afternoon snack": FoodItem[];
  "evening snack": FoodItem[];
};

export default function AIGenerateScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useUser();
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preferences, setPreferences] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDiet, setGeneratedDiet] = useState<GeneratedDiet | null>(null);
  
  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      Alert.alert('Missing Dates', 'Please provide both start and end dates.');
      return;
    }

    setIsGenerating(true);
    setGeneratedDiet(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      // Testing locally since edge function isn't deployed
      const response = await fetch('http://127.0.0.1:54321/functions/v1/generate-diet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ startDate, endDate, preferences })
      });

      if (!response.ok) {
        throw new Error(`Edge Function error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data && data.diet) {
        setGeneratedDiet(data.diet);
      } else {
        throw new Error('Invalid response from AI');
      }

    } catch (e: any) {
      Alert.alert('Generation Failed', e.message || 'The AI could not generate a diet right now. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirm = async () => {
    if (!generatedDiet || !user?.id) return;
    
    try {
      setIsGenerating(true);
      // Create new active diet
      const { data: dietData, error: dietError } = await supabase
        .from('diets')
        .insert({
          user_id: user.id,
          diet_name: `AI Generated Diet - ${new Date().toLocaleDateString()}`,
          description: preferences,
          meal_structure: ['breakfast', 'lunch', 'dinner', 'afternoon_snack', 'evening_snack'],
        })
        .select()
        .single();
        
      if (dietError) throw dietError;

      // Assign meals
      const mealTypesMap: Record<string, keyof GeneratedDiet> = {
        'breakfast': 'breakfast',
        'lunch': 'lunch',
        'dinner': 'dinner',
        'afternoon_snack': 'afternoon snack',
        'evening_snack': 'evening snack'
      };

      for (const [mealType, jsonKey] of Object.entries(mealTypesMap)) {
        const items = generatedDiet[jsonKey];
        if (!items || items.length === 0) continue;

        let totalCals = 0;
        let totalProt = 0;
        let totalCarbs = 0;
        let totalFat = 0;

        for (const item of items) {
          totalCals += item.calories || 0;
          totalProt += item.protein || 0;
          totalCarbs += item.carbs || 0;
          totalFat += item.fat || 0;
        }

        // Determine dynamic meal name from ingredients
        const ingredientNames = items.map((i: any) => i.ingredient_name || i.original_name).filter(Boolean);
        let derivedMealName = `${mealType.replace('_', ' ')} (AI)`;
        if (ingredientNames.length > 0) {
          derivedMealName = ingredientNames.join(' & ');
          if (derivedMealName.length > 45) {
             derivedMealName = derivedMealName.substring(0, 45) + '...';
          }
        }

        // 1. Create user_meal
        const { data: mealData, error: mealError } = await supabase
          .from('user_meals')
          .insert({
            user_id: user.id,
            meal_type: mealType,
            meal_name: derivedMealName,
            total_calories: totalCals,
            total_protein: totalProt,
            total_carbs: totalCarbs,
            total_fat: totalFat
          })
          .select()
          .single();

        if (mealError) throw mealError;

        // 2. Link in diet_meals
        await supabase.from('diet_meals').insert({
          diet_id: dietData.diet_id,
          meal_type: mealType,
          meal_id: mealData.meal_id
        });

        // 3. Add objects as meal_items
        for (const item of items) {
          await supabase.from('meal_items').insert({
            meal_id: mealData.meal_id,
            ingredient_name: item.ingredient_name || item.original_name,
            fdc_id: item.fdc_id,
            quantity: 1,
            portion_amount: item.amount,
            portion_unit: item.unit || "serving",
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat
          });
        }
      }

      // Set user active diet
      await supabase
        .from('user_profiles')
        .update({ active_diet_id: dietData.diet_id })
        .eq('user_id', user.id);

      Alert.alert('Success', 'AI Diet generated and applied!');
      router.back();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e.message || 'Failed to save diet.');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderMealSection = (title: string, items: FoodItem[]) => {
    if (!items || items.length === 0) return null;
    return (
      <View style={[styles.resultSection, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]} key={title}>
        <ThemedText style={styles.resultSectionTitle}>{title}</ThemedText>
        {items.map((item, index) => (
          <View key={index} style={styles.resultItem}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="nutrition-outline" size={16} color="#8B5CF6" />
              <ThemedText style={styles.resultItemText}>{item.ingredient_name || item.original_name}</ThemedText>
              {(item.amount || item.unit) && (
                <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>({item.amount || 1} {item.unit || 'serving'})</ThemedText>
              )}
            </View>
            {item.calories != null && (
              <View style={styles.calBadge}>
                <ThemedText style={styles.calBadgeText}>{Math.round(item.calories)} kcal</ThemedText>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerTitle: 'AI Diet Generator', headerBackTitle: 'Back' }} />
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <ThemedText style={styles.headerSubtitle}>
            Let AI analyze your historical diet data and create a personalized plan just for you.
          </ThemedText>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Start Date</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF', color: isDark ? '#FFFFFF' : '#000000' }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={isDark ? '#555' : '#AAA'}
              value={startDate}
              onChangeText={setStartDate}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>End Date</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF', color: isDark ? '#FFFFFF' : '#000000' }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={isDark ? '#555' : '#AAA'}
              value={endDate}
              onChangeText={setEndDate}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Additional Preferences (Optional)</ThemedText>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF', color: isDark ? '#FFFFFF' : '#000000' }]}
              placeholder="e.g. No green beans, high protein, keto..."
              placeholderTextColor={isDark ? '#555' : '#AAA'}
              value={preferences}
              onChangeText={setPreferences}
              multiline
              numberOfLines={4}
            />
          </View>

          {!generatedDiet ? (
            <TouchableOpacity 
              style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
              onPress={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="#FFF" />
                  <ThemedText style={styles.generateButtonText}>Generate Diet</ThemedText>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.resultsContainer}>
              <ThemedText style={styles.resultsHeader}>Your AI Diet Plan</ThemedText>
              
              {renderMealSection('Breakfast', generatedDiet.breakfast)}
              {renderMealSection('Morning / Afternoon Snack', generatedDiet['afternoon snack'])}
              {renderMealSection('Lunch', generatedDiet.lunch)}
              {renderMealSection('Dinner', generatedDiet.dinner)}
              {renderMealSection('Evening Snack', generatedDiet['evening snack'])}

              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.denyBtn]} onPress={() => setGeneratedDiet(null)}>
                  <Ionicons name="close" size={20} color="#EF4444" />
                  <ThemedText style={[styles.actionBtnText, { color: '#EF4444' }]}>Deny</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionBtn, styles.regenBtn]} 
                  onPress={handleGenerate}
                  disabled={isGenerating}
                >
                  <Ionicons name="refresh" size={20} color="#8B5CF6" />
                  <ThemedText style={[styles.actionBtnText, { color: '#8B5CF6' }]}>Regenerate</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionBtn, styles.confirmBtn]} 
                  onPress={handleConfirm}
                  disabled={isGenerating}
                >
                  <Ionicons name="checkmark" size={20} color="#FFF" />
                  <ThemedText style={[styles.actionBtnText, { color: '#FFF' }]}>Confirm</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          )}

        </ScrollView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 16 },
  headerSubtitle: { fontSize: 14, opacity: 0.7, marginBottom: 12, lineHeight: 20 },
  formGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600' },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  generateButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  generateButtonDisabled: { opacity: 0.7 },
  generateButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  resultsContainer: { marginTop: 20, gap: 12 },
  resultsHeader: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  resultSection: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  resultSectionTitle: { fontSize: 16, fontWeight: '600', color: '#8B5CF6', textTransform: 'capitalize' },
  resultItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultItemText: { fontSize: 15 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
  },
  denyBtn: { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  regenBtn: { borderColor: '#8B5CF6', backgroundColor: 'rgba(139, 92, 246, 0.1)' },
  confirmBtn: { backgroundColor: '#10B981', borderColor: '#10B981' },
  actionBtnText: { fontWeight: '600', fontSize: 14 },
  calBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  calBadgeText: {
    color: '#F97316',
    fontSize: 12,
    fontWeight: '600',
  }
});
