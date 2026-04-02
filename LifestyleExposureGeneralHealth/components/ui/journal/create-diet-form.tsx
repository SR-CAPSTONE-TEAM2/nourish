// components/ui/journal/create-diet-form.tsx
import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  useColorScheme,
  Alert,
  ActivityIndicator,
  Keyboard,
  Pressable,
  Modal,
  TouchableOpacity,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AVAILABLE_MEAL_TYPES, CreateDietInput, MealType } from '@/types/journal';
import { supabase } from '@/lib/supabase';
import { TemplateMeal, FoodResult, SelectedIngredient } from '@/types/journal';

interface CreateDietFormProps {
  onSubmit: (diet: CreateDietInput) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<CreateDietInput> & { meal_entries?: Record<string, TemplateMeal[]> };
  isEditing?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;
const DEBOUNCE = 350;

const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🍳',
  morning_snack: '🍌',
  brunch: '🥐',
  lunch: '🥗',
  afternoon_snack: '🍎',
  dinner: '🍽️',
  evening_snack: '🌙',
  pre_workout: '💪',
  post_workout: '🏋️',
};

const SUGGESTION_MEALS: Record<string, TemplateMeal[]> = {
  breakfast: [
    { id: 'sug-1', name: 'Oatmeal with Berries', ingredients: [], totalCalories: 320, totalProtein: 12, totalCarbs: 58, totalFat: 6, rating: 4, isVegetarian: true },
    { id: 'sug-2', name: 'Eggs & Toast', ingredients: [], totalCalories: 380, totalProtein: 18, totalCarbs: 32, totalFat: 20, rating: 5, isVegetarian: true },
  ],
  lunch: [
    { id: 'sug-3', name: 'Grilled Chicken Salad', ingredients: [], totalCalories: 420, totalProtein: 35, totalCarbs: 18, totalFat: 24, rating: 4, isVegetarian: false },
    { id: 'sug-4', name: 'Quinoa Bowl', ingredients: [], totalCalories: 380, totalProtein: 14, totalCarbs: 52, totalFat: 12, rating: 4, isVegetarian: true },
  ],
  dinner: [
    { id: 'sug-5', name: 'Salmon with Vegetables', ingredients: [], totalCalories: 520, totalProtein: 42, totalCarbs: 22, totalFat: 28, rating: 5, isVegetarian: false },
    { id: 'sug-6', name: 'Pasta Primavera', ingredients: [], totalCalories: 480, totalProtein: 16, totalCarbs: 68, totalFat: 14, rating: 4, isVegetarian: true },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatPortion(item: FoodResult) {
  if (!item.amount && !item.unit) return 'per 100 g';
  const parts: string[] = [];
  if (item.amount) parts.push(String(item.amount));
  if (item.unit && item.unit !== 'undetermined') parts.push(item.unit);
  if (item.modifier) parts.push(`(${item.modifier})`);
  return parts.join(' ');
}

function scaledNutrient(val: number | null, qty: number, amount: number | null) {
  if (val == null) return 0;
  const scale = amount ? (amount * qty) / 100 : qty;
  return Math.round(val * scale);
}

function generateId() {
  return `meal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function searchFoods(
  term: string,
  page: number
): Promise<{ results: FoodResult[]; hasMore: boolean }> {
  const offset = page * PAGE_SIZE;
  const { data: phraseData, error } = await supabase.rpc('search_food_with_portions', {
    search_term: term,
    result_limit: PAGE_SIZE,
    result_offset: offset,
  });
  if (error) return { results: [], hasMore: false };
  const phraseResults: FoodResult[] = phraseData ?? [];

  if (page === 0 && phraseResults.length < PAGE_SIZE) {
    const words = term.trim().split(/\s+/).filter((w) => w.length > 2);
    if (words.length > 1) {
      const wordSearches = await Promise.all(
        words.map((word) =>
          supabase.rpc('search_food_with_portions', {
            search_term: word,
            result_limit: PAGE_SIZE,
            result_offset: 0,
          })
        )
      );
      const seen = new Set(phraseResults.map((r) => r.fdc_id));
      const extra: FoodResult[] = [];
      for (const { data } of wordSearches) {
        if (!data) continue;
        for (const item of data as FoodResult[]) {
          if (!seen.has(item.fdc_id)) {
            seen.add(item.fdc_id);
            extra.push(item);
          }
        }
      }
      return {
        results: [...phraseResults, ...extra].slice(0, PAGE_SIZE * 2),
        hasMore: false,
      };
    }
  }
  return {
    results: phraseResults,
    hasMore: phraseResults.length === PAGE_SIZE,
  };
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

/** Dashed "Add new meal" card */
function AddMealButton({ onPress, isDark }: { onPress: () => void; isDark: boolean }) {
  return (
    <TouchableOpacity
      style={[
        styles.addMealCard,
        {
          borderColor: isDark ? '#3D3D4D' : '#D0D0D0',
          backgroundColor: isDark ? 'rgba(45,45,61,0.3)' : 'rgba(245,245,245,0.5)',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.addMealIconWrap,
          { backgroundColor: isDark ? '#2D2D3D' : '#F0EBF8' },
        ]}
      >
        <Ionicons name="add" size={24} color="#8B5CF6" />
      </View>
      <ThemedText style={styles.addMealText}>Add new meal</ThemedText>
    </TouchableOpacity>
  );
}

/** Template meal card shown after adding a meal */
function TemplateMealCard({
  meal,
  onRemove,
  onRatingChange,
  isDark,
}: {
  meal: TemplateMeal;
  onRemove: () => void;
  onRatingChange: (rating: number | null) => void;
  isDark: boolean;
}) {
  return (
    <View
      style={[
        styles.templateMealCard,
        { backgroundColor: isDark ? '#1E1E2E' : '#FFFFFF' },
      ]}
    >
      <View
        style={[
          styles.mealImagePlaceholder,
          { backgroundColor: isDark ? '#2D2D3D' : '#F0EBF8' },
        ]}
      >
        <ThemedText style={styles.mealEmoji}>🍽️</ThemedText>
      </View>

      <View style={styles.mealInfo}>
        <View style={styles.mealNameRow}>
          <ThemedText style={styles.mealName} numberOfLines={1}>
            {meal.name}
          </ThemedText>
          <TouchableOpacity onPress={onRemove} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={isDark ? '#555' : '#CCC'} />
          </TouchableOpacity>
        </View>

        <View style={styles.macrosRow}>
          <ThemedText style={[styles.macroText, { color: '#f97316' }]}>
            {meal.totalCalories} kcal
          </ThemedText>
          <ThemedText style={[styles.macroText, { color: '#34d399' }]}>
            P: {meal.totalProtein}g
          </ThemedText>
          <ThemedText style={[styles.macroText, { color: '#a78bfa' }]}>
            C: {meal.totalCarbs}g
          </ThemedText>
          <ThemedText style={[styles.macroText, { color: '#60a5fa' }]}>
            F: {meal.totalFat}g
          </ThemedText>
        </View>

        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => onRatingChange(meal.rating === star ? null : star)}
              hitSlop={4}
            >
              <Ionicons
                name={meal.rating && meal.rating >= star ? 'star' : 'star-outline'}
                size={16}
                color={meal.rating && meal.rating >= star ? '#fbbf24' : isDark ? '#444' : '#CCC'}
              />
            </TouchableOpacity>
          ))}
          {meal.ingredients.length > 1 && (
            <ThemedText style={styles.ingredientCount}>
              {meal.ingredients.length} ingredients
            </ThemedText>
          )}
        </View>
      </View>
    </View>
  );
}
/** Suggestion card */
function SuggestionCard({
  meal,
  onAdd,
  isDark,
}: {
  meal: TemplateMeal;
  onAdd: () => void;
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.suggestionCard,
        { backgroundColor: isDark ? '#1E1E2E' : '#FFFFFF' },
      ]}
      onPress={onAdd}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.suggestionImage,
          { backgroundColor: isDark ? '#2D2D3D' : '#F0EBF8' },
        ]}
      >
        <ThemedText style={styles.suggestionEmoji}>🍽️</ThemedText>
      </View>

      <ThemedText style={styles.suggestionName} numberOfLines={2}>
        {meal.name}
      </ThemedText>

      <ThemedText style={styles.suggestionCal}>{meal.totalCalories} kcal</ThemedText>

      <View style={styles.suggestionMacros}>
        <ThemedText style={[styles.suggestionMacroText, { color: '#34d399' }]}>
          P:{meal.totalProtein}
        </ThemedText>
        <ThemedText style={[styles.suggestionMacroText, { color: '#a78bfa' }]}>
          C:{meal.totalCarbs}
        </ThemedText>
        <ThemedText style={[styles.suggestionMacroText, { color: '#60a5fa' }]}>
          F:{meal.totalFat}
        </ThemedText>
      </View>

      {meal.isVegetarian && (
        <View style={styles.vegBadge}>
          <ThemedText style={styles.vegBadgeText}>🌿 Veg</ThemedText>
        </View>
      )}
    </TouchableOpacity>
  );
}

/** Add Meal Sheet Modal */
function AddMealSheet({
  visible,
  onClose,
  onAdd,
  mealType,
  isDark,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (meal: TemplateMeal) => void;
  mealType: string;
  isDark: boolean;
}) {
  const [mealName, setMealName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodResult[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<SelectedIngredient[]>([]);

  const slideAnim = useRef(new Animated.Value(600)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQuery = useRef('');

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 200,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 600,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => resetState());
    }
  }, [visible]);

  function resetState() {
    setMealName('');
    setQuery('');
    setResults([]);
    setPage(0);
    setHasMore(false);
    setSelected([]);
    lastQuery.current = '';
  }

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim()) {
      setResults([]);
      setHasMore(false);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      lastQuery.current = query.trim();
      setSearching(true);
      setPage(0);
      const { results: data, hasMore: more } = await searchFoods(query.trim(), 0);
      if (lastQuery.current !== query.trim()) return;
      setResults(data);
      setHasMore(more);
      setSearching(false);
    }, DEBOUNCE);
  }, [query]);

  async function loadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const { results: more, hasMore: stillMore } = await searchFoods(lastQuery.current, nextPage);
    setResults((prev) => {
      const seen = new Set(prev.map((r) => r.fdc_id));
      return [...prev, ...more.filter((r) => !seen.has(r.fdc_id))];
    });
    setPage(nextPage);
    setHasMore(stillMore);
    setLoadingMore(false);
  }

  function addIngredient(item: FoodResult) {
    setSelected((prev) => {
      const exists = prev.find((s) => s.fdc_id === item.fdc_id);
      if (exists) {
        return prev.map((s) =>
          s.fdc_id === item.fdc_id ? { ...s, qty: s.qty + 1 } : s
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
    setQuery('');
    setResults([]);
    setHasMore(false);
  }

  function removeIngredient(fdc_id: number) {
    setSelected((prev) => prev.filter((s) => s.fdc_id !== fdc_id));
  }

  function changeQty(fdc_id: number, delta: number) {
    setSelected((prev) =>
      prev.map((s) =>
        s.fdc_id === fdc_id ? { ...s, qty: Math.max(1, s.qty + delta) } : s
      )
    );
  }

  const totalCalories = selected.reduce(
    (sum, s) => sum + scaledNutrient(s.calories, s.qty, s.amount),
    0
  );
  const totalProtein = selected.reduce(
    (sum, s) => sum + scaledNutrient(s.protein, s.qty, s.amount),
    0
  );
  const totalCarbs = selected.reduce(
    (sum, s) => sum + scaledNutrient(s.carbs, s.qty, s.amount),
    0
  );
  const totalFat = selected.reduce(
    (sum, s) => sum + scaledNutrient(s.fat, s.qty, s.amount),
    0
  );

  function handleAdd() {
    if (selected.length === 0) return;

    const name = mealName.trim() || selected.map((s) => s.ingredient_name).join(', ').slice(0, 50);

    const newMeal: TemplateMeal = {
      id: generateId(),
      name,
      ingredients: selected,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      rating: null,
      isVegetarian: false,
    };

    onAdd(newMeal);
    onClose();
  }

  const accentColor = '#8B5CF6';

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.sheetOverlay, { opacity: overlayAnim }]} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetKvWrapper}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slideAnim }], backgroundColor: isDark ? '#181818' : '#FFFFFF' },
          ]}
        >
          <View style={styles.sheetHandle} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderCenter}>
              <ThemedText style={styles.sheetHeaderTitle}>Add Meal</ThemedText>
              <View style={[styles.sheetBadge, { backgroundColor: accentColor + '22', borderColor: accentColor + '55' }]}>
                <ThemedText style={[styles.sheetBadgeText, { color: accentColor }]}>
                  {AVAILABLE_MEAL_TYPES.find((m) => m.key === mealType)?.label || mealType}
                </ThemedText>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.sheetIconBtn}>
              <Ionicons name="close" size={20} color={isDark ? '#888' : '#666'} />
            </TouchableOpacity>
          </View>

          {/* Meal name input */}
          <View style={styles.mealNameInputWrap}>
            <TextInput
              style={[
                styles.mealNameInput,
                {
                  backgroundColor: isDark ? '#212121' : '#F5F5F5',
                  color: isDark ? '#e8e8e8' : '#111',
                  borderColor: isDark ? '#2e2e2e' : '#E0E0E0',
                },
              ]}
              placeholder="Meal name (optional)"
              placeholderTextColor={isDark ? '#555' : '#999'}
              value={mealName}
              onChangeText={setMealName}
              maxLength={50}
            />
          </View>

          {/* Search box */}
          <View
            style={[
              styles.sheetSearchBox,
              {
                borderColor: query ? accentColor + '99' : isDark ? '#2e2e2e' : '#E0E0E0',
                backgroundColor: isDark ? '#212121' : '#F5F5F5',
              },
            ]}
          >
            <Ionicons name="search" size={16} color={isDark ? '#555' : '#999'} />
            <TextInput
              style={[styles.sheetSearchInput, { color: isDark ? '#e8e8e8' : '#111' }]}
              placeholder="Search ingredients…"
              placeholderTextColor={isDark ? '#444' : '#999'}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              returnKeyType="search"
            />
            {searching ? (
              <ActivityIndicator size="small" color="#555" />
            ) : (
              query.length > 0 && (
                <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
                  <Ionicons name="close-circle" size={16} color={isDark ? '#555' : '#999'} />
                </TouchableOpacity>
              )
            )}
          </View>

          {/* Search results dropdown */}
          {results.length > 0 && (
            <View style={[styles.sheetDropdown, { backgroundColor: isDark ? '#1e1e1e' : '#FAFAFA', borderColor: isDark ? '#2a2a2a' : '#E0E0E0' }]}>
              <FlatList
                data={results}
                keyExtractor={(item) => String(item.fdc_id)}
                keyboardShouldPersistTaps="always"
                style={styles.sheetDropdownList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.sheetDropdownItem}
                    onPress={() => addIngredient(item)}
                  >
                    <View style={styles.sheetDropdownMain}>
                      <ThemedText style={styles.sheetDropdownName} numberOfLines={2}>
                        {item.ingredient_name}
                      </ThemedText>
                      <ThemedText style={styles.sheetDropdownDetail}>
                        {formatPortion(item)}
                      </ThemedText>
                    </View>
                    {item.calories != null && (
                      <ThemedText style={styles.sheetDropdownCal}>
                        {Math.round(item.calories * (item.amount ?? 100) / 100)} kcal
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={[styles.sheetSep, { backgroundColor: isDark ? '#252525' : '#E8E8E8' }]} />}
                ListFooterComponent={
                  hasMore ? (
                    <TouchableOpacity
                      style={styles.sheetLoadMoreBtn}
                      onPress={loadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <ActivityIndicator size="small" color="#555" />
                      ) : (
                        <ThemedText style={styles.sheetLoadMoreText}>Load more results…</ThemedText>
                      )}
                    </TouchableOpacity>
                  ) : null
                }
              />
            </View>
          )}

          {/* No results hint */}
          {!searching && query.length > 0 && results.length === 0 && (
            <ThemedText style={styles.sheetNoResults}>
              {`No results for "${query}". Try a different term.`}
            </ThemedText>
          )}

          {/* Selected ingredients */}
          <ScrollView
            style={styles.sheetSelectedScroll}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            {selected.length === 0 ? (
              <ThemedText style={styles.sheetEmptyHint}>
                Search above to add ingredients to your meal.
              </ThemedText>
            ) : (
              selected.map((item) => (
                <View
                  key={item.fdc_id}
                  style={[
                    styles.sheetSelectedRow,
                    { backgroundColor: isDark ? '#212121' : '#F5F5F5', borderColor: isDark ? '#2a2a2a' : '#E0E0E0' },
                  ]}
                >
                  <View style={styles.sheetSelectedInfo}>
                    <ThemedText style={styles.sheetSelectedName} numberOfLines={2}>
                      {item.ingredient_name}
                    </ThemedText>
                    <ThemedText style={styles.sheetSelectedDetail}>
                      {formatPortion(item)}
                      {'  ·  '}
                      <ThemedText style={{ color: '#f97316' }}>
                        {scaledNutrient(item.calories, item.qty, item.amount)} kcal
                      </ThemedText>
                    </ThemedText>
                  </View>
                  <View style={styles.sheetQtyRow}>
                    <TouchableOpacity
                      style={[styles.sheetQtyBtn, { backgroundColor: isDark ? '#2a2a2a' : '#E0E0E0' }]}
                      onPress={() => changeQty(item.fdc_id, -1)}
                    >
                      <ThemedText style={styles.sheetQtyBtnText}>−</ThemedText>
                    </TouchableOpacity>
                    <ThemedText style={styles.sheetQtyNum}>{item.qty}</ThemedText>
                    <TouchableOpacity
                      style={[styles.sheetQtyBtn, { backgroundColor: isDark ? '#2a2a2a' : '#E0E0E0' }]}
                      onPress={() => changeQty(item.fdc_id, 1)}
                    >
                      <ThemedText style={styles.sheetQtyBtnText}>+</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sheetRemoveBtn, { backgroundColor: isDark ? '#2e1010' : '#FFE8E8' }]}
                      onPress={() => removeIngredient(item.fdc_id)}
                    >
                      <Ionicons name="close" size={12} color="#e05555" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Macro summary + Add button */}
          {selected.length > 0 && (
            <View style={[styles.sheetFooter, { borderTopColor: isDark ? '#232323' : '#E8E8E8' }]}>
              <View style={styles.sheetMacroRow}>
                <View style={[styles.sheetMacroPill, { backgroundColor: isDark ? '#212121' : '#F5F5F5', borderColor: isDark ? '#2a2a2a' : '#E0E0E0' }]}>
                  <ThemedText style={[styles.sheetMacroVal, { color: '#f97316' }]}>{totalCalories}</ThemedText>
                  <ThemedText style={styles.sheetMacroLabel}>kcal</ThemedText>
                </View>
                <View style={[styles.sheetMacroPill, { backgroundColor: isDark ? '#212121' : '#F5F5F5', borderColor: isDark ? '#2a2a2a' : '#E0E0E0' }]}>
                  <ThemedText style={[styles.sheetMacroVal, { color: '#34d399' }]}>{totalProtein}g</ThemedText>
                  <ThemedText style={styles.sheetMacroLabel}>protein</ThemedText>
                </View>
                <View style={[styles.sheetMacroPill, { backgroundColor: isDark ? '#212121' : '#F5F5F5', borderColor: isDark ? '#2a2a2a' : '#E0E0E0' }]}>
                  <ThemedText style={[styles.sheetMacroVal, { color: '#a78bfa' }]}>{totalCarbs}g</ThemedText>
                  <ThemedText style={styles.sheetMacroLabel}>carbs</ThemedText>
                </View>
                <View style={[styles.sheetMacroPill, { backgroundColor: isDark ? '#212121' : '#F5F5F5', borderColor: isDark ? '#2a2a2a' : '#E0E0E0' }]}>
                  <ThemedText style={[styles.sheetMacroVal, { color: '#60a5fa' }]}>{totalFat}g</ThemedText>
                  <ThemedText style={styles.sheetMacroLabel}>fat</ThemedText>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.sheetPrimaryBtn, { backgroundColor: accentColor }]}
                onPress={handleAdd}
                activeOpacity={0.82}
              >
                <ThemedText style={styles.sheetPrimaryBtnText}>Add to Meal</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Meal Section Component */
function MealSection({
  mealKey,
  meals,
  onAddPress,
  onRemoveMeal,
  onRatingChange,
  onAddSuggestion,
  isDark,
}: {
  mealKey: string;
  meals: TemplateMeal[];
  onAddPress: () => void;
  onRemoveMeal: (mealId: string) => void;
  onRatingChange: (mealId: string, rating: number | null) => void;
  onAddSuggestion: (meal: TemplateMeal) => void;
  isDark: boolean;
}) {
  const mealInfo = AVAILABLE_MEAL_TYPES.find((m) => m.key === mealKey);
  const suggestions = SUGGESTION_MEALS[mealKey] || SUGGESTION_MEALS['lunch'] || [];

  return (
    <View style={styles.mealSection}>
      {/* Section Header */}
      <View style={styles.mealSectionHeader}>
        <View
          style={[
            styles.mealSectionIconWrap,
            { backgroundColor: isDark ? '#2D2D3D' : '#F0EBF8' },
          ]}
        >
          <Ionicons name={(mealInfo?.icon as any) || 'restaurant-outline'} size={18} color="#8B5CF6" />
        </View>
        <ThemedText style={styles.mealSectionLabel}>
          {mealInfo?.label || mealKey}
        </ThemedText>
        {meals.length > 0 && (
          <View style={styles.mealCountBadge}>
            <ThemedText style={styles.mealCountText}>{meals.length}</ThemedText>
          </View>
        )}
      </View>

      {/* Added Meal Cards */}
      {meals.map((meal) => (
        <TemplateMealCard
          key={meal.id}
          meal={meal}
          onRemove={() => onRemoveMeal(meal.id)}
          onRatingChange={(rating) => onRatingChange(meal.id, rating)}
          isDark={isDark}
        />
      ))}

      {/* Add New Meal Button */}
      <AddMealButton onPress={onAddPress} isDark={isDark} />

      {/* Suggestions Divider */}
      {suggestions.length > 0 && (
        <>
          <View style={styles.suggestionsDivider}>
            <View style={[styles.dividerLine, { backgroundColor: isDark ? '#2D2D3D' : '#E8E8E8' }]} />
            <ThemedText style={styles.suggestionsLabel}>Suggestions</ThemedText>
            <View style={[styles.dividerLine, { backgroundColor: isDark ? '#2D2D3D' : '#E8E8E8' }]} />
          </View>

          {/* Horizontal Suggestions Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScroll}
          >
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                meal={suggestion}
                onAdd={() => onAddSuggestion({ ...suggestion, id: generateId() })}
                isDark={isDark}
              />
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CreateDietForm({
  onSubmit,
  onCancel,
  initialData,
  isEditing = false,
}: CreateDietFormProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [dietName, setDietName] = useState(initialData?.diet_name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [selectedMeals, setSelectedMeals] = useState<MealType[]>(
    (initialData?.meal_structure as MealType[]) || []
  );
  const [mealEntries, setMealEntries] = useState<Record<string, TemplateMeal[]>>(
    initialData?.meal_entries || {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add meal sheet state
  const [addMealSheetVisible, setAddMealSheetVisible] = useState(false);
  const [activeMealType, setActiveMealType] = useState<string | null>(null);

  const initialValuesRef = useRef({
    dietName: initialData?.diet_name || '',
    description: initialData?.description || '',
    mealStructure: JSON.stringify(initialData?.meal_structure || []),
    mealEntries: JSON.stringify(initialData?.meal_entries || {}),
  });

  const toggleMeal = useCallback((mealKey: MealType) => {
    setSelectedMeals((prev) => {
      if (prev.includes(mealKey)) {
        return prev.filter((m) => m !== mealKey);
      } else {
        const newMeals = [...prev, mealKey];
        return newMeals.sort((a, b) => {
          const indexA = AVAILABLE_MEAL_TYPES.findIndex((m) => m.key === a);
          const indexB = AVAILABLE_MEAL_TYPES.findIndex((m) => m.key === b);
          return indexA - indexB;
        });
      }
    });
  }, []);

  const openAddMealSheet = useCallback((mealKey: string) => {
    setActiveMealType(mealKey);
    setAddMealSheetVisible(true);
  }, []);

  const handleAddMeal = useCallback((meal: TemplateMeal) => {
    if (!activeMealType) return;
    setMealEntries((prev) => ({
      ...prev,
      [activeMealType]: [...(prev[activeMealType] || []), meal],
    }));
  }, [activeMealType]);

  const handleRemoveMeal = useCallback((mealKey: string, mealId: string) => {
    setMealEntries((prev) => ({
      ...prev,
      [mealKey]: (prev[mealKey] || []).filter((m) => m.id !== mealId),
    }));
  }, []);

  const handleRatingChange = useCallback((mealKey: string, mealId: string, rating: number | null) => {
    setMealEntries((prev) => ({
      ...prev,
      [mealKey]: (prev[mealKey] || []).map((m) =>
        m.id === mealId ? { ...m, rating } : m
      ),
    }));
  }, []);

  const handleAddSuggestion = useCallback((mealKey: string, meal: TemplateMeal) => {
    setMealEntries((prev) => ({
      ...prev,
      [mealKey]: [...(prev[mealKey] || []), meal],
    }));
  }, []);

  const hasUnsavedChanges = useCallback((): boolean => {
    const initial = initialValuesRef.current;
    return (
      dietName !== initial.dietName ||
      description !== initial.description ||
      JSON.stringify(selectedMeals) !== initial.mealStructure ||
      JSON.stringify(mealEntries) !== initial.mealEntries
    );
  }, [dietName, description, selectedMeals, mealEntries]);

  const handleSubmit = useCallback(async () => {
    Keyboard.dismiss();
    if (!dietName.trim()) {
      Alert.alert('Validation Error', 'Please enter a diet name');
      return;
    }
    if (selectedMeals.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one meal');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        diet_name: dietName.trim(),
        description: description.trim() || undefined,
        meal_structure: selectedMeals,
        meal_entries: Object.keys(mealEntries).length ? mealEntries : undefined,
      });
    } catch (error) {
      console.log('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [dietName, selectedMeals, description, mealEntries, onSubmit]);

  const handleCancel = useCallback(() => {
    Keyboard.dismiss();
    const timeoutId = setTimeout(() => {
      if (hasUnsavedChanges()) {
        Alert.alert(
          'Discard Changes?',
          'You have unsaved changes. Are you sure you want to discard them?',
          [
            { text: 'Keep Editing', style: 'cancel' },
            { text: 'Discard', style: 'destructive', onPress: onCancel },
          ]
        );
      } else {
        onCancel();
      }
    }, 200);
    return () => clearTimeout(timeoutId);
  }, [hasUnsavedChanges, onCancel]);

  const clearAllMeals = useCallback(() => {
    if (selectedMeals.length > 0) {
      Alert.alert(
        'Clear All Meals?',
        'Are you sure you want to remove all selected meals?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear All', style: 'destructive', onPress: () => setSelectedMeals([]) },
        ]
      );
    }
  }, [selectedMeals.length]);

  const inputStyle = [
    styles.input,
    {
      backgroundColor: isDark ? '#2D2D3D' : '#F5F5F5',
      color: isDark ? '#FFFFFF' : '#000000',
      borderColor: isDark ? '#3D3D4D' : '#E0E0E0',
    },
  ];

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#2D2D3D' : '#EBEBEB' }]}>
        <Pressable
          onPress={handleCancel}
          style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Ionicons name="close" size={24} color={isDark ? '#FFFFFF' : '#000000'} />
        </Pressable>
        <ThemedText style={styles.title}>
          {isEditing ? 'Edit Diet Plan' : 'Create Diet Plan'}
        </ThemedText>
        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && !isSubmitting && styles.headerButtonPressed,
          ]}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#8B5CF6" />
          ) : (
            <ThemedText style={styles.saveText}>Save</ThemedText>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Diet Name */}
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Diet Name *</ThemedText>
          <TextInput
            style={inputStyle}
            value={dietName}
            onChangeText={setDietName}
            placeholder="e.g., My Custom Diet"
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            maxLength={50}
            autoCapitalize="words"
            autoFocus={!isEditing}
            returnKeyType="next"
          />
          <ThemedText style={styles.charCount}>{dietName.length}/50</ThemedText>
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Description (Optional)</ThemedText>
          <TextInput
            style={[inputStyle, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your diet plan..."
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            multiline
            numberOfLines={3}
            maxLength={200}
            textAlignVertical="top"
            returnKeyType="done"
            blurOnSubmit={true}
          />
          <ThemedText style={styles.charCount}>{description.length}/200</ThemedText>
        </View>

        {/* Meal Selection */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <ThemedText style={styles.label}>
              Select Meals * ({selectedMeals.length} selected)
            </ThemedText>
            {selectedMeals.length > 0 && (
              <Pressable onPress={clearAllMeals} hitSlop={8}>
                <ThemedText style={styles.clearText}>Clear All</ThemedText>
              </Pressable>
            )}
          </View>
          <ThemedText style={styles.hint}>
            Tap to select the meals in your diet plan. They will be ordered chronologically.
          </ThemedText>
          <View style={styles.mealsGrid}>
            {AVAILABLE_MEAL_TYPES.map((meal) => {
              const isSelected = selectedMeals.includes(meal.key);
              return (
                <Pressable
                  key={meal.key}
                  style={({ pressed }) => [
                    styles.mealChip,
                    {
                      backgroundColor: isSelected ? '#8B5CF6' : isDark ? '#2D2D3D' : '#F5F5F5',
                      borderColor: isSelected ? '#8B5CF6' : isDark ? '#3D3D4D' : '#E0E0E0',
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  onPress={() => toggleMeal(meal.key)}
                >
                  <Ionicons
                    name={meal.icon as any}
                    size={16}
                    color={isSelected ? '#FFFFFF' : isDark ? '#AAAAAA' : '#555555'}
                  />
                  <ThemedText
                    style={[
                      styles.mealChipLabel,
                      { color: isSelected ? '#FFFFFF' : isDark ? '#FFFFFF' : '#000000' },
                    ]}
                  >
                    {meal.label}
                  </ThemedText>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={styles.mealChipCheck} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Per-meal sections with interactive cards ── */}
        {selectedMeals.length > 0 && (
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Plan Your Meals</ThemedText>
            <ThemedText style={styles.hint}>
              {`Add meals to each section. Tap "Add new meal" to search for ingredients.`}
            </ThemedText>

            {selectedMeals.map((mealKey) => (
              <MealSection
                key={mealKey}
                mealKey={mealKey}
                meals={mealEntries[mealKey] || []}
                onAddPress={() => openAddMealSheet(mealKey)}
                onRemoveMeal={(mealId) => handleRemoveMeal(mealKey, mealId)}
                onRatingChange={(mealId, rating) => handleRatingChange(mealKey, mealId, rating)}
                onAddSuggestion={(meal) => handleAddSuggestion(mealKey, meal)}
                isDark={isDark}
              />
            ))}
          </View>
        )}

        {/* Tips */}
        <View
          style={[
            styles.tipsContainer,
            {
              backgroundColor: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.05)',
              borderColor: isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.15)',
            },
          ]}
        >
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={18} color="#8B5CF6" />
            <ThemedText style={styles.tipsTitle}>Tips</ThemedText>
          </View>
          <ThemedText style={styles.tipText}>
            • Choose meal slots that match your typical eating schedule
          </ThemedText>
          <ThemedText style={styles.tipText}>
            • Add meals with specific ingredients for accurate tracking
          </ThemedText>
          <ThemedText style={styles.tipText}>
            • You can always edit your diet plan later
          </ThemedText>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Meal Sheet */}
      <AddMealSheet
        visible={addMealSheetVisible}
        onClose={() => setAddMealSheetVisible(false)}
        onAdd={handleAddMeal}
        mealType={activeMealType || ''}
        isDark={isDark}
      />
    </ThemedView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    minWidth: 48,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonPressed: { opacity: 0.5 },
  title: { fontSize: 17, fontWeight: '600' },
  saveText: { fontSize: 16, fontWeight: '600', color: '#8B5CF6' },
  content: { flex: 1 },
  contentContainer: { padding: 16 },
  inputGroup: { marginBottom: 24 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, opacity: 0.85 },
  clearText: { fontSize: 13, color: '#EF4444', fontWeight: '500' },
  hint: { fontSize: 12, opacity: 0.55, marginBottom: 12, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: { minHeight: 80, paddingTop: 12 },
  charCount: { fontSize: 11, opacity: 0.45, textAlign: 'right', marginTop: 4 },
  mealsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  mealChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  mealChipLabel: { fontSize: 14, fontWeight: '500' },
  mealChipCheck: { marginLeft: 2 },

  // Meal Section
  mealSection: {
    marginBottom: 20,
    gap: 12,
  },
  mealSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  mealSectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealSectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  mealCountBadge: {
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  mealCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Add Meal Card
  addMealCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addMealIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMealText: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.7,
  },

  // Template Meal Card
  templateMealCard: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  mealImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealEmoji: {
    fontSize: 28,
  },
  mealInfo: {
    flex: 1,
    gap: 4,
  },
  mealNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  macroText: {
    fontSize: 11,
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ingredientCount: {
    fontSize: 11,
    opacity: 0.5,
    marginLeft: 8,
  },

  // Suggestions
  suggestionsDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  suggestionsLabel: {
    fontSize: 11,
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionsScroll: {
    gap: 10,
    paddingRight: 4,
  },
  suggestionCard: {
    width: 128,
    borderRadius: 12,
    padding: 10,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  suggestionImage: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionEmoji: {
    fontSize: 24,
  },
  suggestionName: {
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionCal: {
    fontSize: 11,
    color: '#f97316',
    fontWeight: '500',
  },
  suggestionMacros: {
    flexDirection: 'row',
    gap: 6,
  },
  suggestionMacroText: {
    fontSize: 10,
    fontWeight: '500',
  },
  vegBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  vegBadgeText: {
    fontSize: 9,
    color: '#22c55e',
  },

  // Sheet styles
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.74)',
  },
  sheetKvWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    maxHeight: '92%',
    minHeight: '50%',
    borderTopWidth: 1,
    borderTopColor: '#252525',
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#303030',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  sheetHeaderCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetHeaderTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  sheetIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  sheetBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mealNameInputWrap: {
    marginBottom: 10,
  },
  mealNameInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  sheetSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  sheetSearchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  sheetDropdown: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    maxHeight: 250,
    marginTop: 8,
  },
  sheetDropdownList: {
    flexGrow: 0,
  },
  sheetDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  sheetDropdownMain: {
    flex: 1,
    gap: 2,
  },
  sheetDropdownName: {
    fontSize: 14,
    fontWeight: '500',
  },
  sheetDropdownDetail: {
    fontSize: 11,
    opacity: 0.5,
  },
  sheetDropdownCal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f97316',
  },
  sheetSep: {
    height: 1,
    marginHorizontal: 12,
  },
  sheetLoadMoreBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#252525',
  },
  sheetLoadMoreText: {
    fontSize: 13,
    opacity: 0.5,
    fontWeight: '500',
  },
  sheetNoResults: {
    fontSize: 13,
    opacity: 0.5,
    textAlign: 'center',
    paddingVertical: 8,
  },
  sheetSelectedScroll: {
    maxHeight: 200,
    marginTop: 10,
  },
  sheetEmptyHint: {
    opacity: 0.4,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  sheetSelectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 7,
    gap: 10,
    borderWidth: 1,
  },
  sheetSelectedInfo: {
    flex: 1,
    gap: 3,
  },
  sheetSelectedName: {
    fontSize: 14,
    fontWeight: '500',
  },
  sheetSelectedDetail: {
    fontSize: 12,
    opacity: 0.5,
  },
  sheetQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sheetQtyBtn: {
    width: 27,
    height: 27,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetQtyBtnText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  sheetQtyNum: {
    width: 20,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  sheetRemoveBtn: {
    width: 27,
    height: 27,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  sheetFooter: {
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  sheetMacroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sheetMacroPill: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 8,
    marginHorizontal: 3,
    borderWidth: 1,
  },
  sheetMacroVal: {
    fontSize: 15,
    fontWeight: '700',
  },
  sheetMacroLabel: {
    fontSize: 10,
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  sheetPrimaryBtn: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  sheetPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Tips
  tipsContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  tipText: {
    fontSize: 13,
    opacity: 0.65,
    lineHeight: 20,
    paddingLeft: 4,
  },
});
