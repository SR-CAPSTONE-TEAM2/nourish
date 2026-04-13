import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { UserProfile, Meal, Metric } from '@/types/types';
import { LineChart, BarChart } from 'react-native-chart-kit';
import AddMealModal from '../../(modals)/addmealmodal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserDiet } from '@/hooks/useUserDiet';
import { AVAILABLE_MEAL_TYPES } from '@/types/diets-meals';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/theme-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 80;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduleEntry {
  id: string;
  scheduled_date: string;
  meal_type: string;
  meal_id: string | null;
  scheduled_time: string;
  user_meals: {
    meal_name: string | null;
    meal_type: string | null;
    meal_image: string | null;
    total_calories: number | null;
    total_protein: number | null;
    total_carbs: number | null;
    total_fat: number | null;
  } | null;
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

function groupMealsByMonth(meals: Meal[]) {
  const map: Record<string, number> = {};
  meals.forEach(m => {
    const dateStr = (m as any).logged_date ?? m.meal_date;
    if (!dateStr) return;
    const [, monthStr] = dateStr.split('-');
    const key = MONTHS[parseInt(monthStr, 10) - 1];
    map[key] = (map[key] ?? 0) + (m.total_calories ?? 0);
  });
  return MONTHS.map(month => ({ month, calories: Math.round(map[month] ?? 0) }));
}

function groupMetricsByMonth(metrics: Metric[], field: keyof Metric) {
  const map: Record<string, number[]> = {};
  metrics.forEach(m => {
    const [, monthStr] = m.observation_date.split('-');
    const key = MONTHS[parseInt(monthStr, 10) - 1];
    if (!map[key]) map[key] = [];
    const val = m[field];
    if (typeof val === 'number') map[key].push(val);
  });
  return MONTHS.map(month => ({
    month,
    value: map[month]?.length
      ? Math.round((map[month].reduce((a, b) => a + b, 0) / map[month].length) * 10) / 10
      : 0,
  }));
}

function getLatestMetric(metrics: Metric[], field: keyof Metric): string {
  if (!metrics.length) return '—';
  const sorted = [...metrics].sort(
    (a, b) => new Date(b.observation_date).getTime() - new Date(a.observation_date).getTime(),
  );
  const val = sorted[0][field];
  return val != null ? String(val) : '—';
}

function getTotalCaloriesToday(meals: Meal[]): number {
  const todayStr = new Date().toISOString().split('T')[0];
  return meals
    .filter(m => (m as any).logged_date?.startsWith(todayStr) ?? m.meal_date?.startsWith(todayStr))
    .reduce((sum, m) => sum + (m.total_calories ?? 0), 0);
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// ─── Meal type helpers ────────────────────────────────────────────────────────

const _FALLBACK_COLORS = ['#fbbf24', '#34d399', '#60a5fa', '#f97316', '#a78bfa', '#fb7185', '#38bdf8', '#4ade80'];

function getMealTypeColor(key: string): string {
  const k = key.toLowerCase();
  const idx = AVAILABLE_MEAL_TYPES.findIndex(m => m.key === k);
  const mt = idx >= 0 ? AVAILABLE_MEAL_TYPES[idx] : null;
  if ((mt as any)?.color) return (mt as any).color;
  return _FALLBACK_COLORS[idx >= 0 ? idx % _FALLBACK_COLORS.length : Math.abs(k.charCodeAt(0)) % _FALLBACK_COLORS.length];
}

function getMealTypeIcon(key: string): string {
  const mt = AVAILABLE_MEAL_TYPES.find(m => m.key === key.toLowerCase());
  return mt?.icon ?? 'restaurant-outline';
}

function getMealTypeLabel(key: string): string {
  const mt = AVAILABLE_MEAL_TYPES.find(m => m.key === key.toLowerCase());
  return mt?.label ?? (key.charAt(0).toUpperCase() + key.slice(1));
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, unit, color, icon, C }: {
  label: string; value: string; unit?: string; color: string; icon: string;
  C: Record<string, string>;
}) {
  return (
    <View style={[styles.statCard, { borderTopColor: color, backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={styles.statCardTop}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={[styles.statLabel, { color: C.textSub }]}>{label}</Text>
      </View>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        {unit && <Text style={[styles.statUnit, { color: C.textSub }]}>{unit}</Text>}
      </View>
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, C }: { title: string; subtitle?: string; C: Record<string, string> }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: C.textPrime }]}>{title}</Text>
      {subtitle && <Text style={[styles.sectionSubtitle, { color: C.textSub }]}>{subtitle}</Text>}
    </View>
  );
}

// ─── Meal Row ─────────────────────────────────────────────────────────────────

function MealRow({ meal, C }: { meal: Meal; C: Record<string, string> }) {
  const type = (meal.meal_type ?? 'meal').toLowerCase();
  const accent = getMealTypeColor(type);
  return (
    <View style={[styles.mealRow, { backgroundColor: C.surfaceHi, borderColor: C.borderHi }]}>
      <View style={[styles.mealDot, { backgroundColor: accent }]} />
      <View style={styles.mealInfo}>
        <Text style={[styles.mealType, { color: C.textPrime }]}>{meal.meal_type ?? 'Meal'}</Text>
        <Text style={[styles.mealDate, { color: C.textSub }]}>
          {new Date((meal as any).logged_date ?? meal.meal_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      </View>
      <View style={styles.mealRight}>
        {meal.meal_rating != null && (
          <Text style={styles.mealRating}>{'★'.repeat(meal.meal_rating)}{'☆'.repeat(5 - meal.meal_rating)}</Text>
        )}
        <View style={[styles.calorieBadge, { backgroundColor: accent + '18', borderColor: accent + '44' }]}>
          <Text style={[styles.calorieBadgeText, { color: accent }]}>
            {meal.total_calories ? `${meal.total_calories} kcal` : '—'}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────

function TabButton({ label, active, color, onPress, C }: {
  label: string; active: boolean; color: string; onPress: () => void; C: Record<string, string>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tab, { backgroundColor: C.surfaceHi }, active && { backgroundColor: color + '18', borderColor: color + '55' }]}
      activeOpacity={0.7}
    >
      <Text style={[styles.tabText, { color: C.textSub }, active && { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Today's Schedule Components ──────────────────────────────────────────────

function NextMealCard({ entry, C, isDark, onLog, isLogged }: {
  entry: ScheduleEntry; C: Record<string, string>; isDark: boolean;
  onLog: () => Promise<void>; isLogged: boolean;
}) {
  const [logging, setLogging] = React.useState(false);
  const type = entry.meal_type.toLowerCase();
  const accent = getMealTypeColor(type);
  const icon = getMealTypeIcon(type);
  const label = getMealTypeLabel(type);
  const meal = entry.user_meals;
  const mealName = meal?.meal_name ?? meal?.meal_type ?? 'Unplanned meal';

  const handleLog = async () => {
    if (isLogged || logging) return;
    setLogging(true);
    await onLog();
    setLogging(false);
  };

  return (
    <View style={[nextStyles.card, { backgroundColor: isDark ? '#1A1A2E' : '#F9F5FF', borderColor: accent + '44' }]}>
      <View style={nextStyles.pill}>
        <View style={[nextStyles.pillDot, { backgroundColor: accent }]} />
        <Text style={[nextStyles.pillText, { color: accent }]}>Next Up</Text>
      </View>

      <View style={nextStyles.row}>
        {meal?.meal_image ? (
          <Image source={{ uri: meal.meal_image }} style={nextStyles.image} contentFit="cover" />
        ) : (
          <View style={[nextStyles.imagePlaceholder, { backgroundColor: accent + '22' }]}>
            <Ionicons name={icon as any} size={28} color={accent} />
          </View>
        )}
        <View style={nextStyles.info}>
          <View style={nextStyles.typeRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name={icon as any} size={12} color={accent} />
              <Text style={[nextStyles.typeLabel, { color: accent }]}>{label}</Text>
            </View>
            <View style={[nextStyles.timeBadge, { backgroundColor: accent + '18', borderColor: accent + '33' }]}>
              <Ionicons name="time-outline" size={10} color={accent} />
              <Text style={[nextStyles.timeText, { color: accent }]}>{formatTime(entry.scheduled_time)}</Text>
            </View>
          </View>
          <Text style={[nextStyles.mealName, { color: C.textPrime }]} numberOfLines={2}>{mealName}</Text>
          {meal?.total_calories != null && (
            <View style={nextStyles.macrosRow}>
              <Text style={[nextStyles.macro, { color: '#f97316' }]}>{meal.total_calories} kcal</Text>
              {meal.total_protein != null && <Text style={[nextStyles.macro, { color: '#34d399' }]}>P:{meal.total_protein}g</Text>}
              {meal.total_carbs != null && <Text style={[nextStyles.macro, { color: '#a78bfa' }]}>C:{meal.total_carbs}g</Text>}
              {meal.total_fat != null && <Text style={[nextStyles.macro, { color: '#60a5fa' }]}>F:{meal.total_fat}g</Text>}
            </View>
          )}
        </View>
      </View>

      {/* Log button */}
      <TouchableOpacity
        onPress={handleLog}
        disabled={isLogged || logging}
        activeOpacity={0.75}
        style={[
          nextStyles.logBtn,
          isLogged
            ? { backgroundColor: '#34d39918', borderColor: '#34d39944' }
            : { backgroundColor: accent + '18', borderColor: accent + '44' },
        ]}
      >
        {logging ? (
          <ActivityIndicator size="small" color={accent} />
        ) : (
          <>
            <Ionicons
              name={isLogged ? 'checkmark-circle' : 'add-circle-outline'}
              size={16}
              color={isLogged ? '#34d399' : accent}
            />
            <Text style={[nextStyles.logBtnText, { color: isLogged ? '#34d399' : accent }]}>
              {isLogged ? 'Logged today' : 'Log this meal'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

function LaterTodayRow({ entry, C }: { entry: ScheduleEntry; C: Record<string, string> }) {
  const type = entry.meal_type.toLowerCase();
  const accent = getMealTypeColor(type);
  const icon = getMealTypeIcon(type);
  const label = getMealTypeLabel(type);
  const mealName = entry.user_meals?.meal_name ?? entry.user_meals?.meal_type ?? 'Unplanned';
  const cals = entry.user_meals?.total_calories;

  return (
    <View style={[laterStyles.row, { borderColor: C.borderHi }]}>
      <View style={[laterStyles.dot, { backgroundColor: accent }]} />
      <Text style={[laterStyles.time, { color: C.textSub }]}>{formatTime(entry.scheduled_time)}</Text>
      <Ionicons name={icon as any} size={14} color={accent} />
      <Text style={[laterStyles.type, { color: C.textMid }]}>{label}</Text>
      <Text style={[laterStyles.name, { color: C.textPrime }]} numberOfLines={1}>{mealName}</Text>
      {cals != null && <Text style={[laterStyles.cals, { color: accent }]}>{cals} kcal</Text>}
    </View>
  );
}

function TodaySchedulePanel({ schedule, onGoToSchedule, onLogMeal, isMealLogged, C, isDark }: {
  schedule: ScheduleEntry[];
  onGoToSchedule: () => void;
  onLogMeal: (entry: ScheduleEntry) => Promise<void>;
  isMealLogged: (entry: ScheduleEntry) => boolean;
  C: Record<string, string>;
  isDark: boolean;
}) {
  if (schedule.length === 0) {
    return (
      <TouchableOpacity onPress={onGoToSchedule} style={[nextStyles.empty, { borderColor: C.border }]} activeOpacity={0.7}>
        <Ionicons name="calendar-outline" size={24} color={C.textSub} />
        <Text style={[nextStyles.emptyText, { color: C.textSub }]}>No meals scheduled for today</Text>
        <Text style={[nextStyles.emptyHint, { color: C.orange }]}>Tap to set up your schedule →</Text>
      </TouchableOpacity>
    );
  }

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const upcoming = schedule.filter(e => timeToMinutes(e.scheduled_time) >= nowMinutes);
  const nextMeal = upcoming[0] ?? schedule[schedule.length - 1];
  const later = upcoming.slice(1);

  return (
    <View style={{ gap: 10 }}>
      <NextMealCard
        entry={nextMeal}
        C={C}
        isDark={isDark}
        onLog={() => onLogMeal(nextMeal)}
        isLogged={isMealLogged(nextMeal)}
      />
      {later.length > 0 && (
        <View style={[laterStyles.container, { backgroundColor: C.surfaceHi, borderColor: C.borderHi }]}>
          <Text style={[laterStyles.header, { color: C.textSub }]}>LATER TODAY</Text>
          {later.map(entry => <LaterTodayRow key={entry.id} entry={entry} C={C} />)}
        </View>
      )}
    </View>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeDiet } = useUserDiet();
  const { isDark, colors, setThemeMode } = useTheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const userIdRef = React.useRef<string | null>(null); // always-current ref, avoids stale closures
  const [activeTab, setActiveTab] = useState<'calories' | 'weight' | 'protein' | 'macros'>('calories');
  const [showAddMeal, setShowAddMeal] = useState(false);

  const C = {
    bg: colors.background,
    surface: colors.card,
    surfaceHi: colors.surfaceHighlight,
    border: colors.border,
    borderHi: colors.borderHighlight,
    textPrime: colors.text,
    textSub: colors.textMuted,
    textMid: colors.textSecondary,
    orange: '#f97316',
    blue: '#60a5fa',
    green: '#34d399',
    purple: '#8B5CF6',
    rose: '#fb7185',
    amber: '#fbbf24',
  };

  // ─── Data fetchers ──────────────────────────────────────────────────────────

  const refreshMeals = async (uid?: string) => {
    const id = uid ?? userIdRef.current;
    if (!id) return;
    // Sort descending so newest meals are always within Supabase's 1000-row default limit.
    // Filter to last 365 days to keep chart data meaningful without hitting the row cap.
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const cutoff = oneYearAgo.toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', id)
      .gte('logged_date', cutoff)
      .order('logged_date', { ascending: false });
    if (!error && data) setMeals(data as any);
  };

  const refreshTodaySchedule = async (uid: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('meal_schedule')
      .select(`
        id, scheduled_date, meal_type, meal_id, scheduled_time,
        user_meals (
          meal_name, meal_type, meal_image,
          total_calories, total_protein, total_carbs, total_fat
        )
      `)
      .eq('user_id', uid)
      .eq('scheduled_date', todayStr)
      .order('scheduled_time', { ascending: true });
    if (!error && data) setTodaySchedule(data as any);
  };

  // ─── Initial load ───────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      setUserId(user.id);
      userIdRef.current = user.id;

      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const mealsCutoff = oneYearAgo.toISOString().split('T')[0];

      const [{ data: prof }, { data: mealData }, { data: metricData }] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('meal_logs').select('*').eq('user_id', user.id).gte('logged_date', mealsCutoff).order('logged_date', { ascending: false }),
        supabase.from('user_metrics').select('*').eq('user_id', user.id).order('observation_date', { ascending: true }),
      ]);

      if (prof) setProfile(prof);
      if (metricData) setMetrics(metricData);
      if (mealData) setMeals(mealData);
      await refreshTodaySchedule(user.id);
      setLoading(false);
    };
    load();
  }, []);

  // Re-fetch both schedule and meals on every screen focus
  // (covers back-nav, app reload, and any remount scenario)
  useFocusEffect(
    React.useCallback(() => {
      supabase.auth.getUser().then(({ data }) => {
        if (!data.user) return;
        refreshTodaySchedule(data.user.id);
        refreshMeals(data.user.id);
      });
    }, []),
  );

  // ─── Meal logging ───────────────────────────────────────────────────────────

  const logScheduledMeal = async (entry: ScheduleEntry): Promise<void> => {
    const uid = userIdRef.current;
    if (!uid) return;
    const meal = entry.user_meals;
    const today = new Date().toISOString().split('T')[0];

    // Optimistic update — UI responds instantly
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMeal = {
      meal_id: optimisticId,
      id: optimisticId,
      user_id: uid,
      meal_type: entry.meal_type,
      logged_date: today,
      total_calories: meal?.total_calories ?? null,
      total_protein: meal?.total_protein ?? null,
      total_carbs: meal?.total_carbs ?? null,
      total_fat: meal?.total_fat ?? null,
    } as any;
    setMeals(prev => [...prev, optimisticMeal]);

    const { data: newMeal, error } = await supabase
      .from('meal_logs')
      .insert({
        user_id: uid,
        meal_type: entry.meal_type,
        meal_name: meal?.meal_name ?? entry.meal_type,
        logged_date: today,
        total_calories: meal?.total_calories ?? null,
        total_protein: meal?.total_protein ?? null,
        total_carbs: meal?.total_carbs ?? null,
        total_fat: meal?.total_fat ?? null,
        meal_image: meal?.meal_image ?? null,
      })
      .select()
      .single();

    if (error || !newMeal) {
      // Roll back optimistic entry and surface the error
      setMeals(prev => prev.filter(m => m.meal_id !== optimisticId));
      Alert.alert('Could not log meal', error?.message ?? 'Insert returned no data');
    } else {
      // Swap the optimistic placeholder for the confirmed DB row
      setMeals(prev => [...prev.filter(m => m.meal_id !== optimisticId), newMeal]);
    }
  };

  const isMealLoggedToday = (entry: ScheduleEntry): boolean => {
    const todayStr = new Date().toISOString().split('T')[0];
    return meals.some(m => {
      const dateStr = (m as any).logged_date ?? m.meal_date ?? '';
      return String(dateStr).startsWith(todayStr) &&
        String(m.meal_type ?? '').toLowerCase() === entry.meal_type.toLowerCase();
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  // ─── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color={C.orange} />
        <Text style={[styles.loadingText, { color: C.textSub }]}>Loading your dashboard…</Text>
      </View>
    );
  }

  // ─── Derived data ───────────────────────────────────────────────────────────

  const calorieData = groupMealsByMonth(meals);
  const weightData = groupMetricsByMonth(metrics, 'weight');
  const proteinData = groupMetricsByMonth(metrics, 'protein');

  const toChartData = (data: { month: string; calories?: number; value?: number }[], key: 'calories' | 'value') => ({
    labels: data.map(d => d.month),
    datasets: [{ data: data.map(d => (d as any)[key] ?? 0) }],
  });

  const baseChartConfig = {
    backgroundGradientFrom: C.surfaceHi,
    backgroundGradientTo: C.surfaceHi,
    decimalPlaces: 0,
    color: (opacity = 1) => isDark ? `rgba(242,242,242,${opacity})` : `rgba(30,30,30,${opacity})`,
    labelColor: (opacity = 1) => isDark ? `rgba(90,90,90,${opacity})` : `rgba(100,100,100,${opacity})`,
    propsForBackgroundLines: { stroke: isDark ? '#1f1f1f' : '#E5E5E7' },
    propsForDots: { r: '3', strokeWidth: '0' },
  };

  const macrosData = {
    labels: MONTHS,
    datasets: [
      {
        data: MONTHS.map(month => {
          const mm = metrics.filter(m => MONTHS[new Date(m.observation_date).getMonth()] === month);
          const v = mm.map(m => m.protein).filter(Boolean) as number[];
          return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
        }),
        color: () => C.green, strokeWidth: 2,
      },
      {
        data: MONTHS.map(month => {
          const mm = metrics.filter(m => MONTHS[new Date(m.observation_date).getMonth()] === month);
          const v = mm.map(m => m.carbs).filter(Boolean) as number[];
          return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
        }),
        color: () => C.purple, strokeWidth: 2,
      },
      {
        data: MONTHS.map(month => {
          const mm = metrics.filter(m => MONTHS[new Date(m.observation_date).getMonth()] === month);
          const v = mm.map(m => m.sugar).filter(Boolean) as number[];
          return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
        }),
        color: () => C.rose, strokeWidth: 2,
      },
    ],
    legend: ['Protein', 'Carbs', 'Sugar'],
  };

  const tabs = [
    { key: 'calories' as const, label: 'Calories', color: C.orange },
    { key: 'weight' as const, label: 'Weight', color: C.blue },
    { key: 'protein' as const, label: 'Protein', color: C.green },
    { key: 'macros' as const, label: 'Macros', color: C.purple },
  ];

  const recentMeals = [...meals]
    .sort((a, b) => {
      const da = (a as any).logged_date ?? a.meal_date;
      const db = (b as any).logged_date ?? b.meal_date;
      return new Date(db).getTime() - new Date(da).getTime();
    })
    .slice(0, 5);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={{ paddingTop: insets.top, flex: 1, backgroundColor: C.bg }}>

      {/* ── Nav Bar ─────────────────────────────────────────────────────── */}
      <View style={[styles.nav, { backgroundColor: C.bg, borderBottomColor: C.border }]}>
        <View style={styles.navLogoWrap}>
          <View style={styles.navLogoDot} />
          <Text style={[styles.navLogo, { color: C.textPrime }]}>nourish</Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddMeal(true)} activeOpacity={0.82}>
          <Text style={styles.addBtnPlus}>+</Text>
          <Text style={styles.addBtnLabel}>Log Meal</Text>
        </TouchableOpacity>

        <View style={styles.navRight}>
          <TouchableOpacity
            onPress={() => setThemeMode(isDark ? 'light' : 'dark')}
            style={[styles.themeToggle, { backgroundColor: C.surfaceHi, borderColor: C.borderHi }]}
            activeOpacity={0.7}
          >
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color={isDark ? '#fbbf24' : '#6B6B8A'} />
          </TouchableOpacity>
          <View style={[styles.avatar, { backgroundColor: C.surfaceHi, borderColor: C.borderHi }]}>
            <Text style={[styles.avatarText, { color: C.textMid }]}>{profile?.first_name?.[0] ?? '?'}</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={[styles.signOutBtn, { borderColor: C.border }]}>
            <Text style={[styles.signOutText, { color: C.textSub }]}>Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scrollable content ──────────────────────────────────────────── */}
      <ScrollView style={[styles.scroll, { backgroundColor: C.bg }]} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Greeting */}
        <View style={styles.greetingBlock}>
          <Text style={[styles.greetingSub, { color: C.textSub }]}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          <Text style={[styles.greetingTitle, { color: C.textPrime }]}>
            {greeting},{' '}
            <Text style={styles.greetingName}>{profile?.first_name ?? profile?.username ?? 'there'}</Text>{' '}👋
          </Text>
        </View>

        {/* ── Stat Cards ─────────────────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll} contentContainerStyle={styles.statsScrollContent}>
          <StatCard label="Today's Calories" value={String(getTotalCaloriesToday(meals))} unit="kcal" color={C.orange} icon="🔥" C={C} />
          <StatCard label="Current Weight" value={getLatestMetric(metrics, 'weight')} unit="lbs" color={C.blue} icon="⚖️" C={C} />
          <StatCard label="Latest Protein" value={getLatestMetric(metrics, 'protein')} unit="g" color={C.green} icon="💪" C={C} />
          <StatCard label="Latest Carbs" value={getLatestMetric(metrics, 'carbs')} unit="g" color={C.purple} icon="🌾" C={C} />
          <StatCard label="Total Meals" value={String(meals.length)} color={C.rose} icon="🍽️" C={C} />
        </ScrollView>

        {/* ── Chart Panel ────────────────────────────────────────────────── */}
        <View style={[styles.panel, { backgroundColor: C.surface, borderColor: C.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
            {tabs.map(t => (
              <TabButton key={t.key} label={t.label} active={activeTab === t.key} color={t.color} onPress={() => setActiveTab(t.key)} C={C} />
            ))}
          </ScrollView>

          <View style={[styles.panelDivider, { backgroundColor: C.border }]} />

          <Text style={[styles.chartSubtitle, { color: C.textSub }]}>
            {activeTab === 'calories' && 'Total calories from meals — monthly overview'}
            {activeTab === 'weight' && 'Average body weight per month'}
            {activeTab === 'protein' && 'Average daily protein intake per month'}
            {activeTab === 'macros' && 'Protein · Carbs · Sugar — monthly averages'}
          </Text>

          {activeTab === 'calories' && (
            <LineChart data={toChartData(calorieData, 'calories')} width={CHART_WIDTH} height={200}
              chartConfig={{ ...baseChartConfig, color: (o = 1) => `rgba(249,115,22,${o})`, fillShadowGradientFrom: C.orange, fillShadowGradientTo: C.surfaceHi, fillShadowGradientFromOpacity: 0.28, fillShadowGradientToOpacity: 0 }}
              bezier style={styles.chart} />
          )}
          {activeTab === 'weight' && (
            <LineChart data={toChartData(weightData, 'value')} width={CHART_WIDTH} height={200}
              chartConfig={{ ...baseChartConfig, color: (o = 1) => `rgba(96,165,250,${o})`, fillShadowGradientFrom: C.blue, fillShadowGradientTo: C.surfaceHi, fillShadowGradientFromOpacity: 0.28, fillShadowGradientToOpacity: 0 }}
              bezier style={styles.chart} />
          )}
          {activeTab === 'protein' && (
            <BarChart data={toChartData(proteinData, 'value')} width={CHART_WIDTH} height={200}
              yAxisLabel="" yAxisSuffix="g"
              chartConfig={{ ...baseChartConfig, color: (o = 1) => `rgba(52,211,153,${o})` }}
              style={styles.chart} />
          )}
          {activeTab === 'macros' && (
            <>
              <LineChart data={macrosData} width={CHART_WIDTH} height={200} chartConfig={baseChartConfig} bezier withDots={false} style={styles.chart} />
              <View style={styles.legendRow}>
                {([[C.green, 'Protein'], [C.purple, 'Carbs'], [C.rose, 'Sugar']] as [string, string][]).map(([color, lbl]) => (
                  <View key={lbl} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: color }]} />
                    <Text style={[styles.legendText, { color: C.textMid }]}>{lbl}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* ── Active Diet Panel ──────────────────────────────────────────── */}
        <View style={[styles.panel, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 11, color: C.textSub, textTransform: 'uppercase', letterSpacing: 1 }}>Active Diet</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: C.textPrime, flex: 1 }} numberOfLines={1}>
                {activeDiet?.diet_name ?? 'No diet selected'}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(protected)/(pages)/journal/diets')}
                style={[dietStyles.headerBtn, { backgroundColor: C.surfaceHi, borderColor: C.borderHi }]}
              >
                <Ionicons name="swap-horizontal" size={13} color={C.orange} />
                <Text style={[dietStyles.headerBtnText, { color: C.orange }]}>Switch</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/(protected)/(pages)/dashboard/meal-schedule')}
                style={[dietStyles.headerBtn, { backgroundColor: C.purple + '18', borderColor: C.purple + '44' }]}
              >
                <Ionicons name="calendar-outline" size={13} color={C.purple} />
                <Text style={[dietStyles.headerBtnText, { color: C.purple }]}>Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.panelDivider, { backgroundColor: C.border }]} />

          {!activeDiet ? (
            <TouchableOpacity
              onPress={() => router.push('/(protected)/(pages)/journal/diets')}
              style={{ paddingVertical: 20, alignItems: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: C.border, borderRadius: 12 }}
            >
              <Text style={{ fontSize: 13, color: C.textSub }}>Tap to select or create a diet plan</Text>
            </TouchableOpacity>
          ) : (
            <TodaySchedulePanel
              schedule={todaySchedule}
              onGoToSchedule={() => router.push('/(protected)/(pages)/dashboard/meal-schedule')}
              onLogMeal={logScheduledMeal}
              isMealLogged={isMealLoggedToday}
              C={C}
              isDark={isDark}
            />
          )}
        </View>

        {/* ── Recent Meals ───────────────────────────────────────────────── */}
        <View style={[styles.panel, { backgroundColor: C.surface, borderColor: C.border }]}>
          <SectionHeader title="Logged Meals" subtitle={`${recentMeals.length} of ${meals.length} total`} C={C} />
          <View style={[styles.panelDivider, { backgroundColor: C.border }]} />
          {recentMeals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🍽️</Text>
              <Text style={[styles.emptyStateText, { color: C.textMid }]}>No meals logged yet.</Text>
              <Text style={[styles.emptyStateHint, { color: C.textSub }]}>Tap + Log Meal to get started.</Text>
            </View>
          ) : (
            <View style={styles.mealList}>
              {recentMeals.map(meal => <MealRow key={(meal as any).id ?? meal.meal_id} meal={meal} C={C} />)}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Modal ───────────────────────────────────────────────────────── */}
      <AddMealModal
        visible={showAddMeal}
        onClose={() => setShowAddMeal(false)}
        onSuccess={() => refreshMeals()}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { fontSize: 14 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 14, borderBottomWidth: 1 },
  navLogoWrap: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  navLogoDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f97316' },
  navLogo: { fontSize: 18, fontWeight: '700', letterSpacing: -0.5 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f97316', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 9, shadowColor: '#f97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  addBtnPlus: { color: '#fff', fontSize: 20, fontWeight: '300', lineHeight: 22, marginTop: -1 },
  addBtnLabel: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  navRight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10 },
  themeToggle: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700' },
  signOutBtn: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 6 },
  signOutText: { fontSize: 12, fontWeight: '500' as const },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60, gap: 24 },
  greetingBlock: { gap: 4, paddingTop: 8 },
  greetingSub: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 },
  greetingTitle: { fontSize: 26, fontWeight: '700', lineHeight: 34 },
  greetingName: { color: '#f97316' },
  statsScroll: { marginHorizontal: -20 },
  statsScrollContent: { paddingHorizontal: 20, gap: 12 },
  statCard: { borderWidth: 1, borderTopWidth: 2, borderRadius: 18, padding: 18, minWidth: 138, gap: 10 },
  statCardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statIcon: { fontSize: 14 },
  statLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, flex: 1 },
  statValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  statValue: { fontSize: 28, fontWeight: '700', lineHeight: 32 },
  statUnit: { fontSize: 12, marginBottom: 3 },
  panel: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 14 },
  panelDivider: { height: 1, marginHorizontal: -18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  sectionSubtitle: { fontSize: 12 },
  tabRow: { gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  tabText: { fontSize: 13, fontWeight: '600' },
  chartSubtitle: { fontSize: 12, marginBottom: 4 },
  chart: { borderRadius: 12, marginLeft: -10 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12 },
  mealList: { gap: 8 },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 13, borderWidth: 1 },
  mealDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  mealInfo: { flex: 1, gap: 2 },
  mealType: { fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  mealDate: { fontSize: 11 },
  mealRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealRating: { fontSize: 11, color: '#fbbf24' },
  calorieBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  calorieBadgeText: { fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  emptyStateIcon: { fontSize: 32 },
  emptyStateText: { fontSize: 15, fontWeight: '600' },
  emptyStateHint: { fontSize: 13 },
});

const dietStyles = StyleSheet.create({
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  headerBtnText: { fontSize: 11, fontWeight: '600' },
});

const nextStyles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 12 },
  image: { width: 80, height: 80, borderRadius: 12 },
  imagePlaceholder: { width: 80, height: 80, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 5 },
  typeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeLabel: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  timeBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1 },
  timeText: { fontSize: 10, fontWeight: '600' },
  mealName: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  macrosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  macro: { fontSize: 11, fontWeight: '500' },
  logBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderRadius: 12, paddingVertical: 10 },
  logBtnText: { fontSize: 13, fontWeight: '700' },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 28, alignItems: 'center', gap: 6 },
  emptyText: { fontSize: 13 },
  emptyHint: { fontSize: 12, fontWeight: '600' },
});

const laterStyles = StyleSheet.create({
  container: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 8 },
  header: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  time: { fontSize: 11, fontWeight: '500', width: 60 },
  type: { fontSize: 12, width: 56 },
  name: { flex: 1, fontSize: 13, fontWeight: '500' },
  cals: { fontSize: 11, fontWeight: '600' },
});
