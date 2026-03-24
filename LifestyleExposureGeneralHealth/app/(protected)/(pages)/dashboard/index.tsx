import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'expo-router'
import { UserProfile, Meal, Metric } from '@/types/types'
import { LineChart, BarChart } from 'react-native-chart-kit'
import AddMealModal from '../../(modals)/addmealmodal'

const SCREEN_WIDTH = Dimensions.get('window').width
const CHART_WIDTH = SCREEN_WIDTH - 80 // accounts for padding

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ─── Data helpers (unchanged from web version) ────────────────────────────────

function groupMealsByMonth(meals: Meal[]) {
  const map: Record<string, number> = {}
  meals.forEach(m => {
    const d = new Date(m.meal_date)
    const key = MONTHS[d.getMonth()]
    map[key] = (map[key] ?? 0) + (m.total_calories ?? 0)
  })
  return MONTHS.map(month => ({ month, calories: Math.round(map[month] ?? 0) }))
}

function groupMetricsByMonth(metrics: Metric[], field: keyof Metric) {
  const map: Record<string, number[]> = {}
  metrics.forEach(m => {
    const d = new Date(m.observation_date)
    const key = MONTHS[d.getMonth()]
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

// ─── Chart config ─────────────────────────────────────────────────────────────

const baseChartConfig = {
  backgroundGradientFrom: '#1e1e1e',
  backgroundGradientTo: '#1e1e1e',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(240, 240, 240, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(85, 85, 85, ${opacity})`,
  propsForBackgroundLines: { stroke: '#222' },
  propsForDots: { r: '3' },
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, unit, color }: {
  label: string; value: string; unit?: string; color: string
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        {unit && <Text style={styles.statUnit}>{unit}</Text>}
      </View>
    </View>
  )
}

// ─── Chart Card ───────────────────────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      {children}
    </View>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [meals, setMeals] = useState<Meal[]>([])
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'calories' | 'weight' | 'protein' | 'macros'>('calories')
  const [showAddMeal, setShowAddMeal] = useState(false)

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
        <ActivityIndicator size="large" color="#e0e0e0" />
      </View>
    )
  }

  const calorieData = groupMealsByMonth(meals)
  const weightData = groupMetricsByMonth(metrics, 'weight')
  const proteinData = groupMetricsByMonth(metrics, 'protein')

  // react-native-chart-kit expects { labels, datasets } shape
  const toChartData = (data: { month: string; calories?: number; value?: number }[], key: 'calories' | 'value') => ({
    labels: data.map(d => d.month),
    datasets: [{ data: data.map(d => (d as any)[key] ?? 0) }],
  })

  const macrosData = {
    labels: MONTHS,
    datasets: [
      {
        data: MONTHS.map(month => {
          const monthMetrics = metrics.filter(m => MONTHS[new Date(m.observation_date).getMonth()] === month)
          const vals = monthMetrics.map(m => m.protein).filter(Boolean) as number[]
          return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
        }),
        color: () => '#34d399',
        strokeWidth: 2,
      },
      {
        data: MONTHS.map(month => {
          const monthMetrics = metrics.filter(m => MONTHS[new Date(m.observation_date).getMonth()] === month)
          const vals = monthMetrics.map(m => m.carbs).filter(Boolean) as number[]
          return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
        }),
        color: () => '#a78bfa',
        strokeWidth: 2,
      },
      {
        data: MONTHS.map(month => {
          const monthMetrics = metrics.filter(m => MONTHS[new Date(m.observation_date).getMonth()] === month)
          const vals = monthMetrics.map(m => m.sugar).filter(Boolean) as number[]
          return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
        }),
        color: () => '#fb7185',
        strokeWidth: 2,
      },
    ],
    legend: ['Protein', 'Carbs', 'Sugar'],
  }

  const tabs = [
    { key: 'calories' as const, label: 'Calories' },
    { key: 'weight' as const, label: 'Weight' },
    { key: 'protein' as const, label: 'Protein' },
    { key: 'macros' as const, label: 'Macros' },
  ]

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

      {/* Top Nav */}
      <View style={styles.nav}>
        <Text style={styles.navLogo}>Nourish</Text>

        {/* Center: big + button */}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowAddMeal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>

        <View style={styles.navRight}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile?.first_name?.[0] ?? '?'}</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Main */}
      <View style={styles.main}>

        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingTitle}>
            Hi, {profile?.first_name ?? profile?.username ?? 'there'} 👋
          </Text>
          <Text style={styles.greetingDate}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        {/* Stat Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
          <StatCard label="Today's Calories" value={String(getTotalCaloriesToday(meals))} unit="kcal" color="#f97316" />
          <StatCard label="Current Weight" value={getLatestMetric(metrics, 'weight')} unit="lbs" color="#60a5fa" />
          <StatCard label="Latest Protein" value={getLatestMetric(metrics, 'protein')} unit="g" color="#34d399" />
          <StatCard label="Latest Carbs" value={getLatestMetric(metrics, 'carbs')} unit="g" color="#a78bfa" />
          <StatCard label="Total Meals" value={String(meals.length)} color="#fb7185" />
        </ScrollView>

        {/* Chart Section */}
        <View style={styles.chartSection}>

          {/* Tab Bar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
            {tabs.map(tab => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
            <AddMealModal
              visible={showAddMeal}
              onClose={() => setShowAddMeal(false)}
              onSubmit={({ meal_type, ingredients }) => {
                // TODO: write to Supabase in the next step
                console.log('Meal to log:', meal_type, ingredients)
                setShowAddMeal(false)
              }}
            />
          </ScrollView>

          {/* Calories Chart */}
          {activeTab === 'calories' && (
            <View>
              <Text style={styles.chartSubtitle}>Total calories from meals — monthly overview</Text>
              <LineChart
                data={toChartData(calorieData, 'calories')}
                width={CHART_WIDTH}
                height={220}
                chartConfig={{
                  ...baseChartConfig,
                  color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`,
                  fillShadowGradientFrom: '#f97316',
                  fillShadowGradientTo: '#141414',
                  fillShadowGradientFromOpacity: 0.3,
                  fillShadowGradientToOpacity: 0,
                }}
                bezier
                style={styles.chart}
              />
            </View>
          )}

          {/* Weight Chart */}
          {activeTab === 'weight' && (
            <View>
              <Text style={styles.chartSubtitle}>Average weight per month</Text>
              <LineChart
                data={toChartData(weightData, 'value')}
                width={CHART_WIDTH}
                height={220}
                chartConfig={{
                  ...baseChartConfig,
                  color: (opacity = 1) => `rgba(96, 165, 250, ${opacity})`,
                  fillShadowGradientFrom: '#60a5fa',
                  fillShadowGradientTo: '#141414',
                  fillShadowGradientFromOpacity: 0.3,
                  fillShadowGradientToOpacity: 0,
                }}
                bezier
                style={styles.chart}
              />
            </View>
          )}

          {/* Protein Chart */}
          {activeTab === 'protein' && (
            <View>
              <Text style={styles.chartSubtitle}>Average daily protein intake per month</Text>
              <BarChart
                data={toChartData(proteinData, 'value')}
                width={CHART_WIDTH}
                height={220}
                yAxisLabel=""
                yAxisSuffix="g"
                chartConfig={{ ...baseChartConfig, color: (opacity = 1) => `rgba(52, 211, 153, ${opacity})` }}
                style={styles.chart}
              />
            </View>
          )}

          {/* Macros Chart */}
          {activeTab === 'macros' && (
            <View>
              <Text style={styles.chartSubtitle}>Protein vs Carbs vs Sugar — monthly averages</Text>
              <LineChart
                data={macrosData}
                width={CHART_WIDTH}
                height={220}
                chartConfig={baseChartConfig}
                bezier
                style={styles.chart}
                withDots={false}
              />
              {/* Legend */}
              <View style={styles.legend}>
                {[['#34d399', 'Protein'], ['#a78bfa', 'Carbs'], ['#fb7185', 'Sugar']].map(([color, label]) => (
                  <View key={label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: color }]} />
                    <Text style={styles.legendText}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Recent Meals */}
        <ChartCard title="RECENT MEALS">
          {meals.length === 0 ? (
            <Text style={styles.emptyText}>No meals logged yet.</Text>
          ) : (
            [...meals]
              .sort((a, b) => new Date(b.meal_date).getTime() - new Date(a.meal_date).getTime())
              .slice(0, 5)
              .map(meal => (
                <View key={meal.meal_id} style={styles.mealRow}>
                  <View>
                    <Text style={styles.mealType}>{meal.meal_type ?? 'Meal'}</Text>
                    <Text style={styles.mealDate}>
                      {new Date(meal.meal_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                  <View style={styles.mealRight}>
                    {meal.meal_rating != null && (
                      <Text style={styles.mealRating}>
                        {'★'.repeat(meal.meal_rating)}{'☆'.repeat(5 - meal.meal_rating)}
                      </Text>
                    )}
                    <View style={styles.calorieBadge}>
                      <Text style={styles.calorieBadgeText}>
                        {meal.total_calories ? `${meal.total_calories} kcal` : '—'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
          )}
        </ChartCard>

      </View>
    </ScrollView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414',
  },
  contentContainer: {
    paddingBottom: 60,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Nav
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#141414',
  },
  navLogo: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f0f0f0',
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#bbb',
  },
  signOutBtn: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  signOutText: {
    color: '#888',
    fontSize: 13,
  },

  // Main
  main: {
    padding: 24,
    gap: 28,
  },

  // Greeting
  greeting: {
    gap: 4,
  },
  greetingTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f0f0f0',
  },
  greetingDate: {
    fontSize: 14,
    color: '#555',
  },

  // Stat cards
  statsScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  statCard: {
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 20,
    padding: 20,
    marginRight: 12,
    minWidth: 140,
    gap: 6,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
  },
  statUnit: {
    fontSize: 13,
    color: '#555',
    marginBottom: 3,
  },

  // Chart section
  chartSection: {
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 24,
    padding: 20,
    gap: 20,
  },
  tabBar: {
    flexDirection: 'row',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: '#f0f0f0',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#777',
  },
  tabTextActive: {
    color: '#141414',
  },
  chartSubtitle: {
    fontSize: 13,
    color: '#555',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 12,
    marginLeft: -12,
  },

  // Macros legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },

  // Chart card
  chartCard: {
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#aaa',
    letterSpacing: 1,
  },
  emptyText: {
    color: '#444',
    fontSize: 14,
  },

  // Meal rows
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#242424',
    borderRadius: 14,
    padding: 14,
  },
  mealType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e0e0e0',
    textTransform: 'capitalize',
  },
  mealDate: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  mealRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealRating: {
    fontSize: 12,
    color: '#f59e0b',
  },
  calorieBadge: {
    backgroundColor: '#2a1a0a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  calorieBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f97316',
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 34,
    marginTop: -2,
  },
})