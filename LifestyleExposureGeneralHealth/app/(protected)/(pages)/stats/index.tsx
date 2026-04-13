import { useEffect, useState } from 'react'
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
} from 'react-native'
import Svg, {
  Path, Circle, Rect, Text as SvgText, G, Line, Defs, LinearGradient, Stop,
} from 'react-native-svg'
import { supabase } from '@/lib/supabase'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CHART_W = SCREEN_WIDTH - 76

const FONT = Platform.OS === 'ios' ? 'System' : 'sans-serif'

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#0d0d0d', surface: '#141414', surfaceHi: '#1a1a1a',
  border: '#222', borderHi: '#2e2e2e',
  textPrime: '#f2f2f2', textSub: '#5a5a5a', textMid: '#888',
  orange: '#f97316', blue: '#60a5fa', green: '#34d399',
  purple: '#a78bfa', rose: '#fb7185', amber: '#fbbf24', teal: '#2dd4bf',
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function parseLocal(dateStr: string): Date {
  const s = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T')
  return new Date(s.replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, ''))
}

function lastNMonths(n: number): { label: string; year: number; month: number }[] {
  const result = []
  const now = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      year: d.getFullYear(),
      month: d.getMonth(),
    })
  }
  return result.reverse()
}

function lastNWeeks(n: number): { label: string; weekStart: Date; weekEnd: Date }[] {
  const result = []
  const now = new Date()
  const dow = now.getDay()
  const startOfThisWeek = new Date(now)
  startOfThisWeek.setDate(now.getDate() - ((dow + 6) % 7))
  startOfThisWeek.setHours(0, 0, 0, 0)

  for (let i = 0; i < n; i++) {
    const ws = new Date(startOfThisWeek)
    ws.setDate(startOfThisWeek.getDate() - i * 7)
    const we = new Date(ws)
    we.setDate(ws.getDate() + 6)
    we.setHours(23, 59, 59, 999)
    result.push({
      label: ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weekStart: new Date(ws),
      weekEnd: new Date(we),
    })
  }
  return result.reverse()
}

// ─── Aggregation ──────────────────────────────────────────────────────────────
interface AnyRow { [key: string]: any }

function sumByMonth(
  rows: AnyRow[],
  dateField: string,
  valueField: string,
  months: { year: number; month: number }[]
): number[] {
  return months.map(({ year, month }) =>
    rows
      .filter(r => {
        if (!r[dateField]) return false
        const d = parseLocal(r[dateField])
        return d.getFullYear() === year && d.getMonth() === month
      })
      .reduce((sum, r) => sum + (Number(r[valueField]) || 0), 0)
  )
}

function sumByWeek(
  rows: AnyRow[],
  dateField: string,
  valueField: string,
  weeks: { weekStart: Date; weekEnd: Date }[]
): number[] {
  return weeks.map(({ weekStart, weekEnd }) =>
    rows
      .filter(r => {
        if (!r[dateField]) return false
        const d = parseLocal(r[dateField])
        return d >= weekStart && d <= weekEnd
      })
      .reduce((sum, r) => sum + (Number(r[valueField]) || 0), 0)
  )
}

function clamp(data: number[]): number[] {
  return data.map(v => (isNaN(v) || !isFinite(v) ? 0 : Math.round(v * 10) / 10))
}

// ─── Chart: smooth area line ──────────────────────────────────────────────────
function buildPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i], p1 = pts[i + 1]
    const cpx = ((p0.x + p1.x) / 2).toFixed(1)
    d += ` C ${cpx} ${p0.y.toFixed(1)}, ${cpx} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`
  }
  return d
}

function AreaChart({
  data, labels, color, gradId, height = 150, unit = '',
}: {
  data: number[]; labels: string[]; color: string
  gradId: string; height?: number; unit?: string
}) {
  if (data.every(v => v === 0)) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: FONT, fontSize: 12, color: C.textSub }}>No data for this period</Text>
      </View>
    )
  }

  const pT = 20, pB = 26, pL = 8, pR = 8
  const w = CHART_W, h = height
  const cH = h - pT - pB
  const cW = w - pL - pR
  const step = cW / Math.max(data.length - 1, 1)
  const max = Math.max(...data, 1)

  const pts = data.map((v, i) => ({
    x: pL + i * step,
    y: pT + cH - (v / max) * cH,
  }))

  const linePath = buildPath(pts)
  const areaPath = linePath
    + ` L ${pts[pts.length - 1].x.toFixed(1)} ${(pT + cH).toFixed(1)}`
    + ` L ${pts[0].x.toFixed(1)} ${(pT + cH).toFixed(1)} Z`

  const skipLabel = data.length > 9

  return (
    <Svg width={w} height={h}>
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.3" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {[0, 0.25, 0.5, 0.75, 1].map(f => (
        <Line key={f}
          x1={pL} y1={pT + cH - f * cH}
          x2={w - pR} y2={pT + cH - f * cH}
          stroke="#1c1c1c" strokeWidth="1"
        />
      ))}
      <Path d={areaPath} fill={`url(#${gradId})`} />
      <Path d={linePath} stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => data[i] > 0 && (
        <Circle key={i} cx={p.x} cy={p.y} r="3.5" fill={color} />
      ))}
      {labels.map((lbl, i) => {
        if (skipLabel && i % 2 !== 0) return null
        return (
          <SvgText key={lbl} x={pts[i]?.x ?? 0} y={h - 6}
            fontSize="9" fontFamily={FONT} fill={C.textSub} textAnchor="middle">
            {lbl}
          </SvgText>
        )
      })}
      <SvgText x={pL + 2} y={pT - 5} fontSize="9" fontFamily={FONT} fill={C.textSub}>
        {Math.round(max)}{unit}
      </SvgText>
    </Svg>
  )
}

// ─── Chart: stacked bars ──────────────────────────────────────────────────────
interface StackedCol { label: string; values: number[] }

function StackedBars({ data, colors, height = 150 }: {
  data: StackedCol[]; colors: string[]; height?: number
}) {
  const hasData = data.some(d => d.values.some(v => v > 0))
  if (!hasData) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: FONT, fontSize: 12, color: C.textSub }}>No data for this period</Text>
      </View>
    )
  }

  const pT = 14, pB = 26, pL = 6, pR = 6
  const w = CHART_W, h = height
  const cH = h - pT - pB
  const cW = w - pL - pR
  const gap = cW / data.length
  const barW = Math.max(6, gap * 0.58)
  const allTotals = data.map(d => d.values.reduce((s, v) => s + (v || 0), 0))
  const globalMax = Math.max(...allTotals, 1)

  return (
    <Svg width={w} height={h}>
      {[0, 0.5, 1].map(f => (
        <Line key={f}
          x1={pL} y1={pT + cH - f * cH}
          x2={w - pR} y2={pT + cH - f * cH}
          stroke="#1c1c1c" strokeWidth="1"
        />
      ))}
      {data.map((col, i) => {
        const cx = pL + gap * i + gap / 2
        let yBase = pT + cH
        return (
          <G key={col.label}>
            {col.values.map((val, vi) => {
              if (!val || val <= 0) return null
              const bH = Math.max(2, (val / globalMax) * cH)
              yBase -= bH
              return <Rect key={vi} x={cx - barW / 2} y={yBase} width={barW} height={bH} fill={colors[vi % colors.length]} rx="2" />
            })}
            <SvgText x={cx} y={h - 8} fontSize="9" fontFamily={FONT} fill={C.textSub} textAnchor="middle">
              {col.label}
            </SvgText>
          </G>
        )
      })}
    </Svg>
  )
}

// ─── Chart: semi-circle gauge ─────────────────────────────────────────────────
// FIX: clamp fy to never exceed cy (the arc baseline). Without this, near-zero
// pct values produce a tiny positive sin() result that pushes fy below the
// baseline, reversing the arc sweep direction.
function SemiGauge({ value, max, label, sublabel, color, size = 110 }: {
  value: number; max: number; label: string; sublabel?: string; color: string; size?: number
}) {
  const r = size * 0.36
  const cx = size / 2, cy = size * 0.60
  const sw = 9
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  const startX = cx - r, startY = cy, endX = cx + r
  const fillAngle = Math.PI - pct * Math.PI
  const fx = cx + r * Math.cos(fillAngle)
  // FIX: clamp fy so arc never dips below baseline
  const fy = Math.min(cy, cy + r * Math.sin(fillAngle))
  const largeArc = pct > 0.5 ? 1 : 0
  const trackPath = `M ${startX.toFixed(1)} ${startY.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${endX.toFixed(1)} ${startY.toFixed(1)}`
  // Raise threshold to 0.01 to avoid visually broken near-zero arcs
  const fillPath = pct > 0.01 ? `M ${startX.toFixed(1)} ${startY.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 ${largeArc} 1 ${fx.toFixed(1)} ${fy.toFixed(1)}` : ''
  const displayVal = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(Math.round(value))
  return (
    <View style={{ alignItems: 'center', flex: 1, minWidth: 80 }}>
      <Svg width={size} height={size * 0.68}>
        <Path d={trackPath} stroke={C.border} strokeWidth={sw} fill="none" strokeLinecap="round" />
        {fillPath ? <Path d={fillPath} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" /> : null}
        <SvgText x={cx} y={cy - 3} fontSize="17" fontWeight="700" fontFamily={FONT} fill={color} textAnchor="middle">{displayVal}</SvgText>
        {sublabel && <SvgText x={cx} y={cy + 11} fontSize="9" fontFamily={FONT} fill={C.textSub} textAnchor="middle">{sublabel}</SvgText>}
      </Svg>
      <Text style={{ fontFamily: FONT, fontSize: 11, color: C.textMid, textAlign: 'center', marginTop: -4 }}>{label}</Text>
    </View>
  )
}

// ─── Chart: donut ─────────────────────────────────────────────────────────────
interface PieSlice { value: number; color: string; label: string; pct: number }

function DonutChart({ slices, size = 140 }: { slices: PieSlice[]; size?: number }) {
  const cx = size / 2, cy = size / 2, r = size * 0.4
  const total = slices.reduce((s, sl) => s + sl.value, 0)
  if (total === 0) return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: FONT, color: C.textSub, fontSize: 12 }}>No data</Text>
    </View>
  )
  let angle = -Math.PI / 2
  const paths = slices.filter(sl => sl.value > 0).map(sl => {
    const sweep = (sl.value / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle)
    const x2 = cx + r * Math.cos(angle + sweep), y2 = cy + r * Math.sin(angle + sweep)
    const p = { path: `M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`, color: sl.color, label: sl.label, pct: sl.pct }
    angle += sweep
    return p
  })
  const top = slices.reduce((a, b) => a.value > b.value ? a : b, slices[0])
  return (
    <Svg width={size} height={size}>
      {paths.map((p, i) => <Path key={i} d={p.path} fill={p.color} stroke={C.surface} strokeWidth="2" />)}
      <Circle cx={cx} cy={cy} r={r * 0.52} fill={C.surface} />
      <SvgText x={cx} y={cy - 5} fontSize="13" fontWeight="700" fontFamily={FONT} fill={C.textPrime} textAnchor="middle">{top.label}</SvgText>
      <SvgText x={cx} y={cy + 11} fontSize="10" fontFamily={FONT} fill={C.textSub} textAnchor="middle">{top.pct}%</SvgText>
    </Svg>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
      {items.map(item => (
        <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
          <Text style={{ fontFamily: FONT, fontSize: 11, color: C.textMid }}>{item.label}</Text>
        </View>
      ))}
    </View>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, unit, color }: { label: string; value: string | number; unit: string; color: string }) {
  return (
    <View style={[sc.card, { borderTopColor: color }]}>
      <Text style={[sc.label, { fontFamily: FONT }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
        <Text style={[sc.value, { color, fontFamily: FONT }]}>{value}</Text>
        <Text style={[sc.unit, { fontFamily: FONT }]}>{unit}</Text>
      </View>
    </View>
  )
}
const sc = StyleSheet.create({
  card: { flex: 1, minWidth: 90, backgroundColor: C.surfaceHi, borderTopWidth: 2, borderRadius: 14, padding: 14, gap: 4 },
  label: { fontSize: 10, color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.7 },
  value: { fontSize: 22, fontWeight: '700', lineHeight: 26 },
  unit: { fontSize: 11, color: C.textSub, marginBottom: 2 },
})

// ─── Totals row ───────────────────────────────────────────────────────────────
function TotalsRow({ items }: { items: { label: string; value: number; unit: string; color: string }[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {items.map(item => (
        <View key={item.label} style={tr.cell}>
          <Text style={[tr.val, { color: item.color, fontFamily: FONT }]}>
            {item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}k` : Math.round(item.value)}
          </Text>
          <Text style={[tr.unit, { fontFamily: FONT }]}>{item.unit}</Text>
          <Text style={[tr.lbl, { fontFamily: FONT }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  )
}
const tr = StyleSheet.create({
  cell: { flex: 1, backgroundColor: C.surfaceHi, borderRadius: 12, padding: 12, alignItems: 'center', gap: 2, borderWidth: 1, borderColor: C.border },
  val: { fontSize: 18, fontWeight: '700' },
  unit: { fontSize: 9, color: C.textSub, textTransform: 'uppercase' },
  lbl: { fontSize: 10, color: C.textMid, textAlign: 'center' },
})

// ─── Tab button ───────────────────────────────────────────────────────────────
function TabBtn({ label, active, color, onPress }: { label: string; active: boolean; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[tb.btn, active && { backgroundColor: color + '18', borderColor: color + '55' }]}
      activeOpacity={0.7}
    >
      <Text style={[tb.text, { fontFamily: FONT }, active && { color }]}>{label}</Text>
    </TouchableOpacity>
  )
}
const tb = StyleSheet.create({
  btn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: C.surfaceHi, borderWidth: 1, borderColor: 'transparent' },
  text: { fontSize: 13, fontWeight: '600', color: C.textSub },
})

// ─── Section header ───────────────────────────────────────────────────────────
function SH({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <Text style={{ fontFamily: FONT, fontSize: 15, fontWeight: '700', color: C.textPrime }}>{title}</Text>
      {subtitle && <Text style={{ fontFamily: FONT, fontSize: 12, color: C.textSub }}>{subtitle}</Text>}
    </View>
  )
}

// ─── Main Stats Screen ────────────────────────────────────────────────────────
type MacroTab = 'calories' | 'protein' | 'carbs' | 'fat'
type RangeTab = 'weekly' | 'monthly'

export default function StatsScreen() {
  const insets = useSafeAreaInsets()
  const [meals, setMeals] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [macroTab, setMacroTab] = useState<MacroTab>('calories')
  const [rangeTab, setRangeTab] = useState<RangeTab>('monthly')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: mealData } = await supabase
        .from('user_meals')
        .select('*')
        .eq('user_id', user.id)
        .order('meal_date', { ascending: false })
      if (mealData) setMeals(mealData)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <View style={[s.fill, { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 14 }]}>
        <ActivityIndicator size="large" color={C.orange} />
        <Text style={{ fontFamily: FONT, color: C.textSub, fontSize: 14 }}>Loading stats…</Text>
      </View>
    )
  }

  if (meals.length === 0) {
    return (
      <View style={[s.fill, { backgroundColor: C.bg, paddingTop: insets.top }]}>
        <View style={s.header}>
          <View style={s.headerLogo}><View style={s.headerDot} /><Text style={[s.headerTitle, { fontFamily: FONT }]}>Stats</Text></View>
          <Text style={[s.headerSub, { fontFamily: FONT }]}>Historical overview</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Text style={{ fontSize: 44 }}>📊</Text>
          <Text style={{ fontFamily: FONT, fontSize: 18, fontWeight: '700', color: C.textMid }}>No data yet</Text>
          <Text style={{ fontFamily: FONT, fontSize: 13, color: C.textSub }}>Log meals to start seeing your stats.</Text>
        </View>
      </View>
    )
  }

  // ── Build date buckets ────────────────────────────────────────────────────
  const months12 = lastNMonths(12)
  const weeks8 = lastNWeeks(8)

  // ── Monthly macro sums ────────────────────────────────────────────────────
  const mCal   = clamp(sumByMonth(meals, 'meal_date', 'total_calories', months12))
  const mPro   = clamp(sumByMonth(meals, 'meal_date', 'total_protein',  months12))
  const mCarb  = clamp(sumByMonth(meals, 'meal_date', 'total_carbs',    months12))
  const mFat   = clamp(sumByMonth(meals, 'meal_date', 'total_fat',      months12))
  const monthLabels = months12.map(m => m.label)

  // ── Weekly macro sums ─────────────────────────────────────────────────────
  const wCal   = clamp(sumByWeek(meals, 'meal_date', 'total_calories', weeks8))
  const wPro   = clamp(sumByWeek(meals, 'meal_date', 'total_protein',  weeks8))
  const wCarb  = clamp(sumByWeek(meals, 'meal_date', 'total_carbs',    weeks8))
  const wFat   = clamp(sumByWeek(meals, 'meal_date', 'total_fat',      weeks8))
  const weekLabels = weeks8.map(w => w.label)

  // ── Active range data ─────────────────────────────────────────────────────
  const isCal = macroTab === 'calories', isPro = macroTab === 'protein'
  const isCarb = macroTab === 'carbs', isFat = macroTab === 'fat'
  const activeMonthlyData = isCal ? mCal : isPro ? mPro : isCarb ? mCarb : mFat
  const activeWeeklyData = isCal ? wCal : isPro ? wPro : isCarb ? wCarb : wFat
  const macroColor = isCal ? C.orange : isPro ? C.green : isCarb ? C.purple : C.blue
  const macroUnit = isCal ? 'kcal' : 'g'

  // ── Monthly vitamin sums ──────────────────────────────────────────────────
  const mVitC  = clamp(sumByMonth(meals, 'meal_date', 'total_vitamin_c',   months12))
  const mVitD  = clamp(sumByMonth(meals, 'meal_date', 'total_vitamin_d',   months12))
  const mVitA  = clamp(sumByMonth(meals, 'meal_date', 'total_vitamin_a',   months12))
  const mVitE  = clamp(sumByMonth(meals, 'meal_date', 'total_vitamin_e',   months12))
  const mVitK  = clamp(sumByMonth(meals, 'meal_date', 'total_vitamin_k',   months12))
  const mVitB6 = clamp(sumByMonth(meals, 'meal_date', 'total_vitamin_b6',  months12))
  const mVitB12= clamp(sumByMonth(meals, 'meal_date', 'total_vitamin_b12', months12))
  const hasVitaminData = mVitC.some(v => v > 0) || mVitD.some(v => v > 0) || mVitA.some(v => v > 0)

  // ── This week's and this month's macro totals ─────────────────────────────
  const thisWeekIdx = weeks8.length - 1
  const thisMonthIdx = months12.length - 1

  const thisWeekCal  = wCal[thisWeekIdx]  ?? 0
  const thisWeekPro  = wPro[thisWeekIdx]  ?? 0
  const thisWeekCarb = wCarb[thisWeekIdx] ?? 0
  const thisWeekFat  = wFat[thisWeekIdx]  ?? 0

  const thisMonthCal  = mCal[thisMonthIdx]  ?? 0
  const thisMonthPro  = mPro[thisMonthIdx]  ?? 0
  const thisMonthCarb = mCarb[thisMonthIdx] ?? 0
  const thisMonthFat  = mFat[thisMonthIdx]  ?? 0

  // ── All-time averages ─────────────────────────────────────────────────────
  const nonZeroCal = mCal.filter(v => v > 0)
  const avgCal = nonZeroCal.length ? Math.round(nonZeroCal.reduce((a, b) => a + b, 0) / nonZeroCal.length) : 0
  const nonZeroPro = mPro.filter(v => v > 0)
  const avgPro = nonZeroPro.length ? Math.round(nonZeroPro.reduce((a, b) => a + b, 0) / nonZeroPro.length) : 0

  // ── Stacked macro data ────────────────────────────────────────────────────
  const macroStackedMonthly = months12.map((_, i) => ({
    label: monthLabels[i], values: [mPro[i], mCarb[i], mFat[i]],
  }))
  const macroStackedWeekly = weeks8.map((_, i) => ({
    label: weekLabels[i], values: [wPro[i], wCarb[i], wFat[i]],
  }))

  // ── Vitamin stacked ───────────────────────────────────────────────────────
  const vitStackedMonthly = months12.map((_, i) => ({
    label: monthLabels[i],
    values: [mVitC[i], mVitD[i], mVitA[i], mVitE[i], mVitK[i]],
  }))

  // ── Donut: most recent month with vitamin data ────────────────────────────
  const vitMonthIdx = [...months12.keys()].reverse().find(i =>
    mVitC[i] > 0 || mVitD[i] > 0 || mVitA[i] > 0
  ) ?? -1
  const vitTotal = vitMonthIdx >= 0
    ? mVitC[vitMonthIdx] + mVitD[vitMonthIdx] + mVitA[vitMonthIdx] + mVitE[vitMonthIdx] + mVitK[vitMonthIdx]
    : 0
  const vitDonutSlices: PieSlice[] = vitMonthIdx >= 0 ? [
    { value: mVitC[vitMonthIdx], color: C.orange, label: 'Vit C', pct: vitTotal > 0 ? Math.round(mVitC[vitMonthIdx] / vitTotal * 100) : 0 },
    { value: mVitD[vitMonthIdx], color: C.rose,   label: 'Vit D', pct: vitTotal > 0 ? Math.round(mVitD[vitMonthIdx] / vitTotal * 100) : 0 },
    { value: mVitA[vitMonthIdx], color: C.amber,  label: 'Vit A', pct: vitTotal > 0 ? Math.round(mVitA[vitMonthIdx] / vitTotal * 100) : 0 },
    { value: mVitE[vitMonthIdx], color: C.teal,   label: 'Vit E', pct: vitTotal > 0 ? Math.round(mVitE[vitMonthIdx] / vitTotal * 100) : 0 },
    { value: mVitK[vitMonthIdx], color: C.green,  label: 'Vit K', pct: vitTotal > 0 ? Math.round(mVitK[vitMonthIdx] / vitTotal * 100) : 0 },
  ].filter(s => s.value > 0) : []

  const macroTabDef = [
    { key: 'calories' as MacroTab, label: 'Calories', color: C.orange },
    { key: 'protein'  as MacroTab, label: 'Protein',  color: C.green },
    { key: 'carbs'    as MacroTab, label: 'Carbs',    color: C.purple },
    { key: 'fat'      as MacroTab, label: 'Fat',      color: C.blue },
  ]

  const MONTHLY_GOALS = { cal: 60000, pro: 4500, carb: 7500, fat: 2000 }

  return (
    <View style={[s.fill, { backgroundColor: C.bg, paddingTop: insets.top }]}>

      <View style={s.header}>
        <View style={s.headerLogo}>
          <View style={s.headerDot} />
          <Text style={[s.headerTitle, { fontFamily: FONT }]}>Stats</Text>
        </View>
        <Text style={[s.headerSub, { fontFamily: FONT }]}>Historical overview</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Summary stat cards ────────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 2 }}>
          <StatCard label="Avg Monthly Cal" value={avgCal.toLocaleString()} unit="kcal" color={C.orange} />
          <StatCard label="Avg Monthly Protein" value={avgPro} unit="g" color={C.green} />
          <StatCard label="Total Meals" value={meals.length} unit="meals" color={C.purple} />
        </ScrollView>

        {/* ── This week + this month totals ─────────────────────────────── */}
        <View style={s.panel}>
          <SH title="Period Totals" subtitle="calories · protein · carbs · fat" />
          <View style={s.divider} />

          <Text style={{ fontFamily: FONT, fontSize: 11, color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            This Week
          </Text>
          <TotalsRow items={[
            { label: 'Calories', value: thisWeekCal,  unit: 'kcal', color: C.orange },
            { label: 'Protein',  value: thisWeekPro,  unit: 'g',    color: C.green  },
            { label: 'Carbs',    value: thisWeekCarb, unit: 'g',    color: C.purple },
            { label: 'Fat',      value: thisWeekFat,  unit: 'g',    color: C.blue   },
          ]} />

          <View style={s.divider} />

          <Text style={{ fontFamily: FONT, fontSize: 11, color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            This Month
          </Text>
          <TotalsRow items={[
            { label: 'Calories', value: thisMonthCal,  unit: 'kcal', color: C.orange },
            { label: 'Protein',  value: thisMonthPro,  unit: 'g',    color: C.green  },
            { label: 'Carbs',    value: thisMonthCarb, unit: 'g',    color: C.purple },
            { label: 'Fat',      value: thisMonthFat,  unit: 'g',    color: C.blue   },
          ]} />
        </View>

        {/* ── Semi-circle current month gauges ──────────────────────────── */}
        <View style={s.panel}>
          <SH title="This Month vs. Goal" subtitle="rough monthly targets" />
          <View style={s.divider} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: 8 }}>
            <SemiGauge value={thisMonthCal}  max={MONTHLY_GOALS.cal}  label="Calories" sublabel="kcal" color={C.orange} />
            <SemiGauge value={thisMonthPro}  max={MONTHLY_GOALS.pro}  label="Protein"  sublabel="g"    color={C.green}  />
            <SemiGauge value={thisMonthCarb} max={MONTHLY_GOALS.carb} label="Carbs"    sublabel="g"    color={C.purple} />
            <SemiGauge value={thisMonthFat}  max={MONTHLY_GOALS.fat}  label="Fat"      sublabel="g"    color={C.blue}   />
          </View>
        </View>

        {/* ── Macro trend chart ─────────────────────────────────────────── */}
        <View style={s.panel}>
          <SH title="Macro Trends" />
          <View style={s.divider} />

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TabBtn label="Weekly" active={rangeTab === 'weekly'} color={C.teal} onPress={() => setRangeTab('weekly')} />
            <TabBtn label="Monthly" active={rangeTab === 'monthly'} color={C.teal} onPress={() => setRangeTab('monthly')} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {macroTabDef.map(t => (
              <TabBtn key={t.key} label={t.label} active={macroTab === t.key} color={t.color} onPress={() => setMacroTab(t.key)} />
            ))}
          </ScrollView>

          <AreaChart
            data={rangeTab === 'weekly' ? activeWeeklyData : activeMonthlyData}
            labels={rangeTab === 'weekly' ? weekLabels : monthLabels}
            color={macroColor}
            gradId={`grad_${macroTab}_${rangeTab}`}
            unit={macroUnit}
          />
        </View>

        {/* ── Stacked macro breakdown ────────────────────────────────────── */}
        <View style={s.panel}>
          <SH title="Macro Breakdown" subtitle="protein · carbs · fat" />
          <View style={s.divider} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TabBtn label="Weekly" active={rangeTab === 'weekly'} color={C.teal} onPress={() => setRangeTab('weekly')} />
            <TabBtn label="Monthly" active={rangeTab === 'monthly'} color={C.teal} onPress={() => setRangeTab('monthly')} />
          </View>
          <StackedBars
            data={rangeTab === 'weekly' ? macroStackedWeekly : macroStackedMonthly}
            colors={[C.green, C.purple, C.blue]}
          />
          <Legend items={[{ color: C.green, label: 'Protein' }, { color: C.purple, label: 'Carbs' }, { color: C.blue, label: 'Fat' }]} />
        </View>

        {/* ── Vitamins ──────────────────────────────────────────────────── */}
        {hasVitaminData ? (
          <>
            <View style={s.panel}>
              <SH title="Vitamin Totals" subtitle="monthly stacked" />
              <View style={s.divider} />
              <StackedBars data={vitStackedMonthly} colors={[C.orange, C.rose, C.amber, C.teal, C.green]} />
              <Legend items={[
                { color: C.orange, label: 'Vit C (mg)' }, { color: C.rose, label: 'Vit D (μg)' },
                { color: C.amber, label: 'Vit A (μg)' }, { color: C.teal, label: 'Vit E (mg)' },
                { color: C.green, label: 'Vit K (μg)' },
              ]} />
            </View>

            {vitDonutSlices.length > 1 && (
              <View style={s.panel}>
                <SH title="Vitamin Distribution" subtitle={`${monthLabels[vitMonthIdx]} — most recent`} />
                <View style={s.divider} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                  <DonutChart slices={vitDonutSlices} size={150} />
                  <View style={{ flex: 1, gap: 10 }}>
                    {vitDonutSlices.map(sl => (
                      <View key={sl.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: sl.color }} />
                        <View>
                          <Text style={{ fontFamily: FONT, fontSize: 12, fontWeight: '600', color: C.textMid }}>{sl.label}</Text>
                          <Text style={{ fontFamily: FONT, fontSize: 11, fontWeight: '700', color: C.textPrime }}>
                            {sl.value.toFixed(1)}
                            <Text style={{ color: C.textSub, fontWeight: '400' }}>  {sl.pct}%</Text>
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {mVitC.some(v => v > 0) && (
              <View style={s.panel}>
                <SH title="Vitamin C Trend" subtitle="monthly total (mg)" />
                <View style={s.divider} />
                <AreaChart data={mVitC} labels={monthLabels} color={C.orange} gradId="gVitC" unit="mg" />
              </View>
            )}
            {mVitD.some(v => v > 0) && (
              <View style={s.panel}>
                <SH title="Vitamin D Trend" subtitle="monthly total (μg)" />
                <View style={s.divider} />
                <AreaChart data={mVitD} labels={monthLabels} color={C.rose} gradId="gVitD" unit="μg" />
              </View>
            )}
            {mVitA.some(v => v > 0) && (
              <View style={s.panel}>
                <SH title="Vitamin A Trend" subtitle="monthly total (μg)" />
                <View style={s.divider} />
                <AreaChart data={mVitA} labels={monthLabels} color={C.amber} gradId="gVitA" unit="μg" />
              </View>
            )}
            {(mVitB6.some(v => v > 0) || mVitB12.some(v => v > 0)) && (
              <View style={s.panel}>
                <SH title="B Vitamins" subtitle="B6 (mg) · B12 (μg) monthly" />
                <View style={s.divider} />
                {mVitB6.some(v => v > 0) && (
                  <AreaChart data={mVitB6} labels={monthLabels} color={C.purple} gradId="gVitB6" unit="mg" height={130} />
                )}
                {mVitB12.some(v => v > 0) && (
                  <AreaChart data={mVitB12} labels={monthLabels} color={C.blue} gradId="gVitB12" unit="μg" height={130} />
                )}
                <Legend items={[
                  ...(mVitB6.some(v => v > 0) ? [{ color: C.purple, label: 'B6' }] : []),
                  ...(mVitB12.some(v => v > 0) ? [{ color: C.blue, label: 'B12' }] : []),
                ]} />
              </View>
            )}
          </>
        ) : (
          <View style={[s.panel, { alignItems: 'center', gap: 6 }]}>
            <Text style={{ fontFamily: FONT, fontSize: 13, color: C.textMid, fontWeight: '600' }}>No vitamin data yet</Text>
            <Text style={{ fontFamily: FONT, fontSize: 12, color: C.textSub, textAlign: 'center' }}>
              Vitamin tracking begins automatically when you log meals with ingredients that have vitamin data in the USDA database.
            </Text>
          </View>
        )}

      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 14, backgroundColor: C.bg,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerLogo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.orange },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.textPrime, letterSpacing: -0.4 },
  headerSub: { fontSize: 12, color: C.textSub },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 60, gap: 20 },
  panel: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 22, padding: 18, gap: 14 },
  divider: { height: 1, backgroundColor: C.border, marginHorizontal: -18 },
})