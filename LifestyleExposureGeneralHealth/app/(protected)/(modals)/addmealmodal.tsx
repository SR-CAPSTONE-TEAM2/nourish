import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
} from 'react-native'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'

interface FoodResult {
  fdc_id: number
  ingredient_name: string
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  amount: number | null
  unit: string | null
  modifier: string | null
}

interface SelectedIngredient extends FoodResult {
  qty: number
}

export interface AddedMealItem {
  fdc_id: number
  ingredient_name: string
  quantity: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface AddMealSuccessPayload {
  mealType: MealType
  mealId: string
  items: AddedMealItem[]
}

interface Props {
  visible: boolean
  onClose: () => void
  /** Called after a successful DB insert — parent can refresh its meal list */
  onSuccess?: (payload?: AddMealSuccessPayload) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20   // results per page
const DEBOUNCE = 350  // ms

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

const MEAL_COLORS: Record<MealType, string> = {
  Breakfast: '#fbbf24',
  Lunch: '#34d399',
  Dinner: '#60a5fa',
  Snack: '#f97316',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPortion(item: FoodResult) {
  if (!item.amount && !item.unit) return 'per 100 g'
  const parts: string[] = []
  if (item.amount) parts.push(String(item.amount))
  if (item.unit && item.unit !== 'undetermined') parts.push(item.unit)
  if (item.modifier) parts.push(`(${item.modifier})`)
  return parts.join(' ')
}

/** Scale a per-100g nutrient value by portion size × qty */
function scaledNutrient(val: number | null, qty: number, amount: number | null) {
  if (val == null) return 0
  const scale = amount ? (amount * qty) / 100 : qty
  return Math.round(val * scale)
}

// ─── Search logic ─────────────────────────────────────────────────────────────
//
// Strategy (in order):
//  1. Full phrase match  — ILIKE '%chicken breast%'
//  2. If < PAGE_SIZE results, also run a word-split OR search so that
//     e.g. "grilled salmon" surfaces results containing "salmon" or "grilled"
//  3. "Load more" appends the next page of the phrase match

async function searchFoods(
  term: string,
  page: number,
): Promise<{ results: FoodResult[]; hasMore: boolean }> {
  const offset = page * PAGE_SIZE

  const { data: phraseData, error } = await supabase.rpc('search_food_with_portions', {
    search_term: term,
    result_limit: PAGE_SIZE,
    result_offset: offset,
  })

  if (error) return { results: [], hasMore: false }

  const phraseResults: FoodResult[] = phraseData ?? []

  // If first page has fewer than PAGE_SIZE hits, augment with a word-split OR search
  if (page === 0 && phraseResults.length < PAGE_SIZE) {
    const words = term.trim().split(/\s+/).filter(w => w.length > 2)
    if (words.length > 1) {
      // Run individual word searches and merge, de-duplicating by fdc_id
      const wordSearches = await Promise.all(
        words.map(word =>
          supabase.rpc('search_food_with_portions', {
            search_term: word,
            result_limit: PAGE_SIZE,
            result_offset: 0,
          })
        )
      )
      const seen = new Set(phraseResults.map(r => r.fdc_id))
      const extra: FoodResult[] = []
      for (const { data } of wordSearches) {
        if (!data) continue
        for (const item of data as FoodResult[]) {
          if (!seen.has(item.fdc_id)) {
            seen.add(item.fdc_id)
            extra.push(item)
          }
        }
      }
      // Phrase matches first, word matches after
      return {
        results: [...phraseResults, ...extra].slice(0, PAGE_SIZE * 2),
        hasMore: false, // mixed results don't support clean pagination
      }
    }
  }

  return {
    results: phraseResults,
    hasMore: phraseResults.length === PAGE_SIZE,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddMealModal({ visible, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'type' | 'ingredients'>('type')
  const [mealType, setMealType] = useState<MealType | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodResult[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [searching, setSearching] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selected, setSelected] = useState<SelectedIngredient[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const slideAnim = useRef(new Animated.Value(600)).current
  const overlayAnim = useRef(new Animated.Value(0)).current
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastQuery = useRef('')

  // ── Sheet animation
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 600, duration: 280, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => resetState())
    }
  }, [visible])

  function resetState() {
    setStep('type')
    setMealType(null)
    setQuery('')
    setResults([])
    setPage(0)
    setHasMore(false)
    setSelected([])
    setSubmitError(null)
    lastQuery.current = ''
  }

  // ── Debounced search (page 0)
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!query.trim()) { setResults([]); setHasMore(false); return }

    searchTimer.current = setTimeout(async () => {
      lastQuery.current = query.trim()
      setSearching(true)
      setPage(0)
      const { results: data, hasMore: more } = await searchFoods(query.trim(), 0)
      // Guard against stale responses
      if (lastQuery.current !== query.trim()) return
      setResults(data)
      setHasMore(more)
      setSearching(false)
    }, DEBOUNCE)
  }, [query])

  // ── Load more (next page)
  async function loadMore() {
    if (!hasMore || loadingMore) return
    setLoadingMore(true)
    const nextPage = page + 1
    const { results: more, hasMore: stillMore } = await searchFoods(lastQuery.current, nextPage)
    setResults(prev => {
      const seen = new Set(prev.map(r => r.fdc_id))
      return [...prev, ...more.filter(r => !seen.has(r.fdc_id))]
    })
    setPage(nextPage)
    setHasMore(stillMore)
    setLoadingMore(false)
  }

  // ── Ingredient management
  function addIngredient(item: FoodResult) {
    setSelected(prev => {
      const exists = prev.find(s => s.fdc_id === item.fdc_id)
      if (exists) return prev.map(s => s.fdc_id === item.fdc_id ? { ...s, qty: s.qty + 1 } : s)
      return [...prev, { ...item, qty: 1 }]
    })
    setQuery('')
    setResults([])
    setHasMore(false)
  }

  function removeIngredient(fdc_id: number) {
    setSelected(prev => prev.filter(s => s.fdc_id !== fdc_id))
  }

  function changeQty(fdc_id: number, delta: number) {
    setSelected(prev =>
      prev.map(s => s.fdc_id === fdc_id ? { ...s, qty: Math.max(1, s.qty + delta) } : s)
    )
  }

  const totalCalories = selected.reduce(
    (sum, s) => sum + scaledNutrient(s.calories, s.qty, s.amount), 0
  )
  const totalProtein = selected.reduce(
    (sum, s) => sum + scaledNutrient(s.protein, s.qty, s.amount), 0
  )
  const totalCarbs = selected.reduce(
    (sum, s) => sum + scaledNutrient(s.carbs, s.qty, s.amount), 0
  )
  const totalFat = selected.reduce(
    (sum, s) => sum + scaledNutrient(s.fat, s.qty, s.amount), 0
  )

  // ── Submit to Supabase
  async function handleSubmit() {
    if (!mealType || selected.length === 0 || submitting) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Not authenticated')

      // 1. Insert the meal header row
      const { data: mealRow, error: mealError } = await supabase
        .from('user_meals')
        .insert({
          user_id: user.id,
          meal_type: mealType,
          meal_date: new Date().toISOString().split('T')[0],
          total_calories: totalCalories,
          total_protein: totalProtein,
          total_carbs: totalCarbs,
          total_fat: totalFat,
        })
        .select('meal_id')
        .single()

      if (mealError || !mealRow) throw new Error(mealError?.message ?? 'Failed to create meal')

      // 2. Insert each ingredient as a meal_item row
      const items = selected.map(s => ({
        meal_id: mealRow.meal_id,
        fdc_id: s.fdc_id,
        ingredient_name: s.ingredient_name,
        quantity: s.qty,
      }))

      const { error: itemsError } = await supabase.from('meal_items').insert(items)
      if (itemsError) throw new Error(itemsError.message)

      const successPayload: AddMealSuccessPayload = {
        mealType,
        mealId: mealRow.meal_id,
        items: selected.map(s => ({
          fdc_id: s.fdc_id,
          ingredient_name: s.ingredient_name,
          quantity: s.qty,
          calories: scaledNutrient(s.calories, s.qty, s.amount),
          protein: scaledNutrient(s.protein, s.qty, s.amount),
          carbs: scaledNutrient(s.carbs, s.qty, s.amount),
          fat: scaledNutrient(s.fat, s.qty, s.amount),
        })),
      }

      // Success
      onSuccess?.(successPayload)
      onClose()
    } catch (err: any) {
      setSubmitError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const accentColor = mealType ? MEAL_COLORS[mealType] : '#f97316'

  // ── Render
  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      {/* Dim overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kvWrapper}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>

          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            {step === 'ingredients' && (
              <TouchableOpacity onPress={() => setStep('type')} style={styles.iconBtn}>
                <Text style={styles.iconBtnText}>←</Text>
              </TouchableOpacity>
            )}
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>
                {step === 'type' ? 'Log a meal' : mealType!}
              </Text>
              {step === 'ingredients' && mealType && (
                <View style={[styles.badge, { backgroundColor: accentColor + '22', borderColor: accentColor + '55' }]}>
                  <Text style={[styles.badgeText, { color: accentColor }]}>{mealType}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
              <Text style={styles.iconBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── STEP 1: pick meal type ── */}
          {step === 'type' && (
            <>
              <View style={styles.typeGrid}>
                {MEAL_TYPES.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeCard,
                      mealType === type && {
                        borderColor: MEAL_COLORS[type],
                        backgroundColor: MEAL_COLORS[type] + '18',
                      },
                    ]}
                    onPress={() => setMealType(type)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.typeEmoji}>
                      {type === 'Breakfast' ? '🌅' : type === 'Lunch' ? '☀️' : type === 'Dinner' ? '🌙' : '🍎'}
                    </Text>
                    <Text style={[styles.typeLabel, mealType === type && { color: MEAL_COLORS[type] }]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  !mealType ? styles.primaryBtnDisabled : { backgroundColor: accentColor },
                ]}
                onPress={() => mealType && setStep('ingredients')}
                disabled={!mealType}
              >
                <Text style={[styles.primaryBtnText, !mealType && styles.primaryBtnTextDisabled]}>
                  Continue →
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── STEP 2: build ingredients ── */}
          {step === 'ingredients' && (
            <View style={styles.ingredientsWrap}>

              {/* Search box */}
              <View style={[styles.searchBox, { borderColor: query ? accentColor + '99' : '#2e2e2e' }]}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search ingredients…"
                  placeholderTextColor="#444"
                  value={query}
                  onChangeText={setQuery}
                  autoCorrect={false}
                  returnKeyType="search"
                />
                {searching
                  ? <ActivityIndicator size="small" color="#555" />
                  : query.length > 0 && (
                    <TouchableOpacity onPress={() => { setQuery(''); setResults([]) }}>
                      <Text style={styles.clearBtn}>✕</Text>
                    </TouchableOpacity>
                  )
                }
              </View>

              {/* Search results dropdown */}
              {results.length > 0 && (
                <View style={styles.dropdown}>
                  <FlatList
                    data={results}
                    keyExtractor={item => String(item.fdc_id)}
                    keyboardShouldPersistTaps="always"
                    style={styles.dropdownList}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => addIngredient(item)}
                      >
                        <View style={styles.dropdownMain}>
                          <Text style={styles.dropdownName} numberOfLines={2}>
                            {item.ingredient_name}
                          </Text>
                          <Text style={styles.dropdownDetail}>{formatPortion(item)}</Text>
                        </View>
                        {item.calories != null && (
                          <Text style={styles.dropdownCal}>
                            {Math.round(item.calories * (item.amount ?? 100) / 100)} kcal
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.sep} />}
                    ListFooterComponent={
                      hasMore ? (
                        <TouchableOpacity
                          style={styles.loadMoreBtn}
                          onPress={loadMore}
                          disabled={loadingMore}
                        >
                          {loadingMore
                            ? <ActivityIndicator size="small" color="#555" />
                            : <Text style={styles.loadMoreText}>Load more results…</Text>
                          }
                        </TouchableOpacity>
                      ) : results.length >= PAGE_SIZE ? (
                        <Text style={styles.endText}>Showing all results</Text>
                      ) : null
                    }
                  />
                </View>
              )}

              {/* No results hint */}
              {!searching && query.length > 0 && results.length === 0 && (
                <Text style={styles.noResults}>No results for "{query}". Try a different term.</Text>
              )}

              {/* Selected ingredients */}
              <ScrollView
                style={styles.selectedScroll}
                keyboardShouldPersistTaps="always"
                showsVerticalScrollIndicator={false}
              >
                {selected.length === 0 ? (
                  <Text style={styles.emptyHint}>Search above to add ingredients to your meal.</Text>
                ) : (
                  selected.map(item => (
                    <View key={item.fdc_id} style={styles.selectedRow}>
                      <View style={styles.selectedInfo}>
                        <Text style={styles.selectedName} numberOfLines={2}>
                          {item.ingredient_name}
                        </Text>
                        <Text style={styles.selectedDetail}>
                          {formatPortion(item)}
                          {'  ·  '}
                          <Text style={{ color: '#f97316' }}>
                            {scaledNutrient(item.calories, item.qty, item.amount)} kcal
                          </Text>
                        </Text>
                      </View>
                      <View style={styles.qtyRow}>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => changeQty(item.fdc_id, -1)}>
                          <Text style={styles.qtyBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyNum}>{item.qty}</Text>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => changeQty(item.fdc_id, 1)}>
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.removeBtn} onPress={() => removeIngredient(item.fdc_id)}>
                          <Text style={styles.removeBtnText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>

              {/* Macro summary + submit */}
              {selected.length > 0 && (
                <View style={styles.footer}>
                  {/* Macro pills */}
                  <View style={styles.macroRow}>
                    <View style={styles.macroPill}>
                      <Text style={[styles.macroVal, { color: '#f97316' }]}>{totalCalories}</Text>
                      <Text style={styles.macroLabel}>kcal</Text>
                    </View>
                    <View style={styles.macroPill}>
                      <Text style={[styles.macroVal, { color: '#34d399' }]}>{totalProtein}g</Text>
                      <Text style={styles.macroLabel}>protein</Text>
                    </View>
                    <View style={styles.macroPill}>
                      <Text style={[styles.macroVal, { color: '#a78bfa' }]}>{totalCarbs}g</Text>
                      <Text style={styles.macroLabel}>carbs</Text>
                    </View>
                    <View style={styles.macroPill}>
                      <Text style={[styles.macroVal, { color: '#60a5fa' }]}>{totalFat}g</Text>
                      <Text style={styles.macroLabel}>fat</Text>
                    </View>
                  </View>

                  {/* Error */}
                  {submitError && (
                    <Text style={styles.errorText}>{submitError}</Text>
                  )}

                  {/* Submit button */}
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: accentColor }, submitting && { opacity: 0.6 }]}
                    onPress={handleSubmit}
                    disabled={submitting}
                    activeOpacity={0.82}
                  >
                    {submitting
                      ? <ActivityIndicator size="small" color="#141414" />
                      : <Text style={styles.primaryBtnText}>Save {mealType}</Text>
                    }
                  </TouchableOpacity>
                </View>
              )}

            </View>
          )}

        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.74)',
  },
  kvWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#181818',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    maxHeight: '92%',
    minHeight: '50%',
    borderTopWidth: 1,
    borderTopColor: '#252525',
  },

  // Handle
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#303030',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 6,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#f0f0f0',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '600',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Meal type grid
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
    marginBottom: 20,
  },
  typeCard: {
    width: '47%',
    backgroundColor: '#212121',
    borderWidth: 1.5,
    borderColor: '#2e2e2e',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  typeEmoji: { fontSize: 30 },
  typeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#bbb',
  },

  // Primary action button
  primaryBtn: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryBtnDisabled: { backgroundColor: '#242424' },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#141414',
  },
  primaryBtnTextDisabled: { color: '#444' },

  // Ingredients step wrapper
  ingredientsWrap: {
    flex: 1,
    gap: 10,
  },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#212121',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  searchIcon: { fontSize: 15 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#e8e8e8',
    padding: 0,
  },
  clearBtn: {
    color: '#555',
    fontSize: 13,
    fontWeight: '600',
    paddingLeft: 4,
  },

  // Dropdown
  dropdown: {
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 14,
    overflow: 'hidden',
    maxHeight: 300,
  },
  dropdownList: { flexGrow: 0 },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  dropdownMain: { flex: 1, gap: 2 },
  dropdownName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e0e0e0',
  },
  dropdownDetail: {
    fontSize: 11,
    color: '#555',
  },
  dropdownCal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f97316',
  },
  sep: {
    height: 1,
    backgroundColor: '#252525',
    marginHorizontal: 12,
  },
  loadMoreBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#252525',
  },
  loadMoreText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  endText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    paddingVertical: 10,
  },
  noResults: {
    fontSize: 13,
    color: '#444',
    textAlign: 'center',
    paddingVertical: 8,
  },

  // Selected list
  selectedScroll: { maxHeight: 230 },
  emptyHint: {
    color: '#333',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#212121',
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 7,
    gap: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  selectedInfo: { flex: 1, gap: 3 },
  selectedName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e0e0e0',
  },
  selectedDetail: {
    fontSize: 12,
    color: '#555',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  qtyBtn: {
    width: 27,
    height: 27,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  qtyNum: {
    width: 20,
    textAlign: 'center',
    color: '#e0e0e0',
    fontSize: 14,
    fontWeight: '600',
  },
  removeBtn: {
    width: 27,
    height: 27,
    borderRadius: 8,
    backgroundColor: '#2e1010',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  removeBtnText: {
    color: '#e05555',
    fontSize: 10,
    fontWeight: '700',
  },

  // Footer
  footer: {
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#232323',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroPill: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#212121',
    borderRadius: 10,
    paddingVertical: 8,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  macroVal: {
    fontSize: 15,
    fontWeight: '700',
  },
  macroLabel: {
    fontSize: 10,
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  errorText: {
    fontSize: 13,
    color: '#e05555',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
})
