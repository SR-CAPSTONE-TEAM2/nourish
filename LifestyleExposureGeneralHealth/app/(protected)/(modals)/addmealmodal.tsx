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
  // joined from food_portions (first available portion)
  amount: number | null
  unit: string | null
  modifier: string | null
}

interface SelectedIngredient extends FoodResult {
  qty: number // multiplier on the portion amount
}

interface Props {
  visible: boolean
  onClose: () => void
  onSubmit: (meal: { meal_type: MealType; ingredients: SelectedIngredient[] }) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPortion(item: FoodResult) {
  if (!item.amount && !item.unit) return '100 g'
  const parts: string[] = []
  if (item.amount) parts.push(String(item.amount))
  if (item.unit && item.unit !== 'undetermined') parts.push(item.unit)
  if (item.modifier) parts.push(`(${item.modifier})`)
  return parts.join(' ')
}

function scaledNutrient(val: number | null, qty: number, amount: number | null) {
  if (val == null) return null
  // USDA nutrients are per 100 g. If a portion amount exists we scale by (amount * qty) / 100.
  const scale = amount ? (amount * qty) / 100 : qty
  return Math.round(val * scale)
}

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

const MEAL_COLORS: Record<MealType, string> = {
  Breakfast: '#fbbf24',
  Lunch: '#34d399',
  Dinner: '#60a5fa',
  Snack: '#f97316',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddMealModal({ visible, onClose, onSubmit }: Props) {
  const [step, setStep] = useState<'type' | 'ingredients'>('type')
  const [mealType, setMealType] = useState<MealType | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<SelectedIngredient[]>([])

  const slideAnim = useRef(new Animated.Value(600)).current
  const overlayAnim = useRef(new Animated.Value(0)).current
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Animate in/out
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
    setSelected([])
  }

  // ── Debounced search against Supabase
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!query.trim()) { setResults([]); return }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      // Join food_nutrients with food_portions to get one representative portion per food
      const { data, error } = await supabase.rpc('search_food_with_portions', { search_term: query.trim() })
      if (!error && data) setResults(data as FoodResult[])
      setSearching(false)
    }, 350)
  }, [query])

  function addIngredient(item: FoodResult) {
    setSelected(prev => {
      const exists = prev.find(s => s.fdc_id === item.fdc_id)
      if (exists) {
        return prev.map(s => s.fdc_id === item.fdc_id ? { ...s, qty: s.qty + 1 } : s)
      }
      return [...prev, { ...item, qty: 1 }]
    })
    setQuery('')
    setResults([])
  }

  function removeIngredient(fdc_id: number) {
    setSelected(prev => prev.filter(s => s.fdc_id !== fdc_id))
  }

  function changeQty(fdc_id: number, delta: number) {
    setSelected(prev =>
      prev
        .map(s => s.fdc_id === fdc_id ? { ...s, qty: Math.max(1, s.qty + delta) } : s)
    )
  }

  const totalCalories = selected.reduce((sum, s) => {
    return sum + (scaledNutrient(s.calories, s.qty, s.amount) ?? 0)
  }, 0)

  function handleSubmit() {
    if (!mealType || selected.length === 0) return
    onSubmit({ meal_type: mealType, ingredients: selected })
    onClose()
  }

  const accentColor = mealType ? MEAL_COLORS[mealType] : '#f97316'

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kvWrapper}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>

          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            {step === 'ingredients' && (
              <TouchableOpacity onPress={() => setStep('type')} style={styles.backBtn}>
                <Text style={styles.backBtnText}>←</Text>
              </TouchableOpacity>
            )}
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>
                {step === 'type' ? 'Log a meal' : `${mealType}`}
              </Text>
              {step === 'ingredients' && mealType && (
                <View style={[styles.mealTypeBadge, { backgroundColor: accentColor + '22', borderColor: accentColor + '55' }]}>
                  <Text style={[styles.mealTypeBadgeText, { color: accentColor }]}>{mealType}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── STEP 1: Meal Type ── */}
          {step === 'type' && (
            <View style={styles.typeGrid}>
              {MEAL_TYPES.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeCard,
                    mealType === type && { borderColor: MEAL_COLORS[type], backgroundColor: MEAL_COLORS[type] + '18' },
                  ]}
                  onPress={() => setMealType(type)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.typeEmoji}>
                    {type === 'Breakfast' ? '🌅' : type === 'Lunch' ? '☀️' : type === 'Dinner' ? '🌙' : '🍎'}
                  </Text>
                  <Text style={[styles.typeLabel, mealType === type && { color: MEAL_COLORS[type] }]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {step === 'type' && (
            <TouchableOpacity
              style={[styles.nextBtn, !mealType && styles.nextBtnDisabled, mealType && { backgroundColor: accentColor }]}
              onPress={() => mealType && setStep('ingredients')}
              disabled={!mealType}
            >
              <Text style={[styles.nextBtnText, !mealType && styles.nextBtnTextDisabled]}>
                Continue →
              </Text>
            </TouchableOpacity>
          )}

          {/* ── STEP 2: Ingredients ── */}
          {step === 'ingredients' && (
            <View style={styles.ingredientsStep}>

              {/* Search */}
              <View style={[styles.searchBox, { borderColor: query ? accentColor + '88' : '#2e2e2e' }]}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search ingredients…"
                  placeholderTextColor="#444"
                  value={query}
                  onChangeText={setQuery}
                  autoCorrect={false}
                />
                {searching && <Text style={styles.searchingDot}>•••</Text>}
                {query.length > 0 && !searching && (
                  <TouchableOpacity onPress={() => { setQuery(''); setResults([]) }}>
                    <Text style={styles.clearBtn}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Results dropdown */}
              {results.length > 0 && (
                <View style={styles.dropdown}>
                  <FlatList
                    data={results.slice(0, 8)}
                    keyExtractor={item => String(item.fdc_id)}
                    keyboardShouldPersistTaps="always"
                    style={styles.dropdownList}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.dropdownItem} onPress={() => addIngredient(item)}>
                        <View style={styles.dropdownMain}>
                          <Text style={styles.dropdownName} numberOfLines={1}>{item.ingredient_name}</Text>
                          <Text style={styles.dropdownPortion}>{formatPortion(item)}</Text>
                        </View>
                        <View style={styles.dropdownMacros}>
                          {item.calories != null && (
                            <Text style={styles.dropdownCal}>{Math.round(item.calories * (item.amount ?? 100) / 100)} kcal</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.dropdownSep} />}
                  />
                </View>
              )}

              {/* Selected ingredients */}
              <ScrollView style={styles.selectedList} keyboardShouldPersistTaps="always">
                {selected.length === 0 ? (
                  <Text style={styles.emptyHint}>Add ingredients above to build your meal.</Text>
                ) : (
                  selected.map(item => (
                    <View key={item.fdc_id} style={styles.selectedItem}>
                      <View style={styles.selectedInfo}>
                        <Text style={styles.selectedName} numberOfLines={2}>{item.ingredient_name}</Text>
                        <Text style={styles.selectedPortion}>
                          {item.qty > 1 ? `${item.qty}× ` : ''}{formatPortion(item)}
                          {item.calories != null
                            ? `  ·  ${scaledNutrient(item.calories, item.qty, item.amount)} kcal`
                            : ''}
                        </Text>
                      </View>
                      <View style={styles.selectedControls}>
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

              {/* Totals + Submit */}
              {selected.length > 0 && (
                <View style={styles.footer}>
                  <View style={styles.totals}>
                    <Text style={styles.totalsLabel}>Total</Text>
                    <Text style={[styles.totalsCalories, { color: accentColor }]}>{totalCalories} kcal</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: accentColor }]}
                    onPress={handleSubmit}
                    activeOpacity={0.82}
                  >
                    <Text style={styles.submitBtnText}>Log {mealType}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  kvWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#181818',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderTopColor: '#252525',
  },

  // Handle
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  headerText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f0f0f0',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: '#aaa',
    fontSize: 18,
    lineHeight: 22,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  mealTypeBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  mealTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Type selection
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
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
  typeEmoji: {
    fontSize: 30,
  },
  typeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#bbb',
  },

  // Next button
  nextBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  nextBtnDisabled: {
    backgroundColor: '#242424',
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#141414',
  },
  nextBtnTextDisabled: {
    color: '#444',
  },

  // Ingredients step
  ingredientsStep: {
    flex: 1,
    gap: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#212121',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#e8e8e8',
    padding: 0,
  },
  searchingDot: {
    color: '#555',
    fontSize: 14,
    letterSpacing: 2,
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
    maxHeight: 260,
    zIndex: 10,
  },
  dropdownList: {
    flexGrow: 0,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  dropdownMain: {
    flex: 1,
    gap: 2,
  },
  dropdownName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e0e0e0',
  },
  dropdownPortion: {
    fontSize: 12,
    color: '#555',
  },
  dropdownMacros: {
    alignItems: 'flex-end',
  },
  dropdownCal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f97316',
  },
  dropdownSep: {
    height: 1,
    backgroundColor: '#242424',
    marginHorizontal: 14,
  },

  // Selected list
  selectedList: {
    maxHeight: 280,
  },
  emptyHint: {
    color: '#3a3a3a',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#212121',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  selectedInfo: {
    flex: 1,
    gap: 3,
  },
  selectedName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e0e0e0',
  },
  selectedPortion: {
    fontSize: 12,
    color: '#555',
  },
  selectedControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyBtn: {
    width: 28,
    height: 28,
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
    width: 22,
    textAlign: 'center',
    color: '#e0e0e0',
    fontSize: 14,
    fontWeight: '600',
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#2e1010',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  removeBtnText: {
    color: '#e05555',
    fontSize: 11,
    fontWeight: '700',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#232323',
    marginTop: 4,
  },
  totals: {
    flex: 1,
    gap: 2,
  },
  totalsLabel: {
    fontSize: 11,
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  totalsCalories: {
    fontSize: 22,
    fontWeight: '700',
  },
  submitBtn: {
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#141414',
  },
})