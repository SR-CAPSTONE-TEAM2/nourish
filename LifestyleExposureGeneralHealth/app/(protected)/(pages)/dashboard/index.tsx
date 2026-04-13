import { useEffect, useState, useCallback } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native'
import Svg, { Path, Text as SvgText } from 'react-native-svg'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'expo-router'
import { UserProfile, Meal } from '@/types/types'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUserDiet } from '@/hooks/useUserDiet'
import AddMealModal from '../../(modals)/addmealmodal'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#0d0d0d',
  surface: '#141414',
  surfaceHi: '#1a1a1a',
  border: '#222',
  borderHi: '#2e2e2e',
  textPrime: '#f2f2f2',
  textSub: '#5a5a5a',
  textMid: '#888',
  orange: '#f97316',
  blue: '#60a5fa',
  green: '#34d399',
  purple: '#a78bfa',
  rose: '#fb7185',
  amber: '#fbbf24',
  teal: '#2dd4bf',
}

const FONT = Platform.OS === 'ios' ? 'System' : 'sans-serif'

// ─── Vitamin RDVs ─────────────────────────────────────────────────────────────
const RDV = { vitC: 90, vitD: 20, vitA: 900, vitE: 15, vitK: 120, vitB6: 1.7, vitB12: 2.4 }

// ─── Types ────────────────────────────────────────────────────────────────────
interface MealItem {
  item_id: string
  ingredient_name: string | null
  quantity: number | null
  gram_weight: number | null
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
}

interface MealWithVitamins extends Meal {
  meal_id: string
  meal_name?: string
  meal_type: string
  total_protein?: number
  total_carbs?: number
  total_fat?: number
  total_vitamin_c?: number
  total_vitamin_d?: number
  total_vitamin_a?: number
  total_vitamin_e?: number
  total_vitamin_k?: number
  total_vitamin_b6?: number
  total_vitamin_b12?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseMealDate(dateStr: string): Date {
  const s = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T')
  return new Date(s.replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, ''))
}

function getTodayMeals(meals: MealWithVitamins[]): MealWithVitamins[] {
  const today = new Date().toDateString()
  return meals.filter(m => parseMealDate(m.meal_date).toDateString() === today)
}

function getWeekMeals(meals: MealWithVitamins[]): MealWithVitamins[] {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  return meals
    .filter(m => parseMealDate(m.meal_date) >= weekAgo)
    .sort((a, b) => parseMealDate(b.meal_date).getTime() - parseMealDate(a.meal_date).getTime())
}

function sumField(meals: MealWithVitamins[], field: keyof MealWithVitamins): number {
  return meals.reduce((s, m) => s + (Number(m[field]) || 0), 0)
}

function groupMealsByDay(meals: MealWithVitamins[]): { dateKey: string; label: string; meals: MealWithVitamins[] }[] {
  const map = new Map<string, MealWithVitamins[]>()
  for (const m of meals) {
    const d = parseMealDate(m.meal_date)
    const key = d.toDateString()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(m)
  }
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  return Array.from(map.entries())
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .map(([key, dayMeals]) => {
      let label: string
      if (key === today) label = 'Today'
      else if (key === yesterday) label = 'Yesterday'
      else {
        const d = new Date(key)
        label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
      }
      return { dateKey: key, label, meals: dayMeals }
    })
}

function extractMealTypes(mealStructure: any): string[] {
  if (!mealStructure) return ['Breakfast', 'Lunch', 'Dinner', 'Snack']
  if (Array.isArray(mealStructure)) return mealStructure.map(String)
  if (typeof mealStructure === 'object') return Object.keys(mealStructure)
  return ['Breakfast', 'Lunch', 'Dinner', 'Snack']
}

const MEAL_COLOR_POOL = [C.amber, C.green, C.blue, C.orange, C.purple, C.rose, C.teal]
function getMealTypeColor(type: string, index: number): string {
  const lc = (type ?? '').toLowerCase()
  if (lc.includes('breakfast') || lc.includes('morning')) return C.amber
  if (lc.includes('lunch') || lc.includes('midday')) return C.green
  if (lc.includes('dinner') || lc.includes('evening') || lc.includes('night')) return C.blue
  if (lc.includes('snack')) return C.orange
  if (lc.includes('pre')) return C.purple
  if (lc.includes('post')) return C.teal
  return MEAL_COLOR_POOL[index % MEAL_COLOR_POOL.length]
}

// ─── Semi-circle gauge ────────────────────────────────────────────────────────
// FIX: clamp fy so the arc never dips below the baseline (cy), which caused
// tiny arcs to build in the wrong direction.
function SemiGauge({
  value, max, label, unit, color, size = 130,
}: {
  value: number; max: number; label: string; unit: string; color: string; size?: number
}) {
  const r = size * 0.38
  const cx = size / 2
  const cy = size * 0.60
  const sw = 10
  // Clamp pct to [0, 1] and enforce a tiny minimum render threshold
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0

  const startX = cx - r
  const startY = cy
  const endX = cx + r

  const fillAngle = Math.PI - pct * Math.PI
  const fx = cx + r * Math.cos(fillAngle)
  // FIX: clamp fy to never exceed cy (baseline of the arc).
  // When pct is near 0, sin(fillAngle) approaches sin(π) = 0 but floating point
  // can give a tiny positive value, pushing the arc endpoint below the baseline
  // and reversing the sweep direction.
  const fyRaw = cy + r * Math.sin(fillAngle)
  const fy = Math.min(cy, fyRaw)

  const largeArc = pct > 0.5 ? 1 : 0

  const trackPath = `M ${startX.toFixed(1)} ${startY.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${endX.toFixed(1)} ${startY.toFixed(1)}`
  // Use a higher threshold (0.01) to avoid near-zero arcs that can still render oddly
  const fillPath = pct > 0.01
    ? `M ${startX.toFixed(1)} ${startY.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 ${largeArc} 1 ${fx.toFixed(1)} ${fy.toFixed(1)}`
    : ''

  const displayVal = value >= 1000
    ? `${(value / 1000).toFixed(1)}k`
    : String(Math.round(value))

  const svgH = size * 0.68

  return (
    <View style={{ alignItems: 'center', flex: 1, minWidth: 90 }}>
      <Svg width={size} height={svgH}>
        {/* Track */}
        <Path d={trackPath} stroke={C.border} strokeWidth={sw} fill="none" strokeLinecap="round" />
        {/* Fill */}
        {fillPath ? (
          <Path d={fillPath} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" />
        ) : null}
        {/* Value */}
        <SvgText
          x={cx} y={cy - 4}
          fontSize="20" fontWeight="700"
          fontFamily={FONT}
          fill={color} textAnchor="middle"
        >
          {displayVal}
        </SvgText>
        {/* Unit */}
        <SvgText
          x={cx} y={cy + 13}
          fontSize="10"
          fontFamily={FONT}
          fill={C.textSub} textAnchor="middle"
        >
          {unit}
        </SvgText>
        {/* % of goal */}
        {pct > 0 && (
          <SvgText
            x={cx} y={svgH - 2}
            fontSize="9"
            fontFamily={FONT}
            fill={color + '99'} textAnchor="middle"
          >
            {Math.round(pct * 100)}%
          </SvgText>
        )}
      </Svg>
      <Text style={[gauge.label, { fontFamily: FONT }]}>{label}</Text>
    </View>
  )
}
const gauge = StyleSheet.create({
  label: { fontSize: 11, color: C.textMid, textAlign: 'center', marginTop: 2, letterSpacing: 0.3 },
})

// ─── Vitamin progress row ─────────────────────────────────────────────────────
function VitaminRow({ label, value, rdv, unit, color }: {
  label: string; value: number; rdv: number; unit: string; color: string
}) {
  const pct = rdv > 0 ? Math.min(1, value / rdv) : 0
  const pctDisplay = Math.round(pct * 100)
  return (
    <View style={{ gap: 5 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={{ fontFamily: FONT, fontSize: 11, color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.7 }}>
          {label}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
          <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: '700', color }}>
            {value.toFixed(1)}{unit}
          </Text>
          <Text style={{ fontFamily: FONT, fontSize: 10, color: C.textSub }}>
            {pctDisplay}% RDV
          </Text>
        </View>
      </View>
      <View style={{ height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${Math.min(100, pctDisplay)}%` as any, backgroundColor: color, borderRadius: 2 }} />
      </View>
    </View>
  )
}

// ─── Ingredient row ───────────────────────────────────────────────────────────
function IngredientRow({ item }: { item: MealItem }) {
  // gram_weight stored per-qty; total = gram_weight * quantity
  const totalGrams = item.gram_weight != null && item.quantity != null
    ? item.gram_weight * item.quantity
    : item.gram_weight

  const parts = [
    totalGrams != null && `${Math.round(totalGrams)}g`,
    item.calories != null && `${Math.round(item.calories)} kcal`,
    item.protein != null && `${Math.round(item.protein)}g P`,
    item.carbs != null && `${Math.round(item.carbs)}g C`,
    item.fat != null && `${Math.round(item.fat)}g F`,
  ].filter(Boolean) as string[]

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 5 }}>
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.borderHi, marginTop: 8, flexShrink: 0 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: FONT, fontSize: 13, color: C.textPrime, fontWeight: '500' }} numberOfLines={2}>
          {item.ingredient_name ?? 'Unknown'}
        </Text>
        <Text style={{ fontFamily: FONT, fontSize: 11, color: C.textSub, marginTop: 1 }}>
          {parts.join('  ·  ')}
        </Text>
      </View>
    </View>
  )
}

// ─── Expandable meal card ─────────────────────────────────────────────────────
function MealCard({ meal, accentColor }: { meal: MealWithVitamins; accentColor: string }) {
  const [expanded, setExpanded] = useState(false)
  const [items, setItems] = useState<MealItem[] | null>(null)
  const [loadingItems, setLoadingItems] = useState(false)

  const handleExpand = useCallback(async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    const next = !expanded
    setExpanded(next)
    if (next && items === null) {
      setLoadingItems(true)
      const { data, error } = await supabase
        .from('meal_items')
        .select('*')
        .eq('meal_id', meal.meal_id)
        .order('calories', { ascending: false })
      if (!error && data) setItems(data as MealItem[])
      setLoadingItems(false)
    }
  }, [expanded, items, meal.meal_id])

  return (
    <View style={mc.wrap}>
      <TouchableOpacity onPress={handleExpand} activeOpacity={0.75} style={mc.header}>
        <View style={[mc.accent, { backgroundColor: accentColor }]} />
        <View style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 13, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[mc.type, { fontFamily: FONT }]}>{meal.meal_type ?? 'Meal'}</Text>
            {meal.meal_rating != null && (
              <Text style={{ fontFamily: FONT, fontSize: 10, color: C.amber }}>
                {'★'.repeat(Math.round(meal.meal_rating))}{'☆'.repeat(5 - Math.round(meal.meal_rating))}
              </Text>
            )}
          </View>
          {meal.meal_name ? (
            <Text style={[mc.mealName, { fontFamily: FONT }]} numberOfLines={1}>{meal.meal_name}</Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {meal.total_calories != null && (
              <Text style={{ fontFamily: FONT, fontSize: 11, fontWeight: '600', color: C.orange }}>
                {Math.round(meal.total_calories)} kcal
              </Text>
            )}
            {meal.total_protein != null && (
              <Text style={{ fontFamily: FONT, fontSize: 11, fontWeight: '600', color: C.green }}>
                {Math.round(meal.total_protein)}g P
              </Text>
            )}
            {meal.total_carbs != null && (
              <Text style={{ fontFamily: FONT, fontSize: 11, fontWeight: '600', color: C.purple }}>
                {Math.round(meal.total_carbs)}g C
              </Text>
            )}
            {meal.total_fat != null && (
              <Text style={{ fontFamily: FONT, fontSize: 11, fontWeight: '600', color: C.blue }}>
                {Math.round(meal.total_fat)}g F
              </Text>
            )}
          </View>
        </View>
        <Text style={[mc.chevron, { fontFamily: FONT }, expanded && mc.chevronOpen]}>›</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={mc.body}>
          <View style={mc.divider} />
          {loadingItems ? (
            <ActivityIndicator size="small" color={C.textSub} style={{ marginVertical: 10 }} />
          ) : items && items.length > 0 ? (
            items.map(item => <IngredientRow key={item.item_id} item={item} />)
          ) : (
            <Text style={{ fontFamily: FONT, fontSize: 12, color: C.textSub, paddingVertical: 8 }}>
              No ingredients recorded.
            </Text>
          )}
        </View>
      )}
    </View>
  )
}
const mc = StyleSheet.create({
  wrap: { backgroundColor: C.surfaceHi, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: C.borderHi },
  header: { flexDirection: 'row', alignItems: 'center' },
  accent: { width: 3, alignSelf: 'stretch' },
  type: { fontSize: 13, fontWeight: '700', color: C.textPrime, textTransform: 'capitalize', flex: 1 },
  mealName: { fontSize: 12, color: C.textMid },
  chevron: { fontSize: 22, color: C.textSub, paddingHorizontal: 14, paddingVertical: 14 },
  chevronOpen: { transform: [{ rotate: '90deg' }] },
  body: { paddingHorizontal: 14, paddingBottom: 12 },
  divider: { height: 1, backgroundColor: C.border, marginBottom: 8 },
})

// ─── Empty diet slot ──────────────────────────────────────────────────────────
function EmptySlot({ mealType, color, onLogPress }: { mealType: string; color: string; onLogPress: () => void }) {
  return (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surfaceHi, borderRadius: 14, padding: 13, borderWidth: 1, borderColor: C.border }}
      onPress={onLogPress} activeOpacity={0.7}
    >
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color + '55' }} />
      <Text style={{ fontFamily: FONT, fontSize: 13, fontWeight: '600', color: C.textMid, flex: 1 }}>{mealType}</Text>
      <Text style={{ fontFamily: FONT, fontSize: 11, color: C.textSub }}>not logged</Text>
      <View style={{ borderWidth: 1, borderColor: color + '55', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
        <Text style={{ fontFamily: FONT, fontSize: 11, fontWeight: '600', color: color + 'cc' }}>+ Log</Text>
      </View>
    </TouchableOpacity>
  )
}

// ─── Day group header ─────────────────────────────────────────────────────────
function DayHeader({ label, totalCal }: { label: string; totalCal: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ fontFamily: FONT, fontSize: 12, fontWeight: '700', color: C.textMid, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {label}
      </Text>
      {totalCal > 0 && (
        <Text style={{ fontFamily: FONT, fontSize: 11, color: C.orange, fontWeight: '600' }}>
          {Math.round(totalCal)} kcal
        </Text>
      )}
    </View>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function SH({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <Text style={{ fontFamily: FONT, fontSize: 15, fontWeight: '700', color: C.textPrime }}>{title}</Text>
      {subtitle && <Text style={{ fontFamily: FONT, fontSize: 12, color: C.textSub }}>{subtitle}</Text>}
    </View>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { activeDiet } = useUserDiet()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [meals, setMeals] = useState<MealWithVitamins[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddMeal, setShowAddMeal] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const dietMealTypes: string[] = activeDiet
    ? extractMealTypes((activeDiet as any).meal_structure)
    : ['Breakfast', 'Lunch', 'Dinner', 'Snack']

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)

      const [{ data: prof }, { data: mealData }] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('user_meals').select('*').eq('user_id', user.id).order('meal_date', { ascending: false }),
      ])

      if (prof) setProfile(prof)
      if (mealData) setMeals(mealData as MealWithVitamins[])
      setLoading(false)
    }
    load()
  }, [])

  const refreshMeals = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from('user_meals').select('*').eq('user_id', userId).order('meal_date', { ascending: false })
    if (!error && data) setMeals(data as MealWithVitamins[])
  }, [userId])

  const signOut = async () => { await supabase.auth.signOut(); router.replace('/login') }

  if (loading) {
    return (
      <View style={s.loadWrap}>
        <ActivityIndicator size="large" color={C.orange} />
        <Text style={[s.loadText, { fontFamily: FONT }]}>Loading your dashboard…</Text>
      </View>
    )
  }

  const todayMeals = getTodayMeals(meals)
  const weekMeals = getWeekMeals(meals)
  const weekDayGroups = groupMealsByDay(weekMeals)

  const todayCal = sumField(todayMeals, 'total_calories')
  const todayPro = sumField(todayMeals, 'total_protein')
  const todayCarb = sumField(todayMeals, 'total_carbs')
  const todayFat = sumField(todayMeals, 'total_fat')

  const todayVitC = sumField(todayMeals, 'total_vitamin_c' as any)
  const todayVitD = sumField(todayMeals, 'total_vitamin_d' as any)
  const todayVitA = sumField(todayMeals, 'total_vitamin_a' as any)
  const todayVitE = sumField(todayMeals, 'total_vitamin_e' as any)
  const todayVitK = sumField(todayMeals, 'total_vitamin_k' as any)
  const todayVitB6 = sumField(todayMeals, 'total_vitamin_b6' as any)
  const todayVitB12 = sumField(todayMeals, 'total_vitamin_b12' as any)
  const hasVitamins = todayVitC > 0 || todayVitD > 0 || todayVitA > 0

  const CAL_GOAL = 2000, PRO_GOAL = 150, CARB_GOAL = 250, FAT_GOAL = 65

  const todaySlotMap: Record<string, MealWithVitamins | null> = {}
  for (const type of dietMealTypes) {
    todaySlotMap[type] = todayMeals.find(
      m => (m.meal_type ?? '').toLowerCase() === type.toLowerCase()
    ) ?? null
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <View style={{ paddingTop: insets.top, flex: 1, backgroundColor: C.bg }}>

      {/* Nav */}
      <View style={s.nav}>
        <View style={s.navLogo}>
          <View style={s.navDot} />
          <Text style={[s.navLogoText, { fontFamily: FONT }]}>nourish</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAddMeal(true)} activeOpacity={0.82}>
          <Text style={[s.addPlus, { fontFamily: FONT }]}>+</Text>
          <Text style={[s.addLabel, { fontFamily: FONT }]}>Log Meal</Text>
        </TouchableOpacity>
        <View style={s.navRight}>
          <View style={s.avatar}>
            <Text style={[s.avatarText, { fontFamily: FONT }]}>{profile?.first_name?.[0] ?? '?'}</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={s.signOut}>
            <Text style={[s.signOutText, { fontFamily: FONT }]}>Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Greeting */}
        <View style={{ gap: 6, paddingTop: 8 }}>
          <Text style={[s.greetDate, { fontFamily: FONT }]}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          <Text style={[s.greetTitle, { fontFamily: FONT }]}>
            {greeting},{' '}
            <Text style={{ color: C.orange }}>{profile?.first_name ?? 'there'}</Text> 👋
          </Text>
          {activeDiet && (
            <View style={s.dietBadge}>
              <View style={s.dietBadgeDot} />
              <Text style={[s.dietBadgeText, { fontFamily: FONT }]}>{(activeDiet as any).diet_name}</Text>
            </View>
          )}
        </View>

        {/* ── Today's Nutrition ──────────────────────────────────────────── */}
        <View style={s.panel}>
          <SH
            title="Today's Nutrition"
            subtitle={`${todayMeals.length} meal${todayMeals.length !== 1 ? 's' : ''} logged`}
          />
          <View style={s.divider} />

          <View style={{ alignItems: 'center', paddingVertical: 4 }}>
            <SemiGauge
              value={todayCal} max={CAL_GOAL}
              label="Calories" unit="kcal"
              color={C.orange} size={180}
            />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: 4 }}>
            <SemiGauge value={todayPro} max={PRO_GOAL} label="Protein" unit="g" color={C.green} size={110} />
            <SemiGauge value={todayCarb} max={CARB_GOAL} label="Carbs" unit="g" color={C.purple} size={110} />
            <SemiGauge value={todayFat} max={FAT_GOAL} label="Fat" unit="g" color={C.blue} size={110} />
          </View>
        </View>

        {/* ── Vitamins ────────────────────────────────────────────────────── */}
        {hasVitamins && (
          <View style={s.panel}>
            <SH title="Today's Vitamins" subtitle="vs. recommended daily value" />
            <View style={s.divider} />
            <View style={{ gap: 12 }}>
              {todayVitC > 0 && <VitaminRow label="Vitamin C" value={todayVitC} rdv={RDV.vitC} unit="mg" color={C.orange} />}
              {todayVitD > 0 && <VitaminRow label="Vitamin D" value={todayVitD} rdv={RDV.vitD} unit="μg" color={C.rose} />}
              {todayVitA > 0 && <VitaminRow label="Vitamin A" value={todayVitA} rdv={RDV.vitA} unit="μg" color={C.amber} />}
              {todayVitE > 0 && <VitaminRow label="Vitamin E" value={todayVitE} rdv={RDV.vitE} unit="mg" color={C.teal} />}
              {todayVitK > 0 && <VitaminRow label="Vitamin K" value={todayVitK} rdv={RDV.vitK} unit="μg" color={C.green} />}
              {todayVitB6 > 0 && <VitaminRow label="Vitamin B6" value={todayVitB6} rdv={RDV.vitB6} unit="mg" color={C.purple} />}
              {todayVitB12 > 0 && <VitaminRow label="Vitamin B12" value={todayVitB12} rdv={RDV.vitB12} unit="μg" color={C.blue} />}
            </View>
          </View>
        )}

        {/* ── Today's Diet Slots ───────────────────────────────────────────── */}
        <View style={s.panel}>
          <SH
            title="Today's Meals"
            subtitle={activeDiet ? (activeDiet as any).diet_name : 'no diet set'}
          />
          <View style={s.divider} />
          <View style={{ gap: 8 }}>
            {dietMealTypes.map((type, i) => {
              const color = getMealTypeColor(type, i)
              const meal = todaySlotMap[type]
              return meal
                ? <MealCard key={type} meal={meal} accentColor={color} />
                : <EmptySlot key={type} mealType={type} color={color} onLogPress={() => setShowAddMeal(true)} />
            })}
          </View>
          {!activeDiet && (
            <Text style={{ fontFamily: FONT, fontSize: 12, color: C.textSub, textAlign: 'center' }}>
              Set a diet to customise your meal types.
            </Text>
          )}
        </View>

        {/* ── Recent Meals ─────────────────────────────────────────────────── */}
        <View style={s.panel}>
          <SH title="Recent Meals" subtitle="last 7 days" />
          <View style={s.divider} />
          {weekDayGroups.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 28, gap: 6 }}>
              <Text style={{ fontSize: 32 }}>🍽️</Text>
              <Text style={{ fontFamily: FONT, fontSize: 15, fontWeight: '600', color: C.textMid }}>No meals this week.</Text>
              <Text style={{ fontFamily: FONT, fontSize: 13, color: C.textSub }}>Tap + Log Meal to get started.</Text>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {weekDayGroups.map(group => (
                <View key={group.dateKey} style={{ gap: 6 }}>
                  <DayHeader
                    label={group.label}
                    totalCal={group.meals.reduce((s, m) => s + (m.total_calories ?? 0), 0)}
                  />
                  {group.meals.map(meal => (
                    <MealCard
                      key={meal.meal_id}
                      meal={meal}
                      accentColor={getMealTypeColor(meal.meal_type ?? '', 0)}
                    />
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>

      <AddMealModal visible={showAddMeal} onClose={() => setShowAddMeal(false)} onSuccess={refreshMeals} />
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  loadWrap: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadText: { color: C.textSub, fontSize: 14 },

  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 14,
    backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  navLogo: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  navDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.orange },
  navLogoText: { fontSize: 18, fontWeight: '700', color: C.textPrime, letterSpacing: -0.5 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.orange,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 9,
    shadowColor: C.orange, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  addPlus: { color: '#fff', fontSize: 20, fontWeight: '300', lineHeight: 22, marginTop: -1 },
  addLabel: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  navRight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.surfaceHi, borderWidth: 1, borderColor: C.borderHi, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700', color: C.textMid },
  signOut: { borderWidth: 1, borderColor: C.border, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 6 },
  signOutText: { color: C.textSub, fontSize: 12, fontWeight: '500' },

  scroll: { flex: 1, backgroundColor: C.bg },
  scrollContent: { padding: 20, paddingBottom: 60, gap: 20 },

  greetDate: { fontSize: 12, color: C.textSub, textTransform: 'uppercase', letterSpacing: 1.2 },
  greetTitle: { fontSize: 26, fontWeight: '700', color: C.textPrime, lineHeight: 34 },

  dietBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderHi,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, marginTop: 4,
  },
  dietBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  dietBadgeText: { fontSize: 12, color: C.textMid, fontWeight: '500' },

  panel: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 22, padding: 18, gap: 14 },
  divider: { height: 1, backgroundColor: C.border, marginHorizontal: -18 },
})