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
import { useUserDiet } from '@/hooks/useUserDiet'

// ─── Types ────────────────────────────────────────────────────────────────────

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
  vitamin_a_ug: number | null
  vitamin_b12_ug: number | null
  vitamin_b6_mg: number | null
  vitamin_c_mg: number | null
  vitamin_d_ug: number | null
  vitamin_e_mg: number | null
  vitamin_k_ug: number | null
  portions: FoodPortion[] | null
  amount: number | null
  unit: string | null
  modifier: string | null
  gram_weight: number | null
}

interface SelectedIngredient extends FoodResult {
  qty: number
  chosen_gram_weight: number   // total grams for this entry (portion.gram_weight * multiplier * qty baked in at confirm)
  chosen_portion_label: string
}

interface PendingFood {
  item: FoodResult
  portionIdx: number
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
const DEFAULT_MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  orange: '#f97316', amber: '#fbbf24', green: '#34d399',
  blue: '#60a5fa', purple: '#a78bfa', rose: '#fb7185', teal: '#2dd4bf',
}
const COLOR_POOL = [C.amber, C.green, C.blue, C.orange, C.purple, C.rose, C.teal]

function getMealTypeColor(type: string, index: number): string {
  const lc = type.toLowerCase()
  if (lc.includes('breakfast') || lc.includes('morning')) return C.amber
  if (lc.includes('lunch') || lc.includes('midday')) return C.green
  if (lc.includes('dinner') || lc.includes('evening') || lc.includes('night')) return C.blue
  if (lc.includes('snack')) return C.orange
  if (lc.includes('pre')) return C.purple
  if (lc.includes('post')) return C.teal
  return COLOR_POOL[index % COLOR_POOL.length]
}

function getMealEmoji(type: string): string {
  const lc = type.toLowerCase()
  if (lc.includes('breakfast') || lc.includes('morning')) return '🌅'
  if (lc.includes('lunch') || lc.includes('midday')) return '☀️'
  if (lc.includes('dinner') || lc.includes('supper') || lc.includes('evening')) return '🌙'
  if (lc.includes('snack')) return '🍎'
  if (lc.includes('pre')) return '⚡'
  if (lc.includes('post')) return '💪'
  if (lc.includes('brunch')) return '🥐'
  if (lc.includes('dessert')) return '🍰'
  if (lc.includes('drink') || lc.includes('shake') || lc.includes('smoothie')) return '🥤'
  return '🍽️'
}

function extractMealTypes(mealStructure: any): string[] {
  if (!mealStructure) return DEFAULT_MEAL_TYPES
  if (Array.isArray(mealStructure)) return mealStructure.map(String)
  if (typeof mealStructure === 'object') return Object.keys(mealStructure)
  return DEFAULT_MEAL_TYPES
}

// ─── Nutrient helpers ─────────────────────────────────────────────────────────

function portionLabel(p: FoodPortion): string {
  const parts: string[] = []
  if (p.amount) parts.push(String(p.amount))
  if (p.unit && p.unit !== 'undetermined') parts.push(p.unit)
  if (p.modifier) parts.push(`(${p.modifier})`)
  parts.push(`· ${p.gram_weight}g`)
  return parts.join(' ')
}

const PER_100G: FoodPortion = { amount: 100, unit: 'g', modifier: null, gram_weight: 100 }

function getPortions(item: FoodResult): FoodPortion[] {
  const db = (item.portions ?? []).filter(p => p.gram_weight > 0)
  const seen = new Set<string>()
  const unique = db.filter(p => {
    const key = portionLabel(p)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  // Sort ascending by gram_weight so smallest (most natural single serving) is first
  unique.sort((a, b) => a.gram_weight - b.gram_weight)
  const has100g = unique.some(p => p.gram_weight === 100 && p.unit === 'g')
  return has100g ? unique : [...unique, PER_100G]
}

/**
 * Pick the best default portion index.
 * Prefers the smallest non-100g portion (most likely a single natural unit like
 * "1 large egg" at 50g rather than "1 cup" at 243g). Falls back to 100g.
 */
function getDefaultPortionIdx(portions: FoodPortion[]): number {
  // Find smallest gram_weight that is NOT the raw 100g entry
  const nonHundred = portions
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => !(p.gram_weight === 100 && p.unit === 'g'))
  if (nonHundred.length === 0) return portions.findIndex(p => p.gram_weight === 100 && p.unit === 'g')
  // Among non-100g entries, pick the one with the smallest gram_weight
  nonHundred.sort((a, b) => a.p.gram_weight - b.p.gram_weight)
  return nonHundred[0].i
}

function formatPortion(item: FoodResult) {
  if (!item.amount && !item.unit) return 'per 100 g'
  const parts: string[] = []
  if (item.amount) parts.push(String(item.amount))
  if (item.unit && item.unit !== 'undetermined') parts.push(item.unit)
  if (item.modifier) parts.push(`(${item.modifier})`)
  return parts.join(' ')
}

/**
 * Scale a per-100g nutrient value to actual grams consumed.
 * All USDA nutrient values are per 100g — this converts to the actual serving.
 */
function scaled(val: number | null, grams: number): number {
  if (val == null) return 0
  return Math.round((val * grams) / 100 * 100) / 100
}

function scaledRound(val: number | null, grams: number): number {
  if (val == null) return 0
  return Math.round((val * grams) / 100)
}

/**
 * Total grams for the current pending selection.
 * = portion.gram_weight × multiplier
 * NOTE: qty is handled separately at the SelectedIngredient level.
 */
function pendingGrams(pending: PendingFood, portions: FoodPortion[]): number {
  const portion = portions[pending.portionIdx] ?? PER_100G
  const mult = parseFloat(pending.multiplier)
  const safeMult = isNaN(mult) || mult <= 0 ? 1 : mult
  return portion.gram_weight * safeMult
}

// ─── Search ───────────────────────────────────────────────────────────────────

async function searchFoods(term: string, page: number): Promise<{ results: FoodResult[]; hasMore: boolean }> {
  const offset = page * PAGE_SIZE
  const { data, error } = await supabase.rpc('search_food_with_portions', {
    search_term: term, result_limit: PAGE_SIZE, result_offset: offset,
  })
  if (error) return { results: [], hasMore: false }
  const results: FoodResult[] = data ?? []
  return { results, hasMore: results.length === PAGE_SIZE }
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

const STRIP_WORDS = /,?\s*(raw|cooked|canned|frozen|fresh|diced|sliced|chopped|whole|boneless|skinless|peeled|dried|roasted|baked|grilled|boiled|steamed|uncooked|prepared|ground|shredded|grated|minced|cubed|crumbled|pitted|crushed|squeezed|reduced fat|low fat|fat free|nonfat|lowfat|NFS|ns|w\/|without skin|with skin)\b/gi

export function baseName(name: string): string {
  return name.split(',')[0].trim().replace(STRIP_WORDS, '').replace(/,\s*$/, '').trim()
}

interface FoodGroup { base: string; items: FoodResult[] }

export function groupByBaseName(results: FoodResult[]): FoodGroup[] {
  const map = new Map<string, FoodResult[]>()
  for (const item of results) {
    if (!item.ingredient_name) continue
    const key = baseName(item.ingredient_name).toLowerCase()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries()).map(([_, items]) => ({ base: baseName(items[0].ingredient_name), items }))
}

function variantLabel(fullName: string, base: string): string {
  const lower = fullName.toLowerCase()
  const idx = lower.indexOf(base.toLowerCase())
  if (idx !== -1) {
    const after = fullName.slice(idx + base.length).replace(/^,?\s*/, '').trim()
    if (after) return after
  }
  const commaIdx = fullName.indexOf(',')
  return commaIdx !== -1 ? fullName.slice(commaIdx + 1).trim() : fullName
}

// ─── Portion Picker ───────────────────────────────────────────────────────────

function PortionPicker({ pending, onChange, onConfirm, onCancel, accentColor }: {
  pending: PendingFood; onChange: (next: PendingFood) => void
  onConfirm: () => void; onCancel: () => void; accentColor: string
}) {
  const portions = getPortions(pending.item)
  const grams = pendingGrams(pending, portions)
  const kcal = scaledRound(pending.item.calories, grams)
  const protein = scaledRound(pending.item.protein, grams)
  const carbs = scaledRound(pending.item.carbs, grams)
  const fat = scaledRound(pending.item.fat, grams)

  return (
    <View style={pp.wrap}>
      <Text style={pp.name} numberOfLines={2}>{baseName(pending.item.ingredient_name)}</Text>

      <Text style={pp.label}>Portion size</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={pp.portionRow}>
        {portions.map((p, i) => (
          <TouchableOpacity
            key={i}
            style={[pp.chip, pending.portionIdx === i && { borderColor: accentColor, backgroundColor: accentColor + '18' }]}
            onPress={() => onChange({ ...pending, portionIdx: i })}
            activeOpacity={0.75}
          >
            <Text style={[pp.chipText, pending.portionIdx === i && { color: accentColor }]}>
              {p.amount}{' '}{p.unit !== 'undetermined' ? p.unit : ''}{p.modifier ? ` (${p.modifier})` : ''}
            </Text>
            <Text style={pp.chipG}>{p.gram_weight}g</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={pp.label}>How many?</Text>
      <View style={pp.qtyRow}>
        <TouchableOpacity style={pp.qtyBtn} onPress={() => {
          const cur = parseFloat(pending.multiplier)
          onChange({ ...pending, multiplier: String(isNaN(cur) ? 1 : Math.max(0.25, parseFloat((cur - 0.25).toFixed(2)))) })
        }}>
          <Text style={pp.qtyBtnText}>−</Text>
        </TouchableOpacity>
        <TextInput
          style={pp.qtyInput} value={pending.multiplier}
          onChangeText={v => onChange({ ...pending, multiplier: v })}
          keyboardType="decimal-pad" selectTextOnFocus
        />
        <TouchableOpacity style={pp.qtyBtn} onPress={() => {
          const cur = parseFloat(pending.multiplier)
          onChange({ ...pending, multiplier: String(isNaN(cur) ? 1 : parseFloat((cur + 0.25).toFixed(2))) })
        }}>
          <Text style={pp.qtyBtnText}>+</Text>
        </TouchableOpacity>
        <Text style={pp.qtyGrams}>= {Math.round(grams)}g total</Text>
      </View>

      <View style={pp.macros}>
        {[
          [kcal, 'kcal', '#f97316'], [protein + 'g', 'protein', '#34d399'],
          [carbs + 'g', 'carbs', '#a78bfa'], [fat + 'g', 'fat', '#60a5fa'],
        ].map(([val, lbl, col]) => (
          <View key={lbl as string} style={pp.macroPill}>
            <Text style={[pp.macroVal, { color: col as string }]}>{val}</Text>
            <Text style={pp.macroLabel}>{lbl}</Text>
          </View>
        ))}
      </View>

      <View style={pp.actions}>
        <TouchableOpacity style={pp.cancelBtn} onPress={onCancel}>
          <Text style={pp.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[pp.confirmBtn, { backgroundColor: accentColor }]} onPress={onConfirm}>
          <Text style={pp.confirmText}>Add to meal</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const pp = StyleSheet.create({
  wrap: { backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 16, padding: 16, gap: 10 },
  name: { fontSize: 15, fontWeight: '700', color: '#f0f0f0', marginBottom: 2 },
  label: { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 },
  portionRow: { gap: 8, paddingVertical: 2 },
  chip: { borderWidth: 1.5, borderColor: '#2e2e2e', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', backgroundColor: '#242424', gap: 2 },
  chipText: { fontSize: 13, fontWeight: '600', color: '#aaa' },
  chipG: { fontSize: 10, color: '#444' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { color: '#ccc', fontSize: 20, fontWeight: '400', lineHeight: 22 },
  qtyInput: { width: 64, height: 36, borderRadius: 10, backgroundColor: '#242424', borderWidth: 1, borderColor: '#333', color: '#f0f0f0', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  qtyGrams: { fontSize: 12, color: '#555', marginLeft: 4 },
  macros: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  macroPill: { flex: 1, alignItems: 'center', backgroundColor: '#212121', borderRadius: 10, paddingVertical: 8, marginHorizontal: 2, borderWidth: 1, borderColor: '#2a2a2a' },
  macroVal: { fontSize: 14, fontWeight: '700' },
  macroLabel: { fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, height: 42, borderRadius: 12, backgroundColor: '#242424', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2e2e2e' },
  cancelText: { color: '#666', fontSize: 14, fontWeight: '600' },
  confirmBtn: { flex: 2, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#141414', fontSize: 14, fontWeight: '700' },
})

// ─── Meal Type Card ───────────────────────────────────────────────────────────

function MealTypeCard({ type, color, emoji, isSelected, onPress }: {
  type: string; color: string; emoji: string; isSelected: boolean; onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={[mtc.card, isSelected && { borderColor: color, backgroundColor: color + '18' }]}
      onPress={onPress} activeOpacity={0.75}
    >
      <Text style={mtc.emoji}>{emoji}</Text>
      <Text style={[mtc.label, isSelected && { color }]}>{type}</Text>
    </TouchableOpacity>
  )
}
const mtc = StyleSheet.create({
  card: { width: '47%', backgroundColor: '#212121', borderWidth: 1.5, borderColor: '#2e2e2e', borderRadius: 18, padding: 20, alignItems: 'center', gap: 8 },
  emoji: { fontSize: 28 },
  label: { fontSize: 14, fontWeight: '600', color: '#bbb', textAlign: 'center' },
})

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function AddMealModal({ visible, onClose, onSuccess }: Props) {
  const { activeDiet } = useUserDiet()
  const mealTypes: string[] = activeDiet
    ? extractMealTypes((activeDiet as any).meal_structure)
    : DEFAULT_MEAL_TYPES

  const [step, setStep] = useState<'type' | 'ingredients'>('type')
  const [mealType, setMealType] = useState<string | null>(null)
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
    setStep('type'); setMealType(null); setQuery(''); setResults([])
    setPage(0); setHasMore(false); setSelected([]); setSubmitError(null)
    setExpandedGroup(null); setPending(null); lastQuery.current = ''
  }

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!query.trim()) { setResults([]); setHasMore(false); return }
    searchTimer.current = setTimeout(async () => {
      lastQuery.current = query.trim()
      setSearching(true); setPage(0); setExpandedGroup(null); setPending(null)
      const { results: data, hasMore: more } = await searchFoods(query.trim(), 0)
      if (lastQuery.current !== query.trim()) return
      setResults(data); setHasMore(more); setSearching(false)
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
    setPage(nextPage); setHasMore(stillMore); setLoadingMore(false)
  }

  function selectFood(item: FoodResult) {
    const portions = getPortions(item)
    // FIX: use getDefaultPortionIdx to pick the smallest natural serving,
    // not just the first non-100g entry (which could be a large cup measure)
    const defaultIdx = getDefaultPortionIdx(portions)
    setPending({ item, portionIdx: defaultIdx, multiplier: '1' })
    setResults([]); setQuery('')
  }

  function confirmPending() {
    if (!pending) return
    const portions = getPortions(pending.item)
    const portion = portions[pending.portionIdx] ?? PER_100G
    const mult = parseFloat(pending.multiplier)
    const safeMult = isNaN(mult) || mult <= 0 ? 1 : mult
    // chosen_gram_weight = grams for ONE qty (multiplier already baked in)
    const gramsPerQty = portion.gram_weight * safeMult
    const label = `${safeMult !== 1 ? `${safeMult}× ` : ''}${portionLabel(portion)}`
    setSelected(prev => {
      const exists = prev.find(s => s.fdc_id === pending.item.fdc_id)
      if (exists) {
        return prev.map(s => s.fdc_id === pending.item.fdc_id
          ? { ...s, chosen_gram_weight: gramsPerQty, chosen_portion_label: label, qty: 1 } : s)
      }
      return [...prev, { ...pending.item, qty: 1, chosen_gram_weight: gramsPerQty, chosen_portion_label: label }]
    })
    setPending(null); setHasMore(false)
  }

  function removeIngredient(fdc_id: number) {
    setSelected(prev => prev.filter(s => s.fdc_id !== fdc_id))
  }

  function changeQty(fdc_id: number, delta: number) {
    setSelected(prev => prev.map(s => s.fdc_id === fdc_id ? { ...s, qty: Math.max(1, s.qty + delta) } : s))
  }

  // ── Totals ─────────────────────────────────────────────────────────────────
  // chosen_gram_weight = grams for 1 qty; multiply by qty for total grams
  function totalNutrient(field: keyof FoodResult): number {
    return selected.reduce((sum, s) => {
      const totalGrams = s.chosen_gram_weight * s.qty
      return sum + scaled(s[field] as number | null, totalGrams)
    }, 0)
  }

  const totalCalories = Math.round(totalNutrient('calories'))
  const totalProtein = Math.round(totalNutrient('protein'))
  const totalCarbs = Math.round(totalNutrient('carbs'))
  const totalFat = Math.round(totalNutrient('fat'))

  const totalVitC = totalNutrient('vitamin_c_mg')
  const totalVitD = totalNutrient('vitamin_d_ug')
  const totalVitA = totalNutrient('vitamin_a_ug')
  const totalVitE = totalNutrient('vitamin_e_mg')
  const totalVitK = totalNutrient('vitamin_k_ug')
  const totalVitB6 = totalNutrient('vitamin_b6_mg')
  const totalVitB12 = totalNutrient('vitamin_b12_ug')

  async function handleSubmit() {
    if (!mealType || selected.length === 0 || submitting) return
    setSubmitting(true); setSubmitError(null)
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
          total_vitamin_c: totalVitC > 0 ? totalVitC : null,
          total_vitamin_d: totalVitD > 0 ? totalVitD : null,
          total_vitamin_a: totalVitA > 0 ? totalVitA : null,
          total_vitamin_e: totalVitE > 0 ? totalVitE : null,
          total_vitamin_k: totalVitK > 0 ? totalVitK : null,
          total_vitamin_b6: totalVitB6 > 0 ? totalVitB6 : null,
          total_vitamin_b12: totalVitB12 > 0 ? totalVitB12 : null,
        })
        .select('meal_id')
        .single()

      if (mealError || !mealRow) throw new Error(mealError?.message ?? 'Failed to create meal')

      const items = selected.map(s => {
        // totalGrams = chosen_gram_weight (per-qty grams) × qty
        const totalGrams = s.chosen_gram_weight * s.qty
        return {
          meal_id: mealRow.meal_id,
          fdc_id: s.fdc_id,
          ingredient_name: s.ingredient_name,
          // Store qty and per-qty gram_weight separately so the row is self-consistent
          quantity: s.qty,
          gram_weight: s.chosen_gram_weight,   // grams for ONE qty
          // Scaled nutrient values for the TOTAL portion (chosen_gram_weight × qty)
          calories: scaledRound(s.calories, totalGrams),
          protein: scaledRound(s.protein, totalGrams),
          carbs: scaledRound(s.carbs, totalGrams),
          fat: scaledRound(s.fat, totalGrams),
          vitamin_a_ug:  s.vitamin_a_ug  != null ? scaled(s.vitamin_a_ug,  totalGrams) : null,
          vitamin_b12_ug: s.vitamin_b12_ug != null ? scaled(s.vitamin_b12_ug, totalGrams) : null,
          vitamin_b6_mg: s.vitamin_b6_mg != null ? scaled(s.vitamin_b6_mg, totalGrams) : null,
          vitamin_c_mg:  s.vitamin_c_mg  != null ? scaled(s.vitamin_c_mg,  totalGrams) : null,
          vitamin_d_ug:  s.vitamin_d_ug  != null ? scaled(s.vitamin_d_ug,  totalGrams) : null,
          vitamin_e_mg:  s.vitamin_e_mg  != null ? scaled(s.vitamin_e_mg,  totalGrams) : null,
          vitamin_k_ug:  s.vitamin_k_ug  != null ? scaled(s.vitamin_k_ug,  totalGrams) : null,
        }
      })

      const { error: itemsError } = await supabase.from('meal_items').insert(items)
      if (itemsError) throw new Error(itemsError.message)

      onSuccess?.(); onClose()
    } catch (err: any) {
      setSubmitError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const accentColor = mealType ? getMealTypeColor(mealType, mealTypes.indexOf(mealType)) : C.orange

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[ms.overlay, { opacity: overlayAnim }]} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={ms.kv} pointerEvents="box-none">
        <Animated.View style={[ms.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={ms.handle} />

          {/* Header */}
          <View style={ms.header}>
            {step === 'ingredients' && (
              <TouchableOpacity onPress={() => { setStep('type'); setPending(null) }} style={ms.iconBtn}>
                <Text style={ms.iconBtnText}>←</Text>
              </TouchableOpacity>
            )}
            <View style={ms.headerCenter}>
              <Text style={ms.headerTitle}>{step === 'type' ? 'Log a meal' : mealType!}</Text>
              {step === 'ingredients' && mealType && (
                <View style={[ms.badge, { backgroundColor: accentColor + '22', borderColor: accentColor + '55' }]}>
                  <Text style={[ms.badgeText, { color: accentColor }]}>{mealType}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={ms.iconBtn}>
              <Text style={ms.iconBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── STEP 1: Meal type selection ── */}
          {step === 'type' && (
            <>
              {activeDiet && (
                <Text style={ms.dietLabel}>
                  Meal types from{' '}
                  <Text style={{ color: '#888', fontWeight: '600' }}>{(activeDiet as any).diet_name}</Text>
                </Text>
              )}
              <ScrollView contentContainerStyle={ms.typeGrid} showsVerticalScrollIndicator={false}>
                {mealTypes.map((type, i) => (
                  <MealTypeCard
                    key={type} type={type}
                    color={getMealTypeColor(type, i)}
                    emoji={getMealEmoji(type)}
                    isSelected={mealType === type}
                    onPress={() => setMealType(type)}
                  />
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[ms.primaryBtn, !mealType ? ms.primaryBtnDis : { backgroundColor: accentColor }]}
                onPress={() => mealType && setStep('ingredients')}
                disabled={!mealType}
              >
                <Text style={[ms.primaryBtnText, !mealType && ms.primaryBtnTextDis]}>Continue →</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── STEP 2: Ingredient search ── */}
          {step === 'ingredients' && (
            <View style={ms.ingWrap}>
              {!pending && (
                <View style={[ms.searchBox, { borderColor: query ? accentColor + '99' : '#2e2e2e' }]}>
                  <Text style={ms.searchIcon}>🔍</Text>
                  <TextInput
                    style={ms.searchInput} placeholder="Search ingredients…" placeholderTextColor="#444"
                    value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search"
                  />
                  {searching
                    ? <ActivityIndicator size="small" color="#555" />
                    : query.length > 0 && (
                      <TouchableOpacity onPress={() => { setQuery(''); setResults([]) }}>
                        <Text style={ms.clearBtn}>✕</Text>
                      </TouchableOpacity>
                    )}
                </View>
              )}

              {pending && (
                <PortionPicker
                  pending={pending} onChange={setPending}
                  onConfirm={confirmPending} onCancel={() => setPending(null)}
                  accentColor={accentColor}
                />
              )}

              {!pending && results.length > 0 && (
                <View style={ms.dropdown}>
                  <FlatList
                    data={groupByBaseName(results)}
                    keyExtractor={g => g.base}
                    keyboardShouldPersistTaps="always"
                    style={ms.dropdownList}
                    renderItem={({ item: group }) => {
                      const isSingle = group.items.length === 1
                      const isExpanded = expandedGroup === group.base
                      const rep = group.items[0]
                      return (
                        <View>
                          <TouchableOpacity
                            style={ms.dropdownItem}
                            onPress={() => isSingle ? selectFood(rep) : setExpandedGroup(isExpanded ? null : group.base)}
                          >
                            <View style={ms.dropdownMain}>
                              <Text style={ms.dropdownName} numberOfLines={1}>{group.base}</Text>
                              <Text style={ms.dropdownDetail}>
                                {isSingle ? formatPortion(rep) : `${group.items.length} variations  ${isExpanded ? '▲' : '▼'}`}
                              </Text>
                            </View>
                            {rep.calories != null && (
                              <Text style={ms.dropdownCal}>{scaledRound(rep.calories, rep.gram_weight ?? 100)} kcal</Text>
                            )}
                          </TouchableOpacity>
                          {isExpanded && group.items.map(item => (
                            <TouchableOpacity
                              key={item.fdc_id}
                              style={[ms.dropdownItem, ms.variantRow]}
                              onPress={() => { selectFood(item); setExpandedGroup(null) }}
                            >
                              <View style={ms.dropdownMain}>
                                <Text style={[ms.dropdownName, ms.variantName]} numberOfLines={2}>
                                  {variantLabel(item.ingredient_name, group.base) || item.ingredient_name}
                                </Text>
                                <Text style={ms.dropdownDetail}>{formatPortion(item)}</Text>
                              </View>
                              {item.calories != null && (
                                <Text style={ms.dropdownCal}>{scaledRound(item.calories, item.gram_weight ?? 100)} kcal</Text>
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      )
                    }}
                    ItemSeparatorComponent={() => <View style={ms.sep} />}
                    ListFooterComponent={
                      hasMore ? (
                        <TouchableOpacity style={ms.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
                          {loadingMore ? <ActivityIndicator size="small" color="#555" /> : <Text style={ms.loadMoreText}>Load more results…</Text>}
                        </TouchableOpacity>
                      ) : results.length >= PAGE_SIZE ? <Text style={ms.endText}>Showing all results</Text> : null
                    }
                  />
                </View>
              )}

              {!pending && !searching && query.length > 0 && results.length === 0 && (
                <Text style={ms.noResults}>No results for "{query}".</Text>
              )}

              {!pending && (
                <ScrollView style={ms.selectedScroll} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
                  {selected.length === 0 ? (
                    <Text style={ms.emptyHint}>Search above to add ingredients.</Text>
                  ) : (
                    selected.map(item => (
                      <View key={item.fdc_id} style={ms.selectedRow}>
                        <View style={ms.selectedInfo}>
                          <Text style={ms.selectedName} numberOfLines={2}>{baseName(item.ingredient_name)}</Text>
                          <Text style={ms.selectedDetail}>
                            {item.chosen_portion_label}{'  ·  '}
                            <Text style={{ color: '#f97316' }}>
                              {scaledRound(item.calories, item.chosen_gram_weight * item.qty)} kcal
                            </Text>
                          </Text>
                        </View>
                        <View style={ms.qtyRow}>
                          <TouchableOpacity style={ms.qtyBtn} onPress={() => changeQty(item.fdc_id, -1)}>
                            <Text style={ms.qtyBtnText}>−</Text>
                          </TouchableOpacity>
                          <Text style={ms.qtyNum}>{item.qty}</Text>
                          <TouchableOpacity style={ms.qtyBtn} onPress={() => changeQty(item.fdc_id, 1)}>
                            <Text style={ms.qtyBtnText}>+</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={ms.removeBtn} onPress={() => removeIngredient(item.fdc_id)}>
                            <Text style={ms.removeBtnText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>
              )}

              {!pending && selected.length > 0 && (
                <View style={ms.footer}>
                  <View style={ms.macroRow}>
                    {[
                      [totalCalories, 'kcal', '#f97316'], [totalProtein + 'g', 'protein', '#34d399'],
                      [totalCarbs + 'g', 'carbs', '#a78bfa'], [totalFat + 'g', 'fat', '#60a5fa'],
                    ].map(([val, lbl, col]) => (
                      <View key={lbl as string} style={ms.macroPill}>
                        <Text style={[ms.macroVal, { color: col as string }]}>{val}</Text>
                        <Text style={ms.macroLabel}>{lbl}</Text>
                      </View>
                    ))}
                  </View>
                  {(totalVitC > 0 || totalVitD > 0 || totalVitA > 0) && (
                    <View style={ms.vitPreviewRow}>
                      {totalVitC > 0 && <Text style={ms.vitPreviewTag}>C: {totalVitC.toFixed(1)}mg</Text>}
                      {totalVitD > 0 && <Text style={ms.vitPreviewTag}>D: {totalVitD.toFixed(1)}μg</Text>}
                      {totalVitA > 0 && <Text style={ms.vitPreviewTag}>A: {totalVitA.toFixed(0)}μg</Text>}
                      {totalVitE > 0 && <Text style={ms.vitPreviewTag}>E: {totalVitE.toFixed(1)}mg</Text>}
                    </View>
                  )}
                  {submitError && <Text style={ms.errorText}>{submitError}</Text>}
                  <TouchableOpacity
                    style={[ms.primaryBtn, { backgroundColor: accentColor }, submitting && { opacity: 0.6 }]}
                    onPress={handleSubmit} disabled={submitting} activeOpacity={0.82}
                  >
                    {submitting
                      ? <ActivityIndicator size="small" color="#141414" />
                      : <Text style={ms.primaryBtnText}>Save {mealType}</Text>
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
const ms = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.74)' },
  kv: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#181818', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingBottom: Platform.OS === 'ios' ? 40 : 28, maxHeight: '92%', minHeight: '50%', borderTopWidth: 1, borderTopColor: '#252525' },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#303030', alignSelf: 'center', marginTop: 12, marginBottom: 6 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 10 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 19, fontWeight: '700', color: '#f0f0f0' },
  iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#242424', alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { color: '#888', fontSize: 15, fontWeight: '600' },
  badge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },

  dietLabel: { fontSize: 12, color: '#555', marginBottom: 4 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 16 },

  primaryBtn: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  primaryBtnDis: { backgroundColor: '#242424' },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#141414' },
  primaryBtnTextDis: { color: '#444' },

  ingWrap: { flex: 1, gap: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#212121', borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, gap: 10 },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 15, color: '#e8e8e8', padding: 0 },
  clearBtn: { color: '#555', fontSize: 13, fontWeight: '600', paddingLeft: 4 },

  dropdown: { backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 14, overflow: 'hidden', maxHeight: 300 },
  dropdownList: { flexGrow: 0 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, gap: 10 },
  dropdownMain: { flex: 1, gap: 2 },
  dropdownName: { fontSize: 14, fontWeight: '500', color: '#e0e0e0' },
  dropdownDetail: { fontSize: 11, color: '#555' },
  dropdownCal: { fontSize: 13, fontWeight: '600', color: '#f97316' },
  sep: { height: 1, backgroundColor: '#252525', marginHorizontal: 12 },
  loadMoreBtn: { paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#252525' },
  loadMoreText: { fontSize: 13, color: '#555', fontWeight: '500' },
  endText: { fontSize: 12, color: '#333', textAlign: 'center', paddingVertical: 10 },
  noResults: { fontSize: 13, color: '#444', textAlign: 'center', paddingVertical: 8 },

  selectedScroll: { maxHeight: 230 },
  emptyHint: { color: '#333', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  selectedRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#212121', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 7, gap: 10, borderWidth: 1, borderColor: '#2a2a2a' },
  selectedInfo: { flex: 1, gap: 3 },
  selectedName: { fontSize: 14, fontWeight: '500', color: '#e0e0e0' },
  selectedDetail: { fontSize: 12, color: '#555' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  qtyBtn: { width: 27, height: 27, borderRadius: 8, backgroundColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { color: '#ccc', fontSize: 16, fontWeight: '600', lineHeight: 20 },
  qtyNum: { width: 20, textAlign: 'center', color: '#e0e0e0', fontSize: 14, fontWeight: '600' },
  removeBtn: { width: 27, height: 27, borderRadius: 8, backgroundColor: '#2e1010', alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  removeBtnText: { color: '#e05555', fontSize: 10, fontWeight: '700' },

  footer: { gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#232323' },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroPill: { flex: 1, alignItems: 'center', backgroundColor: '#212121', borderRadius: 10, paddingVertical: 8, marginHorizontal: 3, borderWidth: 1, borderColor: '#2a2a2a' },
  macroVal: { fontSize: 15, fontWeight: '700' },
  macroLabel: { fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  vitPreviewRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  vitPreviewTag: { fontSize: 11, color: '#666', backgroundColor: '#212121', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#2a2a2a' },
  errorText: { fontSize: 13, color: '#e05555', textAlign: 'center' },
  variantRow: { paddingLeft: 26, backgroundColor: '#1c1c1c', borderLeftWidth: 2, borderLeftColor: '#2e2e2e' },
  variantName: { fontSize: 13, color: '#999' },
})