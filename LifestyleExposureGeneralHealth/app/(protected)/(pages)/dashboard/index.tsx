import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'expo-router'
import { UserProfile, Meal, Metric } from '@/types/types';
import {
  LineChart,
  BarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import ParallaxScrollView from '@/components/parallax-scroll-view';


const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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
      ? Math.round(map[month].reduce((a, b) => a + b, 0) / map[month].length * 10) / 10
      : null,
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

const CustomTooltip = ({ active, payload, label, unit }: any) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: '#1e1e1e',
        border: '1px solid #333',
        borderRadius: '10px',
        padding: '10px 14px',
        fontSize: '13px',
        color: '#e0e0e0',
      }}>
        <div style={{ color: '#888', marginBottom: 4 }}>{label}</div>
        <div style={{ fontWeight: 600 }}>
          {payload[0].value ?? '—'} {unit}
        </div>
      </div>
    )
  }
  return null
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, unit, color }: {
  label: string; value: string; unit?: string; color: string
}) {
  return (
    <div style={{
      background: '#1e1e1e',
      border: '1px solid #2a2a2a',
      borderRadius: '20px',
      padding: '22px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      flex: 1,
      minWidth: '140px',
    }}>
      <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span style={{ fontSize: '28px', fontWeight: '700', color, fontFamily: "'Outfit', sans-serif" }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: '13px', color: '#555' }}>{unit}</span>}
      </div>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#1e1e1e',
      border: '1px solid #2a2a2a',
      borderRadius: '20px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div style={{ fontSize: '14px', fontWeight: '600', color: '#aaa', letterSpacing: '0.04em' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [meals, setMeals] = useState<Meal[]>([])
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'calories' | 'weight' | 'protein' | 'macros'>('calories')

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
      <div style={{
        minHeight: '100vh', background: '#141414',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #333', borderTopColor: '#e0e0e0', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const calorieData = groupMealsByMonth(meals)
  const weightData = groupMetricsByMonth(metrics, 'weight')
  const proteinData = groupMetricsByMonth(metrics, 'protein')
  const carbData = groupMetricsByMonth(metrics, 'carbs')

  const tabs = [
    { key: 'calories', label: 'Calories' },
    { key: 'weight', label: 'Weight' },
    { key: 'protein', label: 'Protein' },
    { key: 'macros', label: 'Macros' },
  ] as const

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#1C1C2E', dark: '#1C1C2E' }}>
      <div style={{
          height: '100vh',
          overflowY: 'auto',
          background: '#141414',
          color: '#e0e0e0',
          fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
          padding: '0',
        }}>
        {/* Google Font */}
        <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #1a1a1a; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
      `}</style>

        {/* Top Nav */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 36px',
          borderBottom: '1px solid #222',
          background: '#141414',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px', fontWeight: '700', color: '#f0f0f0' }}>
            Nourish
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: '#2a2a2a', border: '1px solid #333',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: '600', color: '#bbb',
            }}>
              {profile?.first_name?.[0] ?? '?'}
            </div>
            <button onClick={signOut} style={{
              background: 'transparent', border: '1px solid #333',
              borderRadius: '10px', padding: '7px 14px',
              color: '#888', fontSize: '13px', cursor: 'pointer',
              transition: 'border-color 0.2s, color 0.2s',
            }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = '#e0e0e0'; (e.target as HTMLButtonElement).style.borderColor = '#555' }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = '#888'; (e.target as HTMLButtonElement).style.borderColor = '#333' }}
            >
              Sign out
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>

          {/* Greeting */}
          <div style={{ marginBottom: '36px' }}>
            <h1 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '32px', fontWeight: '700',
              color: '#f0f0f0', margin: '0 0 6px 0',
            }}>
              Hi, {profile?.first_name ?? profile?.username ?? 'there'} 👋
            </h1>
            <p style={{ color: '#555', fontSize: '14px', margin: 0 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Stat Cards */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '32px' }}>
            <StatCard
              label="Today's Calories"
              value={String(getTotalCaloriesToday(meals))}
              unit="kcal"
              color="#f97316"
            />
            <StatCard
              label="Current Weight"
              value={getLatestMetric(metrics, 'weight')}
              unit="lbs"
              color="#60a5fa"
            />
            <StatCard
              label="Latest Protein"
              value={getLatestMetric(metrics, 'protein')}
              unit="g"
              color="#34d399"
            />
            <StatCard
              label="Latest Carbs"
              value={getLatestMetric(metrics, 'carbs')}
              unit="g"
              color="#a78bfa"
            />
            <StatCard
              label="Total Meals Logged"
              value={String(meals.length)}
              color="#fb7185"
            />
          </div>

          {/* Chart Section */}
          <div style={{
            background: '#1e1e1e',
            border: '1px solid #2a2a2a',
            borderRadius: '24px',
            padding: '28px',
            marginBottom: '32px',
          }}>
            {/* Tab Bar */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '12px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background 0.2s, color 0.2s',
                    background: activeTab === tab.key ? '#f0f0f0' : '#2a2a2a',
                    color: activeTab === tab.key ? '#141414' : '#777',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Calories Chart */}
            {activeTab === 'calories' && (
              <div>
                <div style={{ fontSize: '13px', color: '#555', marginBottom: '16px' }}>
                  Total calories from meals — monthly overview
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={calorieData}>
                    <defs>
                      <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#555', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip unit="kcal" />} />
                    <Area type="monotone" dataKey="calories" stroke="#f97316" strokeWidth={2} fill="url(#calGrad)" dot={{ fill: '#f97316', r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Weight Chart */}
            {activeTab === 'weight' && (
              <div>
                <div style={{ fontSize: '13px', color: '#555', marginBottom: '16px' }}>
                  Average weight per month
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={weightData}>
                    <defs>
                      <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#555', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip unit="lbs" />} />
                    <Area type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={2} fill="url(#weightGrad)" dot={{ fill: '#60a5fa', r: 3 }} connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Protein Chart */}
            {activeTab === 'protein' && (
              <div>
                <div style={{ fontSize: '13px', color: '#555', marginBottom: '16px' }}>
                  Average daily protein intake per month
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={proteinData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#555', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip unit="g" />} />
                    <Bar dataKey="value" fill="#34d399" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Macros Chart */}
            {activeTab === 'macros' && (
              <div>
                <div style={{ fontSize: '13px', color: '#555', marginBottom: '16px' }}>
                  Protein vs Carbs vs Sugar — monthly averages
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={MONTHS.map(month => {
                    const mProteins = metrics.filter(m => MONTHS[new Date(m.observation_date).getMonth()] === month)
                    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : null
                    return {
                      month,
                      protein: avg(mProteins.map(m => m.protein).filter(Boolean) as number[]),
                      carbs: avg(mProteins.map(m => m.carbs).filter(Boolean) as number[]),
                      sugar: avg(mProteins.map(m => m.sugar).filter(Boolean) as number[]),
                    }
                  })}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#555', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '10px', fontSize: '13px' }}
                      labelStyle={{ color: '#888' }}
                    />
                    <Line type="monotone" dataKey="protein" stroke="#34d399" strokeWidth={2} dot={false} name="Protein (g)" connectNulls />
                    <Line type="monotone" dataKey="carbs" stroke="#a78bfa" strokeWidth={2} dot={false} name="Carbs (g)" connectNulls />
                    <Line type="monotone" dataKey="sugar" stroke="#fb7185" strokeWidth={2} dot={false} name="Sugar (g)" connectNulls />
                  </LineChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '20px', marginTop: '16px', justifyContent: 'center' }}>
                  {[['#34d399', 'Protein'], ['#a78bfa', 'Carbs'], ['#fb7185', 'Sugar']].map(([color, label]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#666' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent Meals */}
          <ChartCard title="RECENT MEALS">
            {meals.length === 0 ? (
              <div style={{ color: '#444', fontSize: '14px', padding: '12px 0' }}>No meals logged yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[...meals]
                  .sort((a, b) => new Date(b.meal_date).getTime() - new Date(a.meal_date).getTime())
                  .slice(0, 5)
                  .map(meal => (
                    <div key={meal.meal_id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#242424',
                      borderRadius: '14px',
                      padding: '14px 18px',
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#e0e0e0', textTransform: 'capitalize' }}>
                          {meal.meal_type ?? 'Meal'}
                        </span>
                        <span style={{ fontSize: '12px', color: '#555' }}>
                          {new Date(meal.meal_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {meal.meal_rating && (
                          <span style={{ fontSize: '12px', color: '#f59e0b' }}>
                            {'★'.repeat(meal.meal_rating)}{'☆'.repeat(5 - meal.meal_rating)}
                          </span>
                        )}
                        <span style={{
                          fontSize: '13px', fontWeight: '600', color: '#f97316',
                          background: '#2a1a0a', borderRadius: '8px', padding: '4px 10px',
                        }}>
                          {meal.total_calories ? `${meal.total_calories} kcal` : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </ChartCard>
        </main>
      </div>
    </ParallaxScrollView>
  )
}
