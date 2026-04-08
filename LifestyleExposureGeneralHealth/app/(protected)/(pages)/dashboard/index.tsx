import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { UserProfile, Meal, Metric } from '@/types/types';
import { LineChart, BarChart } from 'react-native-chart-kit';
import AddMealModal from '../../(modals)/addmealmodal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserDiet } from '@/hooks/useUserDiet';
import { AVAILABLE_MEAL_TYPES, TemplateMeal } from '@/types/diets-meals';
import { Image } from 'expo-image';
import { useUser } from '@/context/user-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CHART_WIDTH = SCREEN_WIDTH - 80

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ─── Data helpers ─────────────────────────────────────────────────────────────

function groupMealsByMonth(meals: Meal[]) {
  const map: Record<string, number> = {}
  meals.forEach(m => {
    const key = MONTHS[new Date(m.meal_date).getMonth()]
    map[key] = (map[key] ?? 0) + (m.total_calories ?? 0)
  })
  return MONTHS.map(month => ({ month, calories: Math.round(map[month] ?? 0) }))
}

function groupMetricsByMonth(metrics: Metric[], field: keyof Metric) {
  const map: Record<string, number[]> = {}
  metrics.forEach(m => {
    const key = MONTHS[new Date(m.observation_date).getMonth()]
    if (!map[key]) map[key] = []
    const val = m[field]
    if (typeof val === 'number') map[key].push(val)
  })
  return MONTHS.map(month => ({
    month,
    value: map[month]?.length
      ? Math.round((map[month].reduce((a, b) => a + b, 0) / map[month].length) * 10) / 10
      : 0,
  }))
}

function getLatestMetric(metrics: Metric[], field: keyof Metric): string {
  if (!metrics.length) return '—'
  const sorted = [...metrics].sort(
    (a, b) => new Date(b.observation_date).getTime() - new Date(a.observation_date).getTime()
  )
  const val = sorted[0][field]
  return val != null ? String(val) : '—'
}

function getTotalCaloriesToday(meals: Meal[]): number {
  const today = new Date().toDateString()
  return meals
    .filter(m => new Date(m.meal_date).toDateString() === today)
    .reduce((sum, m) => sum + (m.total_calories ?? 0), 0)
}


// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, unit, color, icon,
}: {
  label: string; value: string; unit?: string; color: string; icon: string
}) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <View style={styles.statCardTop}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        {unit && <Text style={styles.statUnit}>{unit}</Text>}
      </View>
    </View>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  )
}

// ─── Meal Row ─────────────────────────────────────────────────────────────────

const MEAL_COLORS: Record<string, string> = {
  breakfast: '#fbbf24',  // amber
  lunch: '#34d399',  // green
  dinner: '#60a5fa',  // blue
  snack: '#f97316',  // orange}
};

function MealRow({ meal, dark }: { meal: Meal, dark: boolean }) {
  const type = (meal.meal_type ?? 'meal').toLowerCase()
  const accent = MEAL_COLORS[type] ?? '#888888';
  return (
    <View style={[
      styles.mealRow,
      { backgroundColor: dark ? '#252536' : '#F8F8FA', borderColor: dark ? '#3D3D4D' : '#EBEBEB' },
    ]}>
      <View style={[styles.mealDot, { backgroundColor: accent }]} />
      <View style={styles.mealInfo}>
        <Text style={styles.mealType}>{meal.meal_type ?? 'Meal'}</Text>
        <Text style={styles.mealDate}>
          {new Date(meal.meal_date).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          })}
        </Text>
      </View>
      <View style={styles.mealRight}>
        {meal.meal_rating != null && (
          <Text style={styles.mealRating}>
            {'★'.repeat(meal.meal_rating)}{'☆'.repeat(5 - meal.meal_rating)}
          </Text>
        )}
        <View style={[styles.calorieBadge, { backgroundColor: accent + '18', borderColor: accent + '44' }]}>
          <Text style={[styles.calorieBadgeText, { color: accent }]}>
            {meal.total_calories ? `${meal.total_calories} kcal` : '—'}
          </Text>
        </View>
      </View>
    </View>
  )
}

// ─── Tab Button ───────────────────────────────────────────────────────────────

function TabButton({
  label, active, color, onPress,
}: {
  label: string; active: boolean; color: string; onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tab, active && { backgroundColor: color + '18', borderColor: color + '55' }]}
      activeOpacity={0.7}
    >
      <Text style={[styles.tabText, active && { color }]}>{label}</Text>
    </TouchableOpacity>
  )
}

// ---- Diet UI -----------------------------------------------------------
function DietMealCard({ meal, isDark }: { meal: TemplateMeal; isDark: boolean }) {
  return (
    <View style={[
      dmStyles.card,
      { backgroundColor: isDark ? '#252536' : '#ffffff' },
    ]}>
      <View style={{ width: 180, height: 110, backgroundColor: isDark ? '#2D2D3D' : '#F0EBF8' }}>
        <Image
          source={meal.meal_image ? { uri: meal.meal_image } : require('@/assets/images/generic-meal-image.jpg')}
          style={dmStyles.image}
          contentFit="cover"
          transition={200}
        />
      </View>
      <View style={dmStyles.content}>
        <Text style={[dmStyles.mealName, { color: isDark ? '#f2f2f2' : '#111' }]} numberOfLines={1}>
          {meal.name}
        </Text>
        <View style={dmStyles.macrosRow}>
          <Text style={[dmStyles.macroText, { color: '#f97316' }]}>{meal.totalCalories} kcal</Text>
          <Text style={[dmStyles.macroText, { color: '#34d399' }]}>P:{meal.totalProtein}g</Text>
          <Text style={[dmStyles.macroText, { color: '#a78bfa' }]}>C:{meal.totalCarbs}g</Text>
          <Text style={[dmStyles.macroText, { color: '#60a5fa' }]}>F:{meal.totalFat}g</Text>
        </View>
        {meal.rating != null && (
          <Text style={dmStyles.rating}>
            {'★'.repeat(Math.floor(meal.rating))}{'☆'.repeat(5 - Math.floor(meal.rating))}
          </Text>
        )}
      </View>
    </View>
  );
}

function DietMealSection({
  label, icon, meals, isDark,
}: {
  label: string; icon: string; meals: TemplateMeal[]; isDark: boolean;
}) {
  return (
    <View style={[dmStyles.sectionCard, { backgroundColor: isDark ? '#0D0D1A' : '#F0EBF8' }]}>
      <View style={dmStyles.sectionHeader}>
        <Ionicons name={icon as any} size={18} color="#8B5CF6" />
        <Text style={[dmStyles.sectionLabel, { color: isDark ? '#f2f2f2' : '#111' }]}>{label}</Text>
        {meals.length > 0 && (
          <Text style={dmStyles.calTotal}>
            {meals.reduce((s, m) => s + m.totalCalories, 0)} kcal
          </Text>
        )}
      </View>
      {meals.length === 0 ? (
        <View style={[dmStyles.emptySlot, { borderColor: isDark ? '#2D2D3D' : '#E0E0E0' }]}>
          <Text style={{ color: isDark ? '#555' : '#BBB', fontSize: 13 }}>No meal planned</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12 }}
          style={{ minHeight: 180 }}
        >
          {meals.map((meal) => (
            <DietMealCard key={meal.id} meal={meal} isDark={isDark} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { activeDiet } = useUserDiet();
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'calories' | 'weight' | 'protein' | 'macros'>('calories')
  const [showAddMeal, setShowAddMeal] = useState(false)
  const [userId, setUserId] = useState<string | null>(null);
  const [meals, setMeals] = useState<any[]>([]);

  // Colors
  const colorScheme = useColorScheme();
  const dark = colorScheme !== 'light';

  const C = {
    bg: dark ? '#0D0D1A' : '#F5F5FA',
    surface: dark ? '#1A1A2E' : '#FFFFFF',
    surfaceHi: dark ? '#252536' : '#F0EBF8',
    border: dark ? '#2D2D3D' : '#EBEBEB',
    borderHi: dark ? '#3D3D4D' : '#D0D0D0',
    textPrime: dark ? '#FFFFFF' : '#111111',
    textSub: dark ? '#6B6B8A' : '#888888',
    textMid: dark ? '#9999BB' : '#666666',
    orange: '#f97316',
    blue: '#60a5fa',
    green: '#34d399',
    purple: '#8B5CF6',   // ← journal accent
    rose: '#fb7185',
    amber: '#fbbf24',
  };

  // Diets update
  const mealSections = React.useMemo(() => {
    if (!activeDiet?.diet_meals) return [];
    const byType: Record<string, TemplateMeal[]> = {};
    activeDiet.diet_meals.forEach((row) => {
      const m = row.user_meals;
      if (!m) return;
      const meal: TemplateMeal = {
        id: row.id,
        meal_id: m.meal_id,
        name: m.meal_name || m.meal_type,
        meal_image: m.meal_image ?? null,
        ingredients: [],
        totalCalories: m.total_calories ?? 0,
        totalProtein: m.total_protein ?? 0,
        totalCarbs: m.total_carbs ?? 0,
        totalFat: m.total_fat ?? 0,
        rating: m.meal_rating ?? null,
      };
      if (!byType[row.meal_type]) byType[row.meal_type] = [];
      byType[row.meal_type].push(meal);
    });
    return AVAILABLE_MEAL_TYPES
      .filter((mt) => activeDiet.meal_structure.includes(mt.key))
      .map((mt) => ({ ...mt, meals: byType[mt.key] || [] }));
  }, [activeDiet]);

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user) {
        setUserId(data.user.id);
      }
    };

    getUser();
  }, []);

  // ─── Chart config ─────────────────────────────────────────────────────────────

  const baseChartConfig = {
    backgroundGradientFrom: C.surfaceHi,
    backgroundGradientTo: C.surfaceHi,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(242, 242, 242, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(90, 90, 90, ${opacity})`,
    propsForBackgroundLines: { stroke: '#1f1f1f' },
    propsForDots: { r: '3', strokeWidth: '0' },
  }

  const refreshMeals = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('user_meals')
      .select('*')
      .eq('user_id', userId)
      .order('meal_date', { ascending: true });

    if (!error && data) {
      setMeals(data);
    }
  };

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const [{ data: prof }, { data: mealData }, { data: metricData }] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('user_meals').select('*').eq('user_id', user.id).order('meal_date', { ascending: true }),
        supabase.from('user_metrics').select('*').eq('user_id', user.id).order('observation_date', { ascending: true }),
      ])

      if (prof) setProfile(prof)
      if (mealData) setMeals(mealData)
      if (metricData) setMetrics(metricData)
      setLoading(false)
    }
    load()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.orange} />
        <Text style={styles.loadingText}>Loading your dashboard…</Text>
      </View>
    )
  }

  // ── Chart data
  const calorieData = groupMealsByMonth(meals)
  const weightData = groupMetricsByMonth(metrics, 'weight')
  const proteinData = groupMetricsByMonth(metrics, 'protein')

  const toChartData = (
    data: { month: string; calories?: number; value?: number }[],
    key: 'calories' | 'value',
  ) => ({
    labels: data.map(d => d.month),
    datasets: [{ data: data.map(d => (d as any)[key] ?? 0) }],
  })

  const macrosData = {
    labels: MONTHS,
    datasets: [
      {
        data: MONTHS.map(month => {
          const mm = metrics.filter(m => MONTHS[new Date(m.observation_date).getMonth()] === month)
          const v = mm.map(m => m.protein).filter(Boolean) as number[]
          return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0
        }),
        color: () => C.green, strokeWidth: 2,
      },
      {
        data: MONTHS.map(month => {
          const mm = metrics.filter(m => MONTHS[new Date(m.observation_date).getMonth()] === month)
          const v = mm.map(m => m.carbs).filter(Boolean) as number[]
          return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0
        }),
        color: () => C.purple, strokeWidth: 2,
      },
      {
        data: MONTHS.map(month => {
          const mm = metrics.filter(m => MONTHS[new Date(m.observation_date).getMonth()] === month)
          const v = mm.map(m => m.sugar).filter(Boolean) as number[]
          return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0
        }),
        color: () => C.rose, strokeWidth: 2,
      },
    ],
    legend: ['Protein', 'Carbs', 'Sugar'],
  }

  const tabs = [
    { key: 'calories' as const, label: 'Calories', color: C.orange },
    { key: 'weight' as const, label: 'Weight', color: C.blue },
    { key: 'protein' as const, label: 'Protein', color: C.green },
    { key: 'macros' as const, label: 'Macros', color: C.purple },
  ]

  const recentMeals = [...meals]
    .sort((a, b) => new Date(b.meal_date).getTime() - new Date(a.meal_date).getTime())
    .slice(0, 5)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <View style={{ paddingTop: insets.top, flex: 1, backgroundColor: C.bg, }}>

      {/* ── Nav Bar ─────────────────────────────────────────────────────── */}
      <View style={styles.nav}>
        <View style={styles.navLogoWrap}>
          <View style={styles.navLogoDot} />
          <Text style={styles.navLogo}>nourish</Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowAddMeal(true)}
          activeOpacity={0.82}
        >
          <Text style={styles.addBtnPlus}>+</Text>
          <Text style={styles.addBtnLabel}>Log Meal</Text>
        </TouchableOpacity>

        <View style={styles.navRight}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile?.first_name?.[0] ?? '?'}</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scrollable content ──────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Greeting */}
        <View style={styles.greetingBlock}>
          <Text style={styles.greetingSub}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          <Text style={styles.greetingTitle}>
            {greeting},{' '}
            <Text style={styles.greetingName}>
              {profile?.first_name ?? profile?.username ?? 'there'}
            </Text>{' '}
            👋
          </Text>
        </View>

        {/* ── Active Diet Panel ──────────────────────────────────────────── */}
        <View style={styles.panel}>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 11, color: C.textSub, textTransform: 'uppercase', letterSpacing: 1 }}>
              Active Diet
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: C.textPrime }}>
                {activeDiet?.diet_name ?? 'No diet selected'}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(protected)/(pages)/journal/diets')}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  backgroundColor: C.surfaceHi, borderRadius: 10,
                  paddingHorizontal: 10, paddingVertical: 6,
                  borderWidth: 1, borderColor: C.borderHi,
                }}
              >
                <Ionicons name="swap-horizontal" size={14} color={C.orange} />
                <Text style={{ fontSize: 11, color: C.orange, fontWeight: '600' }}>Switch</Text>
              </TouchableOpacity>
            </View>
          </View>

          {!activeDiet ? (
            <TouchableOpacity
              onPress={() => router.push('/(protected)/(pages)/journal/diets')}
              style={{
                paddingVertical: 20, alignItems: 'center', gap: 6,
                borderWidth: 1, borderStyle: 'dashed', borderColor: C.border, borderRadius: 12,
              }}
            >
              <Text style={{ fontSize: 13, color: C.textSub }}>Tap to select or create a diet plan</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ gap: 20 }}>
              <View style={[styles.panelDivider]} />
              {mealSections.map((section) => (
                <DietMealSection
                  key={section.key}
                  label={section.label}
                  icon={section.icon}
                  meals={section.meals}
                  isDark={dark}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Stat Cards ─────────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsScroll}
          contentContainerStyle={styles.statsScrollContent}
        >
          <StatCard label="Today's Calories" value={String(getTotalCaloriesToday(meals))} unit="kcal" color={C.orange} icon="🔥" />
          <StatCard label="Current Weight" value={getLatestMetric(metrics, 'weight')} unit="lbs" color={C.blue} icon="⚖️" />
          <StatCard label="Latest Protein" value={getLatestMetric(metrics, 'protein')} unit="g" color={C.green} icon="💪" />
          <StatCard label="Latest Carbs" value={getLatestMetric(metrics, 'carbs')} unit="g" color={C.purple} icon="🌾" />
          <StatCard label="Total Meals" value={String(meals.length)} color={C.rose} icon="🍽️" />
        </ScrollView>

        {/* ── Chart Panel ────────────────────────────────────────────────── */}
        <View style={styles.panel}>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabRow}
          >
            {tabs.map(t => (
              <TabButton
                key={t.key}
                label={t.label}
                active={activeTab === t.key}
                color={t.color}
                onPress={() => setActiveTab(t.key)}
              />
            ))}
          </ScrollView>

          <View style={styles.panelDivider} />

          <Text style={styles.chartSubtitle}>
            {activeTab === 'calories' && 'Total calories from meals — monthly overview'}
            {activeTab === 'weight' && 'Average body weight per month'}
            {activeTab === 'protein' && 'Average daily protein intake per month'}
            {activeTab === 'macros' && 'Protein · Carbs · Sugar — monthly averages'}
          </Text>

          {activeTab === 'calories' && (
            <LineChart
              data={toChartData(calorieData, 'calories')}
              width={CHART_WIDTH}
              height={200}
              chartConfig={{
                ...baseChartConfig,
                color: (o = 1) => `rgba(249,115,22,${o})`,
                fillShadowGradientFrom: C.orange,
                fillShadowGradientTo: C.surfaceHi,
                fillShadowGradientFromOpacity: 0.28,
                fillShadowGradientToOpacity: 0,
              }}
              bezier
              style={styles.chart}
            />
          )}

          {activeTab === 'weight' && (
            <LineChart
              data={toChartData(weightData, 'value')}
              width={CHART_WIDTH}
              height={200}
              chartConfig={{
                ...baseChartConfig,
                color: (o = 1) => `rgba(96,165,250,${o})`,
                fillShadowGradientFrom: C.blue,
                fillShadowGradientTo: C.surfaceHi,
                fillShadowGradientFromOpacity: 0.28,
                fillShadowGradientToOpacity: 0,
              }}
              bezier
              style={styles.chart}
            />
          )}

          {activeTab === 'protein' && (
            <BarChart
              data={toChartData(proteinData, 'value')}
              width={CHART_WIDTH}
              height={200}
              yAxisLabel=""
              yAxisSuffix="g"
              chartConfig={{
                ...baseChartConfig,
                color: (o = 1) => `rgba(52,211,153,${o})`,
              }}
              style={styles.chart}
            />
          )}

          {activeTab === 'macros' && (
            <>
              <LineChart
                data={macrosData}
                width={CHART_WIDTH}
                height={200}
                chartConfig={baseChartConfig}
                bezier
                withDots={false}
                style={styles.chart}
              />
              <View style={styles.legendRow}>
                {([
                  [C.green, 'Protein'],
                  [C.purple, 'Carbs'],
                  [C.rose, 'Sugar'],
                ] as [string, string][]).map(([color, label]) => (
                  <View key={label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: color }]} />
                    <Text style={styles.legendText}>{label}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* ── Recent Meals ───────────────────────────────────────────────── */}
        <View style={styles.panel}>
          <SectionHeader
            title="Recent Meals"
            subtitle={`${recentMeals.length} of ${meals.length} logged`}
          />
          <View style={styles.panelDivider} />
          {recentMeals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🍽️</Text>
              <Text style={styles.emptyStateText}>No meals logged yet.</Text>
              <Text style={styles.emptyStateHint}>Tap + Log Meal to get started.</Text>
            </View>
          ) : (
            <View style={styles.mealList}>
              {recentMeals.map(meal => (
                <MealRow key={meal.meal_id} meal={meal} dark={dark} />
              ))}
            </View>
          )}
        </View>

      </ScrollView>

      {/* ── Modal ───────────────────────────────────────────────────────── */}
      <AddMealModal
        visible={showAddMeal}
        onClose={() => setShowAddMeal(false)}
        onSuccess={() => {
          refreshMeals();
        }}
      />

    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0D0D1A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingText: {
    color: '#6B6B8A',
    fontSize: 14,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 14,
    backgroundColor: '#0D0D1A',
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D3D',
  },
  navLogoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  navLogoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f97316',
  },
  navLogo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f97316',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  addBtnPlus: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '300',
    lineHeight: 22,
    marginTop: -1,
  },
  addBtnLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  navRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#252536',
    borderWidth: 1,
    borderColor: '#3D3D4D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9999BB',
  },
  signOutBtn: {
    borderWidth: 1,
    borderColor: '#2D2D3D',
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  signOutText: {
    color: '#6B6B8A',
    fontSize: 12,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#0D0D1A',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
    gap: 24,
  },
  greetingBlock: {
    gap: 4,
    paddingTop: 8,
  },
  greetingSub: {
    fontSize: 12,
    color: '#6B6B8A',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  greetingTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 34,
  },
  greetingName: {
    color: '#f97316',
  },
  statsScroll: {
    marginHorizontal: -20,
  },
  statsScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#2D2D3D',
    borderTopWidth: 2,
    borderRadius: 18,
    padding: 18,
    minWidth: 138,
    gap: 10,
  },
  statCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    fontSize: 14,
  },
  statLabel: {
    fontSize: 10,
    color: '#6B6B8A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flex: 1,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
  statUnit: {
    fontSize: 12,
    color: '#6B6B8A',
    marginBottom: 3,
  },
  panel: {
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#2D2D3D',
    borderRadius: 22,
    padding: 18,
    gap: 14,
  },
  panelDivider: {
    height: 1,
    backgroundColor: '#2D2D3D',
    marginHorizontal: -18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B6B8A',
  },
  tabRow: {
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#252536',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6B8A',
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#6B6B8A',
    marginBottom: 4,
  },
  chart: {
    borderRadius: 12,
    marginLeft: -10,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#9999BB',
  },
  mealList: {
    gap: 8,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#252536',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: '#3D3D4D',
  },
  mealDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  mealInfo: {
    flex: 1,
    gap: 2,
  },
  mealType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  mealDate: {
    fontSize: 11,
    color: '#6B6B8A',
  },
  mealRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealRating: {
    fontSize: 11,
    color: '#fbbf24',
  },
  calorieBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  calorieBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6,
  },
  emptyStateIcon: {
    fontSize: 32,
  },
  emptyStateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9999BB',
  },
  emptyStateHint: {
    fontSize: 13,
    color: '#6B6B8A',
  },
});

// Diet UI Styling
const dmStyles = StyleSheet.create({
  sectionCard: {
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
  calTotal: { fontSize: 12, color: '#f97316', fontWeight: '500' },
  emptySlot: {
    height: 60, borderWidth: 1, borderStyle: 'dashed',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  card: {
    width: 180,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  image: { width: '100%', height: 110 },
  content: { padding: 10, gap: 4 },
  mealName: { fontSize: 13, fontWeight: '600' },
  macrosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  macroText: { fontSize: 10, fontWeight: '500' },
  rating: { fontSize: 11, color: '#fbbf24', marginTop: 2 },
});
