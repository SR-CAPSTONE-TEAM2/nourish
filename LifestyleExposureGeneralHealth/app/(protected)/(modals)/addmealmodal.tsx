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

interface FoodPortion {
  amount: number
  unit: string
  modifier: string | null
  gram_weight: number
}

interface FoodResult {
  fdc_id: number
  display_name: string
  ingredient_name: string
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  // All available portions from DB (replaces single amount/unit/gram_weight)
  portions: FoodPortion[] | null
  // Kept for backwards compat — first portion's values
  amount: number | null
  unit: string | null
  modifier: string | null
  gram_weight: number | null
}

interface SelectedIngredient extends FoodResult {
  qty: number
  // The portion the user actually chose
  chosen_gram_weight: number
  chosen_portion_label: string
}

// Pending = food chosen from search, waiting for portion confirmation
interface PendingFood {
  item: FoodResult
  // Which portion index is selected in the dropdown
  portionIdx: number
  // Free-entry quantity multiplier (e.g. 2 = 2× the chosen portion)
  multiplier: string
}

interface Props {
  visible: boolean
  onClose: () => void
  onSuccess?: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20
const DEBOUNCE = 350

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

const MEAL_COLORS: Record<MealType, string> = {
  Breakfast: '#fbbf24',
  Lunch: '#34d399',
  Dinner: '#60a5fa',
  Snack: '#f97316',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a readable label for a portion, e.g. "1 cup (shredded)" or "28 g" */
function portionLabel(p: FoodPortion): string {
  const parts: string[] = []
  if (p.amount) parts.push(String(p.amount))
  if (p.unit && p.unit !== 'undetermined') parts.push(p.unit)
  if (p.modifier) parts.push(`(${p.modifier})`)
  parts.push(`· ${p.gram_weight}g`)
  return parts.join(' ')
}

/** Always-available fallback: 100g */
const PER_100G_PORTION: FoodPortion = {
  amount: 100,
  unit: 'g',
  modifier: null,
  gram_weight: 100,
}

/** Get sorted portions for a food, always including the 100g fallback */
function getPortions(item: FoodResult): FoodPortion[] {
  const db = (item.portions ?? []).filter(p => p.gram_weight > 0)
  // Deduplicate by gram_weight label
  const seen = new Set<string>()
  const unique = db.filter(p => {
    const key = portionLabel(p)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  // Add 100g only if not already there
  const has100g = unique.some(p => p.gram_weight === 100 && p.unit === 'g')
  return has100g ? unique : [...unique, PER_100G_PORTION]
}

function formatPortion(item: FoodResult) {
  if (!item.amount && !item.unit) return 'per 100 g'
  const parts: string[] = []
  if (item.amount) parts.push(String(item.amount))
  if (item.unit && item.unit !== 'undetermined') parts.push(item.unit)
  if (item.modifier) parts.push(`(${item.modifier})`)
  return parts.join(' ')
}

/** Scale per-100g nutrient by grams consumed */
function scaledNutrient(val: number | null, grams: number) {
  if (val == null) return 0
  return Math.round((val * grams) / 100)
}

/** Grams consumed for a pending food selection */
function pendingGrams(pending: PendingFood, portions: FoodPortion[]): number {
  const portion = portions[pending.portionIdx] ?? PER_100G_PORTION
  const mult = parseFloat(pending.multiplier)
  const safeMult = isNaN(mult) || mult <= 0 ? 1 : mult
  return portion.gram_weight * safeMult
}

// ─── Search ───────────────────────────────────────────────────────────────────

async function searchFoods(
  term: string,
  page: number,
): Promise<{ results: FoodResult[]; hasMore: boolean }> {
  const offset = page * PAGE_SIZE
  const { data, error } = await supabase.rpc('search_food_with_portions', {
    search_term: term,
    result_limit: PAGE_SIZE,
    result_offset: offset,
  })
  if (error) return { results: [], hasMore: false }
  const results: FoodResult[] = data ?? []
  return { results, hasMore: results.length === PAGE_SIZE }
}

// ─── Grouping (unchanged) ─────────────────────────────────────────────────────

const STRIP_WORDS = /,?\s*(raw|cooked|canned|frozen|fresh|diced|sliced|chopped|whole|boneless|skinless|peeled|dried|roasted|baked|grilled|boiled|steamed|uncooked|prepared|ground|shredded|grated|minced|cubed|crumbled|pitted|crushed|squeezed|reduced fat|low fat|fat free|nonfat|lowfat|NFS|ns|w\/|without skin|with skin)\b/gi

export function baseName(name: string): string {
  const beforeComma = name.split(',')[0].trim()
  return beforeComma.replace(STRIP_WORDS, '').replace(/,\s*$/, '').trim()
}

interface FoodGroup {
  base: string
  items: FoodResult[]
}

export function groupByBaseName(results: FoodResult[]): FoodGroup[] {
  const map = new Map<string, FoodResult[]>()
  for (const item of results) {
    if (!item.ingredient_name) continue
    const key = baseName(item.ingredient_name).toLowerCase()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries()).map(([_, items]) => ({
    base: baseName(items[0].ingredient_name),
    items,
  }))
}

function variantLabel(fullName: string, base: string): string {
  const lower = fullName.toLowerCase()
  const baseIdx = lower.indexOf(base.toLowerCase())
  if (baseIdx !== -1) {
    const after = fullName.slice(baseIdx + base.length).replace(/^,?\s*/, '').trim()
    if (after) return after
  }
  const commaIdx = fullName.indexOf(',')
  return commaIdx !== -1 ? fullName.slice(commaIdx + 1).trim() : fullName
}

// ─── Portion Picker (inline panel) ───────────────────────────────────────────

function PortionPicker({
  pending,
  onChange,
  onConfirm,
  onCancel,
  accentColor,
}: {
  pending: PendingFood
  onChange: (next: PendingFood) => void
  onConfirm: () => void
  onCancel: () => void
  accentColor: string
}) {
  const portions = getPortions(pending.item)
  const grams = pendingGrams(pending, portions)
  const kcal = scaledNutrient(pending.item.calories, grams)
  const protein = scaledNutrient(pending.item.protein, grams)
  const carbs = scaledNutrient(pending.item.carbs, grams)
  const fat = scaledNutrient(pending.item.fat, grams)

  return (
    <View style={pickerStyles.wrap}>
      {/* Food name */}
      <Text style={pickerStyles.name} numberOfLines={2}>
        {baseName(pending.item.ingredient_name)}
      </Text>

      {/* Unit selector */}
      <Text style={pickerStyles.label}>Portion size</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={pickerStyles.portionRow}
      >
        {portions.map((p, i) => (
          <TouchableOpacity
            key={i}
            style={[
              pickerStyles.portionChip,
              pending.portionIdx === i && {
                borderColor: accentColor,
                backgroundColor: accentColor + '18',
              },
            ]}
            onPress={() => onChange({ ...pending, portionIdx: i })}
            activeOpacity={0.75}
          >
            <Text
              style={[
                pickerStyles.portionChipText,
                pending.portionIdx === i && { color: accentColor },
              ]}
            >
              {portions[i].amount}{' '}
              {portions[i].unit !== 'undetermined' ? portions[i].unit : ''}
              {portions[i].modifier ? ` (${portions[i].modifier})` : ''}
            </Text>
            <Text style={pickerStyles.portionChipGrams}>{portions[i].gram_weight}g</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Quantity multiplier */}
      <Text style={pickerStyles.label}>How many?</Text>
      <View style={pickerStyles.qtyWrap}>
        <TouchableOpacity
          style={pickerStyles.qtyStepBtn}
          onPress={() => {
            const cur = parseFloat(pending.multiplier)
            const next = isNaN(cur) ? 1 : Math.max(0.25, parseFloat((cur - 0.25).toFixed(2)))
            onChange({ ...pending, multiplier: String(next) })
          }}
        >
          <Text style={pickerStyles.qtyStepText}>−</Text>
        </TouchableOpacity>

        <TextInput
          style={pickerStyles.qtyInput}
          value={pending.multiplier}
          onChangeText={v => onChange({ ...pending, multiplier: v })}
          keyboardType="decimal-pad"
          selectTextOnFocus
        />

        <TouchableOpacity
          style={pickerStyles.qtyStepBtn}
          onPress={() => {
            const cur = parseFloat(pending.multiplier)
            const next = isNaN(cur) ? 1 : parseFloat((cur + 0.25).toFixed(2))
            onChange({ ...pending, multiplier: String(next) })
          }}
        >
          <Text style={pickerStyles.qtyStepText}>+</Text>
        </TouchableOpacity>

        <Text style={pickerStyles.qtyGrams}>= {Math.round(grams)}g total</Text>
      </View>

      {/* Live macro preview */}
      <View style={pickerStyles.macroPreview}>
        <View style={pickerStyles.macroPill}>
          <Text style={[pickerStyles.macroVal, { color: '#f97316' }]}>{kcal}</Text>
          <Text style={pickerStyles.macroLabel}>kcal</Text>
        </View>
        <View style={pickerStyles.macroPill}>
          <Text style={[pickerStyles.macroVal, { color: '#34d399' }]}>{protein}g</Text>
          <Text style={pickerStyles.macroLabel}>protein</Text>
        </View>
        <View style={pickerStyles.macroPill}>
          <Text style={[pickerStyles.macroVal, { color: '#a78bfa' }]}>{carbs}g</Text>
          <Text style={pickerStyles.macroLabel}>carbs</Text>
        </View>
        <View style={pickerStyles.macroPill}>
          <Text style={[pickerStyles.macroVal, { color: '#60a5fa' }]}>{fat}g</Text>
          <Text style={pickerStyles.macroLabel}>fat</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={pickerStyles.actions}>
        <TouchableOpacity style={pickerStyles.cancelBtn} onPress={onCancel}>
          <Text style={pickerStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[pickerStyles.confirmBtn, { backgroundColor: accentColor }]}
          onPress={onConfirm}
        >
          <Text style={pickerStyles.confirmText}>Add to meal</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const pickerStyles = StyleSheet.create({
  wrap: {
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f0f0f0',
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  portionRow: {
    gap: 8,
    paddingVertical: 2,
  },
  portionChip: {
    borderWidth: 1.5,
    borderColor: '#2e2e2e',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#242424',
    gap: 2,
  },
  portionChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#aaa',
  },
  portionChipGrams: {
    fontSize: 10,
    color: '#444',
  },
  qtyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qtyStepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyStepText: {
    color: '#ccc',
    fontSize: 20,
    fontWeight: '400',
    lineHeight: 22,
  },
  qtyInput: {
    width: 64,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#333',
    color: '#f0f0f0',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  qtyGrams: {
    fontSize: 12,
    color: '#555',
    marginLeft: 4,
  },
  macroPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  macroPill: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#212121',
    borderRadius: 10,
    paddingVertical: 8,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  macroVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  macroLabel: {
    fontSize: 9,
    color: '#444',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  cancelText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 2,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: '#141414',
    fontSize: 14,
    fontWeight: '700',
  },
})

// ─── Main Modal ───────────────────────────────────────────────────────────────

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
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  // Pending portion selection
  const [pending, setPending] = useState<PendingFood | null>(null)

  const slideAnim = useRef(new Animated.Value(600)).current
  const overlayAnim = useRef(new Animated.Value(0)).current
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastQuery = useRef('')

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
    setExpandedGroup(null)
    setPending(null)
    lastQuery.current = ''
  }

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!query.trim()) { setResults([]); setHasMore(false); return }

    searchTimer.current = setTimeout(async () => {
      lastQuery.current = query.trim()
      setSearching(true)
      setPage(0)
      setExpandedGroup(null)
      setPending(null)
      const { results: data, hasMore: more } = await searchFoods(query.trim(), 0)
      if (lastQuery.current !== query.trim()) return
      setResults(data)
      setHasMore(more)
      setSearching(false)
    }, DEBOUNCE)
  }, [query])

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

  /** Tap a food item → open portion picker instead of immediately adding */
  function selectFood(item: FoodResult) {
    const portions = getPortions(item)
    // Default to the first portion that isn't 100g if available
    const defaultIdx = portions.findIndex(p => !(p.gram_weight === 100 && p.unit === 'g'))
    setPending({
      item,
      portionIdx: defaultIdx >= 0 ? defaultIdx : 0,
      multiplier: '1',
    })
    // Collapse the dropdown while picker is open
    setResults([])
    setQuery('')
  }

  /** Confirm portion selection → add to selected list */
  function confirmPending() {
    if (!pending) return
    const portions = getPortions(pending.item)
    const portion = portions[pending.portionIdx] ?? PER_100G_PORTION
    const mult = parseFloat(pending.multiplier)
    const safeMult = isNaN(mult) || mult <= 0 ? 1 : mult
    const grams = portion.gram_weight * safeMult

    const label = `${safeMult !== 1 ? `${safeMult}× ` : ''}${portionLabel(portion)}`

    setSelected(prev => {
      const exists = prev.find(s => s.fdc_id === pending.item.fdc_id)
      if (exists) {
        // Update existing entry's portion
        return prev.map(s =>
          s.fdc_id === pending.item.fdc_id
            ? { ...s, chosen_gram_weight: grams, chosen_portion_label: label, qty: 1 }
            : s
        )
      }
      return [
        ...prev,
        {
          ...pending.item,
          qty: 1,
          chosen_gram_weight: grams,
          chosen_portion_label: label,
        },
      ]
    })
    setPending(null)
    setHasMore(false)
  }

  function removeIngredient(fdc_id: number) {
    setSelected(prev => prev.filter(s => s.fdc_id !== fdc_id))
  }

  function changeQty(fdc_id: number, delta: number) {
    setSelected(prev =>
      prev.map(s =>
        s.fdc_id === fdc_id ? { ...s, qty: Math.max(1, s.qty + delta) } : s
      )
    )
  }

  // Totals use chosen_gram_weight × qty
  const totalCalories = selected.reduce(
    (sum, s) => sum + scaledNutrient(s.calories, s.chosen_gram_weight * s.qty), 0
  )
  const totalProtein = selected.reduce(
    (sum, s) => sum + scaledNutrient(s.protein, s.chosen_gram_weight * s.qty), 0
  )
  const totalCarbs = selected.reduce(
    (sum, s) => sum + scaledNutrient(s.carbs, s.chosen_gram_weight * s.qty), 0
  )
  const totalFat = selected.reduce(
    (sum, s) => sum + scaledNutrient(s.fat, s.chosen_gram_weight * s.qty), 0
  )

  async function handleSubmit() {
    if (!mealType || selected.length === 0 || submitting) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Not authenticated')

      const { data: mealRow, error: mealError } = await supabase
        .from('user_meals')
        .insert({
          user_id: user.id,
          meal_type: mealType,
          meal_date: new Date().toISOString(),
          total_calories: totalCalories,
          total_protein: totalProtein,
          total_carbs: totalCarbs,
          total_fat: totalFat,
        })
        .select('meal_id')
        .single()

      if (mealError || !mealRow) throw new Error(mealError?.message ?? 'Failed to create meal')

      const items = selected.map(s => ({
        meal_id: mealRow.meal_id,
        fdc_id: s.fdc_id,
        ingredient_name: s.ingredient_name,
        quantity: s.qty,
        gram_weight: s.chosen_gram_weight,
        calories: scaledNutrient(s.calories, s.chosen_gram_weight * s.qty),
        protein: scaledNutrient(s.protein, s.chosen_gram_weight * s.qty),
        carbs: scaledNutrient(s.carbs, s.chosen_gram_weight * s.qty),
        fat: scaledNutrient(s.fat, s.chosen_gram_weight * s.qty),
      }))

      const { error: itemsError } = await supabase.from('meal_items').insert(items)
      if (itemsError) throw new Error(itemsError.message)

      onSuccess?.()
      onClose()
    } catch (err: any) {
      setSubmitError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const accentColor = mealType ? MEAL_COLORS[mealType] : '#f97316'

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kvWrapper}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            {step === 'ingredients' && (
              <TouchableOpacity onPress={() => { setStep('type'); setPending(null) }} style={styles.iconBtn}>
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

          {/* ── STEP 1 ── */}
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

          {/* ── STEP 2 ── */}
          {step === 'ingredients' && (
            <View style={styles.ingredientsWrap}>

              {/* Search — hidden while picker is open */}
              {!pending && (
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
              )}

              {/* Portion picker — shown instead of dropdown when a food is tapped */}
              {pending && (
                <PortionPicker
                  pending={pending}
                  onChange={setPending}
                  onConfirm={confirmPending}
                  onCancel={() => setPending(null)}
                  accentColor={accentColor}
                />
              )}

              {/* Search results dropdown */}
              {!pending && results.length > 0 && (
                <View style={styles.dropdown}>
                  <FlatList
                    data={groupByBaseName(results)}
                    keyExtractor={group => group.base}
                    keyboardShouldPersistTaps="always"
                    style={styles.dropdownList}
                    renderItem={({ item: group }) => {
                      const isSingle = group.items.length === 1
                      const isExpanded = expandedGroup === group.base
                      const representative = group.items[0]

                      return (
                        <View>
                          <TouchableOpacity
                            style={styles.dropdownItem}
                            onPress={() => {
                              if (isSingle) {
                                selectFood(representative)
                              } else {
                                setExpandedGroup(isExpanded ? null : group.base)
                              }
                            }}
                          >
                            <View style={styles.dropdownMain}>
                              <Text style={styles.dropdownName} numberOfLines={1}>
                                {group.base}
                              </Text>
                              <Text style={styles.dropdownDetail}>
                                {isSingle
                                  ? formatPortion(representative)
                                  : `${group.items.length} variations  ${isExpanded ? '▲' : '▼'}`
                                }
                              </Text>
                            </View>
                            {representative.calories != null && (
                              <Text style={styles.dropdownCal}>
                                {scaledNutrient(representative.calories, representative.gram_weight ?? 100)} kcal
                              </Text>
                            )}
                          </TouchableOpacity>

                          {isExpanded && group.items.map(item => (
                            <TouchableOpacity
                              key={item.fdc_id}
                              style={[styles.dropdownItem, styles.variantRow]}
                              onPress={() => {
                                selectFood(item)
                                setExpandedGroup(null)
                              }}
                            >
                              <View style={styles.dropdownMain}>
                                <Text style={[styles.dropdownName, styles.variantName]} numberOfLines={2}>
                                  {variantLabel(item.ingredient_name, group.base) || item.ingredient_name}
                                </Text>
                                <Text style={styles.dropdownDetail}>{formatPortion(item)}</Text>
                              </View>
                              {item.calories != null && (
                                <Text style={styles.dropdownCal}>
                                  {scaledNutrient(item.calories, item.gram_weight ?? 100)} kcal
                                </Text>
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      )
                    }}
                    ItemSeparatorComponent={() => <View style={styles.sep} />}
                    ListFooterComponent={
                      hasMore ? (
                        <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
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

              {!pending && !searching && query.length > 0 && results.length === 0 && (
                <Text style={styles.noResults}>No results for "{query}". Try a different term.</Text>
              )}

              {/* Selected ingredients */}
              {!pending && (
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
                            {baseName(item.ingredient_name)}
                          </Text>
                          <Text style={styles.selectedDetail}>
                            {item.chosen_portion_label}
                            {'  ·  '}
                            <Text style={{ color: '#f97316' }}>
                              {scaledNutrient(item.calories, item.chosen_gram_weight * item.qty)} kcal
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
              )}

              {/* Footer */}
              {!pending && selected.length > 0 && (
                <View style={styles.footer}>
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

                  {submitError && (
                    <Text style={styles.errorText}>{submitError}</Text>
                  )}

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
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#303030',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
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
  ingredientsWrap: {
    flex: 1,
    gap: 10,
  },
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
  variantRow: {
    paddingLeft: 26,
    backgroundColor: '#1c1c1c',
    borderLeftWidth: 2,
    borderLeftColor: '#2e2e2e',
  },
  variantName: {
    fontSize: 13,
    color: '#999',
  },
})