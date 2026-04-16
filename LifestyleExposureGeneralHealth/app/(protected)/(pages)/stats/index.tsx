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
import { useTheme } from '@/context/theme-context'
import { Ionicons } from '@expo/vector-icons'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CHART_W = SCREEN_WIDTH - 76

const FONT = Platform.OS === 'ios' ? 'System' : 'sans-serif'

// ─── Dark purple palette ──────────────────────────────────────────────────────
const DARK_BG       = '#0f0e17'
const DARK_SURFACE  = '#1a1828'
const DARK_SURF_HI  = '#211f32'
const DARK_BORDER   = '#2a2740'
const DARK_BORDER_HI = '#322f4a'

// ─── Accent palette ───────────────────────────────────────────────────────────
const ACCENT = {
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
    result.push({ label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), year: d.getFullYear(), month: d.getMonth() })
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
    result.push({ label: ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), weekStart: new Date(ws), weekEnd: new Date(we) })
  }
  return result.reverse()
}

// ─── Aggregation ──────────────────────────────────────────────────────────────
interface AnyRow { [key: string]: any }

function sumByMonth(rows: AnyRow[], dateField: string, valueField: string, months: { year: number; month: number }[]): number[] {
  return months.map(({ year, month }) =>
    rows.filter(r => {
      if (!r[dateField]) return false
      const d = parseLocal(r[dateField])
      return d.getFullYear() === year && d.getMonth() === month
    }).reduce((sum, r) => sum + (Number(r[valueField]) || 0), 0)
  )
}

function sumByWeek(rows: AnyRow[], dateField: string, valueField: string, weeks: { weekStart: Date; weekEnd: Date }[]): number[] {
  return weeks.map(({ weekStart, weekEnd }) =>
    rows.filter(r => {
      if (!r[dateField]) return false
      const d = parseLocal(r[dateField])
      return d >= weekStart && d <= weekEnd
    }).reduce((sum, r) => sum + (Number(r[valueField]) || 0), 0)
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

function AreaChart({ data, labels, color, gradId, height = 150, unit = '', gridColor, textColor, bgColor }: {
  data: number[]; labels: string[]; color: string
  gradId: string; height?: number; unit?: string
  gridColor: string; textColor: string; bgColor: string
}) {
  if (data.every(v => v === 0)) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center', backgroundColor: bgColor, borderRadius: 12 }}>
        <Text style={{ fontFamily: FONT, fontSize: 12, color: textColor }}>No data for this period</Text>
      </View>
    )
  }

  const pT = 20, pB = 26, pL = 8, pR = 8
  const w = CHART_W, h = height
  const cH = h - pT - pB
  const cW = w - pL - pR
  const step = cW / Math.max(data.length - 1, 1)
  const max = Math.max(...data, 1)

  const pts = data.map((v, i) => ({ x: pL + i * step, y: pT + cH - (v / max) * cH }))
  const linePath = buildPath(pts)
  const areaPath = linePath
    + ` L ${pts[pts.length - 1].x.toFixed(1)} ${(pT + cH).toFixed(1)}`
    + ` L ${pts[0].x.toFixed(1)} ${(pT + cH).toFixed(1)} Z`

  const skipLabel = data.length > 9

  return (
    <View style={{ backgroundColor: bgColor, borderRadius: 12, overflow: 'hidden' }}>
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.3" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <Line key={f} x1={pL} y1={pT + cH - f * cH} x2={w - pR} y2={pT + cH - f * cH} stroke={gridColor} strokeWidth="1" />
        ))}
        <Path d={areaPath} fill={`url(#${gradId})`} />
        <Path d={linePath} stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => data[i] > 0 && (
          <Circle key={i} cx={p.x} cy={p.y} r="3.5" fill={color} />
        ))}
        {labels.map((lbl, i) => {
          if (skipLabel && i % 2 !== 0) return null
          return (
            <SvgText key={lbl} x={pts[i]?.x ?? 0} y={h - 6} fontSize="9" fontFamily={FONT} fill={textColor} textAnchor="middle">
              {lbl}
            </SvgText>
          )
        })}
        <SvgText x={pL + 2} y={pT - 5} fontSize="9" fontFamily={FONT} fill={textColor}>
          {Math.round(max)}{unit}
        </SvgText>
      </Svg>
    </View>
  )
}

// ─── Chart: stacked bars ──────────────────────────────────────────────────────
interface StackedCol { label: string; values: number[] }

function StackedBars({ data, colors, height = 150, gridColor, textColor, bgColor }: {
  data: StackedCol[]; colors: string[]; height?: number
  gridColor: string; textColor: string; bgColor: string
}) {
  const hasData = data.some(d => d.values.some(v => v > 0))
  if (!hasData) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center', backgroundColor: bgColor, borderRadius: 12 }}>
        <Text style={{ fontFamily: FONT, fontSize: 12, color: textColor }}>No data for this period</Text>
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
    <View style={{ backgroundColor: bgColor, borderRadius: 12, overflow: 'hidden' }}>
      <Svg width={w} height={h}>
        {[0, 0.5, 1].map(f => (
          <Line key={f} x1={pL} y1={pT + cH - f * cH} x2={w - pR} y2={pT + cH - f * cH} stroke={gridColor} strokeWidth="1" />
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
              <SvgText x={cx} y={h - 8} fontSize="9" fontFamily={FONT} fill={textColor} textAnchor="middle">{col.label}</SvgText>
            </G>
          )
        })}
      </Svg>
    </View>
  )
}

// ─── Chart: semi-circle gauge ─────────────────────────────────────────────────
// The gauge renders a 180° arc (left→right, sweeping clockwise via the top).
// The track path goes from the left endpoint to the right endpoint using
// the "large-arc=0, sweep=1" convention so it arcs through the TOP of the
// semi-circle. The fill arc follows the same convention but stops at pct×180°.
//
// Key fix: both track and fill use the SAME arc direction (sweep-flag=1,
// which in SVG means clockwise). The endpoint for the fill arc is computed
// using standard trig where 0° = right, 180° = left in math space — but
// in SVG y is flipped, so sin is negated.
function SemiGauge({
  value, max, label, sublabel, color, size = 110,
  surfaceColor, textMuted, borderColor,
}: {
  value: number; max: number; label: string; sublabel?: string
  color: string; size?: number
  surfaceColor: string; textMuted: string; borderColor: string
}) {
  const r    = size * 0.36
  const cx   = size / 2
  const cy   = size * 0.60   // baseline for the arc diameter (flat edge)
  const sw   = 9
  const pct  = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0

  // The two endpoints of the full 180° arc sit on a horizontal diameter at cy.
  // Left endpoint = (cx - r, cy), right endpoint = (cx + r, cy).
  // The arc sweeps CLOCKWISE (sweep-flag=1) from left→right through the top,
  // which means large-arc=0 (it's exactly 180°, but SVG requires large-arc=1
  // when sweep is exactly π, so we use a tiny epsilon to stay at 180° safely —
  // actually for a pure 180° arc we must use large-arc=1 with sweep=1).
  const lx = cx - r, ly = cy   // left point
  const rx = cx + r, ry = cy   // right point

  // Full track: left → right, clockwise through the top (large-arc=1, sweep=1)
  const trackPath =
    `M ${lx.toFixed(2)} ${ly.toFixed(2)} ` +
    `A ${r.toFixed(2)} ${r.toFixed(2)} 0 1 1 ${rx.toFixed(2)} ${ry.toFixed(2)}`

  // Fill arc: same start (lx, ly), sweeps pct×180° clockwise.
  // In standard math coords (origin at cx,cy, y up):
  //   left point is at angle 180°
  //   the arc sweeps CW toward 0° (right)
  //   so end angle (math) = 180° - pct×180°
  // In SVG coords (y is flipped), the point at math-angle θ is:
  //   x = cx + r·cos(θ)
  //   y = cy - r·sin(θ)   ← minus because SVG y-axis points down
  let fillPath = ''
  if (pct > 0.001) {
    const endAngleRad = Math.PI * (1 - pct) // math angle of end point
    const ex = cx + r * Math.cos(endAngleRad)
    const ey = cy - r * Math.sin(endAngleRad)  // SVG y flip
    // large-arc=1 only when the arc spans more than 180°; here max is 180°,
    // so large-arc=1 only at pct=1 (full semicircle).
    const largeArc = pct >= 1 ? 1 : 0
    fillPath =
      `M ${lx.toFixed(2)} ${ly.toFixed(2)} ` +
      `A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${largeArc} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`
  }

  const displayVal = value >= 1000
    ? `${(value / 1000).toFixed(1)}k`
    : String(Math.round(value))

  // SVG height: just enough to show the arc above cy plus a little padding.
  const svgH = cy + sw / 2 + 4

  return (
    <View style={{ alignItems: 'center', flex: 1, minWidth: 80 }}>
      <Svg width={size} height={svgH}>
        {/* Track */}
        <Path d={trackPath} stroke={borderColor} strokeWidth={sw} fill="none" strokeLinecap="round" />
        {/* Fill */}
        {fillPath ? (
          <Path d={fillPath} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" />
        ) : null}
        {/* Value label centered on the arc */}
        <SvgText
          x={cx} y={cy - r * 0.18}
          fontSize="17" fontWeight="700" fontFamily={FONT}
          fill={color} textAnchor="middle"
        >
          {displayVal}
        </SvgText>
        {sublabel && (
          <SvgText
            x={cx} y={cy - r * 0.18 + 15}
            fontSize="9" fontFamily={FONT}
            fill={textMuted} textAnchor="middle"
          >
            {sublabel}
          </SvgText>
        )}
      </Svg>
      <Text style={{ fontFamily: FONT, fontSize: 11, color: textMuted, textAlign: 'center', marginTop: 2 }}>
        {label}
      </Text>
    </View>
  )
}

// ─── Chart: donut ─────────────────────────────────────────────────────────────
interface PieSlice { value: number; color: string; label: string; pct: number }

function DonutChart({ slices, size = 140, surfaceColor, textPrime, textMuted }: {
  slices: PieSlice[]; size?: number
  surfaceColor: string; textPrime: string; textMuted: string
}) {
  const cx = size / 2, cy = size / 2, r = size * 0.4
  const total = slices.reduce((s, sl) => s + sl.value, 0)
  if (total === 0) return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: FONT, color: textMuted, fontSize: 12 }}>No data</Text>
    </View>
  )
  let angle = -Math.PI / 2
  const paths = slices.filter(sl => sl.value > 0).map(sl => {
    const sweep = (sl.value / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle)
    const x2 = cx + r * Math.cos(angle + sweep), y2 = cy + r * Math.sin(angle + sweep)
    const p = {
      path: `M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`,
      color: sl.color, label: sl.label, pct: sl.pct,
    }
    angle += sweep
    return p
  })
  const top = slices.reduce((a, b) => a.value > b.value ? a : b, slices[0])
  return (
    <Svg width={size} height={size}>
      {paths.map((p, i) => <Path key={i} d={p.path} fill={p.color} stroke={surfaceColor} strokeWidth="2" />)}
      <Circle cx={cx} cy={cy} r={r * 0.52} fill={surfaceColor} />
      <SvgText x={cx} y={cy - 5} fontSize="13" fontWeight="700" fontFamily={FONT} fill={textPrime} textAnchor="middle">{top.label}</SvgText>
      <SvgText x={cx} y={cy + 11} fontSize="10" fontFamily={FONT} fill={textMuted} textAnchor="middle">{top.pct}%</SvgText>
    </Svg>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function Legend({ items, textColor }: { items: { color: string; label: string }[]; textColor: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
      {items.map(item => (
        <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
          <Text style={{ fontFamily: FONT, fontSize: 11, color: textColor }}>{item.label}</Text>
        </View>
      ))}
    </View>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, unit, color, C }: {
  label: string; value: string | number; unit: string; color: string
  C: { surfaceHi: string; textSub: string; border: string }
}) {
  return (
    <View style={[sc.card, { borderTopColor: color, backgroundColor: C.surfaceHi, borderColor: C.border }]}>
      <Text style={[sc.label, { fontFamily: FONT, color: C.textSub }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
        <Text style={[sc.value, { color, fontFamily: FONT }]}>{value}</Text>
        <Text style={[sc.unit, { fontFamily: FONT, color: C.textSub }]}>{unit}</Text>
      </View>
    </View>
  )
}
const sc = StyleSheet.create({
  card: { flex: 1, minWidth: 90, borderTopWidth: 2, borderWidth: 1, borderRadius: 14, padding: 14, gap: 4 },
  label: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.7 },
  value: { fontSize: 22, fontWeight: '700', lineHeight: 26 },
  unit: { fontSize: 11, marginBottom: 2 },
})

// ─── Totals Row ───────────────────────────────────────────────────────────────
function TotalsRow({ items, C }: {
  items: { label: string; value: number; unit: string; color: string }[]
  C: { surfaceHi: string; border: string; textSub: string; textMid: string }
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {items.map(item => (
        <View key={item.label} style={[tr.cell, { backgroundColor: C.surfaceHi, borderColor: C.border }]}>
          <Text style={[tr.val, { color: item.color, fontFamily: FONT }]}>
            {item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}k` : Math.round(item.value)}
          </Text>
          <Text style={[tr.unit, { fontFamily: FONT, color: C.textSub }]}>{item.unit}</Text>
          <Text style={[tr.lbl, { fontFamily: FONT, color: C.textMid }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  )
}
const tr = StyleSheet.create({
  cell: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', gap: 2, borderWidth: 1 },
  val: { fontSize: 18, fontWeight: '700' },
  unit: { fontSize: 9, textTransform: 'uppercase' },
  lbl: { fontSize: 10, textAlign: 'center' },
})

// ─── Tab Button ───────────────────────────────────────────────────────────────
function TabBtn({ label, active, color, onPress, C }: {
  label: string; active: boolean; color: string; onPress: () => void
  C: { surfaceHi: string; textSub: string }
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[tb.btn, { backgroundColor: C.surfaceHi }, active && { backgroundColor: color + '18', borderColor: color + '55' }]}
      activeOpacity={0.7}
    >
      <Text style={[tb.text, { fontFamily: FONT, color: C.textSub }, active && { color }]}>{label}</Text>
    </TouchableOpacity>
  )
}
const tb = StyleSheet.create({
  btn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  text: { fontSize: 13, fontWeight: '600' },
})

// ─── Section Header ───────────────────────────────────────────────────────────
function SH({ title, subtitle, C }: {
  title: string; subtitle?: string
  C: { textPrime: string; textSub: string }
}) {
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
  const { isDark, colors, setThemeMode } = useTheme()
  const [meals, setMeals] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [macroTab, setMacroTab] = useState<MacroTab>('calories')
  const [rangeTab, setRangeTab] = useState<RangeTab>('monthly')

  // ── Dark purple color palette
  const C = {
    bg:        isDark ? DARK_BG        : colors.background,
    surface:   isDark ? DARK_SURFACE   : colors.card,
    surfaceHi: isDark ? DARK_SURF_HI   : '#F5F5F5',
    border:    isDark ? DARK_BORDER    : (colors.border ?? '#E5E5E5'),
    borderHi:  isDark ? DARK_BORDER_HI : '#E0E0E0',
    textPrime: colors.text,
    textSub:   colors.textMuted,
    textMid:   colors.textSecondary,
  }

  const vizBg        = C.surfaceHi
  const gridColor    = isDark ? DARK_BORDER    : '#E8E8E8'
  const gaugeTrack   = isDark ? DARK_BORDER_HI : '#E0E0E0'
  const chartTextColor = isDark ? '#5a5570' : '#999999'

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
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <ActivityIndicator size="large" color={ACCENT.orange} />
        <Text style={{ fontFamily: FONT, color: C.textSub, fontSize: 14 }}>Loading stats…</Text>
      </View>
    )
  }

  if (meals.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
        <View style={[s.header, { backgroundColor: C.bg, borderBottomColor: C.border }]}>
          <View style={s.headerLogo}>
            <View style={[s.headerDot, { backgroundColor: ACCENT.orange }]} />
            <Text style={[s.headerTitle, { fontFamily: FONT, color: C.textPrime }]}>Stats</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={[s.headerSub, { fontFamily: FONT, color: C.textSub }]}>Historical overview</Text>
            <TouchableOpacity
              onPress={() => setThemeMode(isDark ? 'light' : 'dark')}
              style={[s.themeToggle, { backgroundColor: C.surfaceHi, borderColor: C.borderHi }]}
            >
              <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={16} color={isDark ? ACCENT.amber : '#6B6B8A'} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Text style={{ fontSize: 44 }}>📊</Text>
          <Text style={{ fontFamily: FONT, fontSize: 18, fontWeight: '700', color: C.textMid }}>No data yet</Text>
          <Text style={{ fontFamily: FONT, fontSize: 13, color: C.textSub }}>Log meals to start seeing your stats.</Text>
        </View>
      </View>
    )
  }

  // ── Build date buckets ─────────────────────────────────────────────────────
  const months12 = lastNMonths(12)
  const weeks8 = lastNWeeks(8)

  // ── Monthly macro sums ─────────────────────────────────────────────────────
  const mCal  = clamp(sumByMonth(meals, 'meal_date', 'total_calories', months12))
  const mPro  = clamp(sumByMonth(meals, 'meal_date', 'total_protein',  months12))
  const mCarb = clamp(sumByMonth(meals, 'meal_date', 'total_carbs',    months12))
  const mFat  = clamp(sumByMonth(meals, 'meal_date', 'total_fat',      months12))
  const monthLabels = months12.map(m => m.label)

  // ── Weekly macro sums ──────────────────────────────────────────────────────
  const wCal  = clamp(sumByWeek(meals, 'meal_date', 'total_calories', weeks8))
  const wPro  = clamp(sumByWeek(meals, 'meal_date', 'total_protein',  weeks8))
  const wCarb = clamp(sumByWeek(meals, 'meal_date', 'total_carbs',    weeks8))
  const wFat  = clamp(sumByWeek(meals, 'meal_date', 'total_fat',      weeks8))
  const weekLabels = weeks8.map(w => w.label)

  // ── Active range data ──────────────────────────────────────────────────────
  const isCal = macroTab === 'calories', isPro = macroTab === 'protein'
  const isCarb = macroTab === 'carbs', isFat = macroTab === 'fat'
  const activeMonthlyData = isCal ? mCal : isPro ? mPro : isCarb ? mCarb : mFat
  const activeWeeklyData = isCal ? wCal : isPro ? wPro : isCarb ? wCarb : wFat
  const macroColor = isCal ? ACCENT.orange : isPro ? ACCENT.green : isCarb ? ACCENT.purple : ACCENT.blue
  const macroUnit = isCal ? 'kcal' : 'g'

  // ── Monthly vitamin sums ───────────────────────────────────────────────────
  const mVitC   = clamp(sumByMonth(meals, 'meal_date', 'total_vitamin_c',   months12))
  const mVitD   = clamp(sumByMonth(meals, 'meal_date', 'total_vitamin_d',   months12))
  const mVitA   = clamp(sumByMonth(meals, 'meal_date', 'total_vitamin_a',   months12))
  const mVitE   = clamp(sumByMonth(meals, 'meal_date', 'total_vitamin_e',   months12))
  const mVitK   = clamp(sumByMonth(meals, 'meal_date', 'total_vitamin_k',   months12))
  const mVitB6  = clamp(sumByMonth(meals, 'meal_date', 'total_vitamin_b6',  months12))
  const mVitB12 = clamp(sumByMonth(meals, 'meal_date', 'total_vitamin_b12', months12))
  const hasVitaminData = mVitC.some(v => v > 0) || mVitD.some(v => v > 0) || mVitA.some(v => v > 0)

  // ── Period totals ──────────────────────────────────────────────────────────
  const thisWeekIdx  = weeks8.length - 1
  const thisMonthIdx = months12.length - 1

  const thisWeekCal   = wCal[thisWeekIdx]   ?? 0
  const thisWeekPro   = wPro[thisWeekIdx]   ?? 0
  const thisWeekCarb  = wCarb[thisWeekIdx]  ?? 0
  const thisWeekFat   = wFat[thisWeekIdx]   ?? 0
  const thisMonthCal  = mCal[thisMonthIdx]  ?? 0
  const thisMonthPro  = mPro[thisMonthIdx]  ?? 0
  const thisMonthCarb = mCarb[thisMonthIdx] ?? 0
  const thisMonthFat  = mFat[thisMonthIdx]  ?? 0

  // ── All-time averages ──────────────────────────────────────────────────────
  const nonZeroCal = mCal.filter(v => v > 0)
  const avgCal = nonZeroCal.length ? Math.round(nonZeroCal.reduce((a, b) => a + b, 0) / nonZeroCal.length) : 0
  const nonZeroPro = mPro.filter(v => v > 0)
  const avgPro = nonZeroPro.length ? Math.round(nonZeroPro.reduce((a, b) => a + b, 0) / nonZeroPro.length) : 0

  // ── Stacked macro data ─────────────────────────────────────────────────────
  const macroStackedMonthly = months12.map((_, i) => ({ label: monthLabels[i], values: [mPro[i], mCarb[i], mFat[i]] }))
  const macroStackedWeekly  = weeks8.map((_, i) => ({ label: weekLabels[i], values: [wPro[i], wCarb[i], wFat[i]] }))

  // ── Vitamin stacked ────────────────────────────────────────────────────────
  const vitStackedMonthly = months12.map((_, i) => ({
    label: monthLabels[i],
    values: [mVitC[i], mVitD[i], mVitA[i], mVitE[i], mVitK[i]],
  }))

  // ── Donut ──────────────────────────────────────────────────────────────────
  const vitMonthIdx = [...months12.keys()].reverse().find(i =>
    mVitC[i] > 0 || mVitD[i] > 0 || mVitA[i] > 0
  ) ?? -1
  const vitTotal = vitMonthIdx >= 0
    ? mVitC[vitMonthIdx] + mVitD[vitMonthIdx] + mVitA[vitMonthIdx] + mVitE[vitMonthIdx] + mVitK[vitMonthIdx]
    : 0
  const vitDonutSlices: PieSlice[] = vitMonthIdx >= 0 ? [
    { value: mVitC[vitMonthIdx],  color: ACCENT.orange, label: 'Vit C', pct: vitTotal > 0 ? Math.round(mVitC[vitMonthIdx]  / vitTotal * 100) : 0 },
    { value: mVitD[vitMonthIdx],  color: ACCENT.rose,   label: 'Vit D', pct: vitTotal > 0 ? Math.round(mVitD[vitMonthIdx]  / vitTotal * 100) : 0 },
    { value: mVitA[vitMonthIdx],  color: ACCENT.amber,  label: 'Vit A', pct: vitTotal > 0 ? Math.round(mVitA[vitMonthIdx]  / vitTotal * 100) : 0 },
    { value: mVitE[vitMonthIdx],  color: ACCENT.teal,   label: 'Vit E', pct: vitTotal > 0 ? Math.round(mVitE[vitMonthIdx]  / vitTotal * 100) : 0 },
    { value: mVitK[vitMonthIdx],  color: ACCENT.green,  label: 'Vit K', pct: vitTotal > 0 ? Math.round(mVitK[vitMonthIdx]  / vitTotal * 100) : 0 },
  ].filter(s => s.value > 0) : []

  const macroTabDef = [
    { key: 'calories' as MacroTab, label: 'Calories', color: ACCENT.orange },
    { key: 'protein'  as MacroTab, label: 'Protein',  color: ACCENT.green  },
    { key: 'carbs'    as MacroTab, label: 'Carbs',    color: ACCENT.purple },
    { key: 'fat'      as MacroTab, label: 'Fat',      color: ACCENT.blue   },
  ]

  const MONTHLY_GOALS = { cal: 60000, pro: 4500, carb: 7500, fat: 2000 }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[s.header, { backgroundColor: C.bg, borderBottomColor: C.border }]}>
        <View style={s.headerLogo}>
          <View style={[s.headerDot, { backgroundColor: ACCENT.orange }]} />
          <Text style={[s.headerTitle, { fontFamily: FONT, color: C.textPrime }]}>Stats</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={[s.headerSub, { fontFamily: FONT, color: C.textSub }]}>Historical overview</Text>
          <TouchableOpacity
            onPress={() => setThemeMode(isDark ? 'light' : 'dark')}
            style={[s.themeToggle, { backgroundColor: C.surfaceHi, borderColor: C.borderHi }]}
            activeOpacity={0.7}
          >
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={16} color={isDark ? ACCENT.amber : '#6B6B8A'} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.content, { backgroundColor: C.bg }]} showsVerticalScrollIndicator={false}>

        {/* ── Summary stat cards ──────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 2 }}>
          <StatCard label="Avg Monthly Cal" value={avgCal.toLocaleString()} unit="kcal" color={ACCENT.orange} C={C} />
          <StatCard label="Avg Monthly Protein" value={avgPro} unit="g" color={ACCENT.green} C={C} />
          <StatCard label="Total Meals" value={meals.length} unit="meals" color={ACCENT.purple} C={C} />
        </ScrollView>

        {/* ── Period Totals ────────────────────────────────────────────── */}
        <View style={[s.panel, { backgroundColor: C.surface, borderColor: C.border }]}>
          <SH title="Period Totals" subtitle="calories · protein · carbs · fat" C={C} />
          <View style={[s.divider, { backgroundColor: C.border }]} />
          <Text style={{ fontFamily: FONT, fontSize: 11, color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.8 }}>This Week</Text>
          <TotalsRow items={[
            { label: 'Calories', value: thisWeekCal,  unit: 'kcal', color: ACCENT.orange },
            { label: 'Protein',  value: thisWeekPro,  unit: 'g',    color: ACCENT.green  },
            { label: 'Carbs',    value: thisWeekCarb, unit: 'g',    color: ACCENT.purple },
            { label: 'Fat',      value: thisWeekFat,  unit: 'g',    color: ACCENT.blue   },
          ]} C={C} />
          <View style={[s.divider, { backgroundColor: C.border }]} />
          <Text style={{ fontFamily: FONT, fontSize: 11, color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.8 }}>This Month</Text>
          <TotalsRow items={[
            { label: 'Calories', value: thisMonthCal,  unit: 'kcal', color: ACCENT.orange },
            { label: 'Protein',  value: thisMonthPro,  unit: 'g',    color: ACCENT.green  },
            { label: 'Carbs',    value: thisMonthCarb, unit: 'g',    color: ACCENT.purple },
            { label: 'Fat',      value: thisMonthFat,  unit: 'g',    color: ACCENT.blue   },
          ]} C={C} />
        </View>

        {/* ── Semi-circle gauges ───────────────────────────────────────── */}
        <View style={[s.panel, { backgroundColor: C.surface, borderColor: C.border }]}>
          <SH title="This Month vs. Goal" subtitle="rough monthly targets" C={C} />
          <View style={[s.divider, { backgroundColor: C.border }]} />
          <View style={{ backgroundColor: vizBg, borderRadius: 12, padding: 12 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: 8 }}>
              <SemiGauge value={thisMonthCal}  max={MONTHLY_GOALS.cal}  label="Calories" sublabel="kcal" color={ACCENT.orange} surfaceColor={vizBg} textMuted={C.textSub} borderColor={gaugeTrack} />
              <SemiGauge value={thisMonthPro}  max={MONTHLY_GOALS.pro}  label="Protein"  sublabel="g"    color={ACCENT.green}  surfaceColor={vizBg} textMuted={C.textSub} borderColor={gaugeTrack} />
              <SemiGauge value={thisMonthCarb} max={MONTHLY_GOALS.carb} label="Carbs"    sublabel="g"    color={ACCENT.purple} surfaceColor={vizBg} textMuted={C.textSub} borderColor={gaugeTrack} />
              <SemiGauge value={thisMonthFat}  max={MONTHLY_GOALS.fat}  label="Fat"      sublabel="g"    color={ACCENT.blue}   surfaceColor={vizBg} textMuted={C.textSub} borderColor={gaugeTrack} />
            </View>
          </View>
        </View>

        {/* ── Macro Trends ─────────────────────────────────────────────── */}
        <View style={[s.panel, { backgroundColor: C.surface, borderColor: C.border }]}>
          <SH title="Macro Trends" C={C} />
          <View style={[s.divider, { backgroundColor: C.border }]} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TabBtn label="Weekly"  active={rangeTab === 'weekly'}  color={ACCENT.teal} onPress={() => setRangeTab('weekly')}  C={C} />
            <TabBtn label="Monthly" active={rangeTab === 'monthly'} color={ACCENT.teal} onPress={() => setRangeTab('monthly')} C={C} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {macroTabDef.map(t => (
              <TabBtn key={t.key} label={t.label} active={macroTab === t.key} color={t.color} onPress={() => setMacroTab(t.key)} C={C} />
            ))}
          </ScrollView>
          <AreaChart
            data={rangeTab === 'weekly' ? activeWeeklyData : activeMonthlyData}
            labels={rangeTab === 'weekly' ? weekLabels : monthLabels}
            color={macroColor}
            gradId={`grad_${macroTab}_${rangeTab}`}
            unit={macroUnit}
            gridColor={gridColor}
            textColor={chartTextColor}
            bgColor={vizBg}
          />
        </View>

        {/* ── Stacked Macro Breakdown ───────────────────────────────────── */}
        <View style={[s.panel, { backgroundColor: C.surface, borderColor: C.border }]}>
          <SH title="Macro Breakdown" subtitle="protein · carbs · fat" C={C} />
          <View style={[s.divider, { backgroundColor: C.border }]} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TabBtn label="Weekly"  active={rangeTab === 'weekly'}  color={ACCENT.teal} onPress={() => setRangeTab('weekly')}  C={C} />
            <TabBtn label="Monthly" active={rangeTab === 'monthly'} color={ACCENT.teal} onPress={() => setRangeTab('monthly')} C={C} />
          </View>
          <StackedBars
            data={rangeTab === 'weekly' ? macroStackedWeekly : macroStackedMonthly}
            colors={[ACCENT.green, ACCENT.purple, ACCENT.blue]}
            gridColor={gridColor}
            textColor={chartTextColor}
            bgColor={vizBg}
          />
          <Legend items={[{ color: ACCENT.green, label: 'Protein' }, { color: ACCENT.purple, label: 'Carbs' }, { color: ACCENT.blue, label: 'Fat' }]} textColor={C.textMid} />
        </View>

        {/* ── Vitamins ─────────────────────────────────────────────────── */}
        {hasVitaminData ? (
          <>
            <View style={[s.panel, { backgroundColor: C.surface, borderColor: C.border }]}>
              <SH title="Vitamin Totals" subtitle="monthly stacked" C={C} />
              <View style={[s.divider, { backgroundColor: C.border }]} />
              <StackedBars
                data={vitStackedMonthly}
                colors={[ACCENT.orange, ACCENT.rose, ACCENT.amber, ACCENT.teal, ACCENT.green]}
                gridColor={gridColor}
                textColor={chartTextColor}
                bgColor={vizBg}
              />
              <Legend items={[
                { color: ACCENT.orange, label: 'Vit C (mg)' }, { color: ACCENT.rose, label: 'Vit D (μg)' },
                { color: ACCENT.amber, label: 'Vit A (μg)' },  { color: ACCENT.teal, label: 'Vit E (mg)' },
                { color: ACCENT.green, label: 'Vit K (μg)' },
              ]} textColor={C.textMid} />
            </View>

            {vitDonutSlices.length > 1 && (
              <View style={[s.panel, { backgroundColor: C.surface, borderColor: C.border }]}>
                <SH title="Vitamin Distribution" subtitle={`${monthLabels[vitMonthIdx]} — most recent`} C={C} />
                <View style={[s.divider, { backgroundColor: C.border }]} />
                <View style={{ backgroundColor: vizBg, borderRadius: 12, padding: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                    <DonutChart slices={vitDonutSlices} size={150} surfaceColor={vizBg} textPrime={C.textPrime} textMuted={C.textSub} />
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
              </View>
            )}

            {mVitC.some(v => v > 0) && (
              <View style={[s.panel, { backgroundColor: C.surface, borderColor: C.border }]}>
                <SH title="Vitamin C Trend" subtitle="monthly total (mg)" C={C} />
                <View style={[s.divider, { backgroundColor: C.border }]} />
                <AreaChart data={mVitC} labels={monthLabels} color={ACCENT.orange} gradId="gVitC" unit="mg" gridColor={gridColor} textColor={chartTextColor} bgColor={vizBg} />
              </View>
            )}
            {mVitD.some(v => v > 0) && (
              <View style={[s.panel, { backgroundColor: C.surface, borderColor: C.border }]}>
                <SH title="Vitamin D Trend" subtitle="monthly total (μg)" C={C} />
                <View style={[s.divider, { backgroundColor: C.border }]} />
                <AreaChart data={mVitD} labels={monthLabels} color={ACCENT.rose} gradId="gVitD" unit="μg" gridColor={gridColor} textColor={chartTextColor} bgColor={vizBg} />
              </View>
            )}
            {mVitA.some(v => v > 0) && (
              <View style={[s.panel, { backgroundColor: C.surface, borderColor: C.border }]}>
                <SH title="Vitamin A Trend" subtitle="monthly total (μg)" C={C} />
                <View style={[s.divider, { backgroundColor: C.border }]} />
                <AreaChart data={mVitA} labels={monthLabels} color={ACCENT.amber} gradId="gVitA" unit="μg" gridColor={gridColor} textColor={chartTextColor} bgColor={vizBg} />
              </View>
            )}
            {(mVitB6.some(v => v > 0) || mVitB12.some(v => v > 0)) && (
              <View style={[s.panel, { backgroundColor: C.surface, borderColor: C.border }]}>
                <SH title="B Vitamins" subtitle="B6 (mg) · B12 (μg) monthly" C={C} />
                <View style={[s.divider, { backgroundColor: C.border }]} />
                {mVitB6.some(v => v > 0) && (
                  <AreaChart data={mVitB6} labels={monthLabels} color={ACCENT.purple} gradId="gVitB6" unit="mg" height={130} gridColor={gridColor} textColor={chartTextColor} bgColor={vizBg} />
                )}
                {mVitB12.some(v => v > 0) && (
                  <AreaChart data={mVitB12} labels={monthLabels} color={ACCENT.blue} gradId="gVitB12" unit="μg" height={130} gridColor={gridColor} textColor={chartTextColor} bgColor={vizBg} />
                )}
                <Legend items={[
                  ...(mVitB6.some(v => v > 0)  ? [{ color: ACCENT.purple, label: 'B6'  }] : []),
                  ...(mVitB12.some(v => v > 0) ? [{ color: ACCENT.blue,   label: 'B12' }] : []),
                ]} textColor={C.textMid} />
              </View>
            )}
          </>
        ) : (
          <View style={[s.panel, { backgroundColor: C.surface, borderColor: C.border, alignItems: 'center', gap: 6 }]}>
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerLogo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerDot: { width: 8, height: 8, borderRadius: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.4 },
  headerSub: { fontSize: 12 },
  themeToggle: { width: 32, height: 32, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 60, gap: 20 },
  panel: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 14 },
  divider: { height: 1, marginHorizontal: -18 },
})
