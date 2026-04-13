import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, FlatList, ActivityIndicator, Platform, Pressable, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { useUserDiet } from '@/hooks/useUserDiet';
import { useTheme } from '@/context/theme-context';
import { AVAILABLE_MEAL_TYPES, TemplateMeal } from '@/types/diets-meals';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduleEntry {
  id?: string;
  user_id: string;
  diet_id: string;
  scheduled_date: string; // YYYY-MM-DD
  meal_type: string;
  meal_id: string | null;
  scheduled_time: string; // HH:MM (24h)
}

interface DietMealOption {
  id: string;          // diet_meals.id (row id)
  meal_id: string;
  name: string;
  meal_type: string;
  meal_image: string | null;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// ─── Meal type helpers (derived from AVAILABLE_MEAL_TYPES) ───────────────────

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
  return mt?.icon ?? '🍽️';
}

function getMealTypeLabel(key: string): string {
  const mt = AVAILABLE_MEAL_TYPES.find(m => m.key === key.toLowerCase());
  return mt?.label ?? (key.charAt(0).toUpperCase() + key.slice(1));
}

const DEFAULT_TIMES: Record<string, string> = {
  breakfast: '08:00',
  'morning snack': '10:30',
  lunch: '12:30',
  snack: '15:00',
  dinner: '18:30',
  'evening snack': '20:30',
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return d;
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

// Generate time options: 5:00 AM – 11:30 PM in 30-min steps
function generateTimeOptions(): string[] {
  const times: string[] = [];
  for (let h = 5; h <= 23; h++) {
    times.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 23) times.push(`${String(h).padStart(2, '0')}:30`);
  }
  return times;
}
const TIME_OPTIONS = generateTimeOptions();

// ─── Week Strip ───────────────────────────────────────────────────────────────

function WeekStrip({
  weekStart, selectedDate, onSelectDate, onPrevWeek, onNextWeek, C,
}: {
  weekStart: Date;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  C: Record<string, string>;
}) {
  const days = getWeekDays(weekStart);
  const todayStr = toDateString(new Date());
  const selectedStr = toDateString(selectedDate);

  return (
    <View style={weekStyles.container}>
      {/* Month + nav */}
      <View style={weekStyles.header}>
        <TouchableOpacity onPress={onPrevWeek} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={20} color={C.textMid} />
        </TouchableOpacity>
        <Text style={[weekStyles.monthLabel, { color: C.textPrime }]}>
          {MONTH_NAMES[weekStart.getMonth()]} {weekStart.getFullYear()}
        </Text>
        <TouchableOpacity onPress={onNextWeek} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-forward" size={20} color={C.textMid} />
        </TouchableOpacity>
      </View>

      {/* Day cells */}
      <View style={weekStyles.daysRow}>
        {days.map((day, i) => {
          const ds = toDateString(day);
          const isSelected = ds === selectedStr;
          const isToday = ds === todayStr;
          return (
            <TouchableOpacity
              key={ds}
              onPress={() => onSelectDate(day)}
              style={[
                weekStyles.dayCell,
                { borderColor: isSelected ? C.purple : 'transparent' },
                isSelected && { backgroundColor: C.purple + '18' },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[
                weekStyles.dayLabel,
                { color: isSelected ? C.purple : C.textSub },
              ]}>
                {DAY_LABELS[i]}
              </Text>
              <Text style={[
                weekStyles.dayNum,
                { color: isSelected ? C.purple : C.textPrime },
                isSelected && { fontWeight: '800' },
              ]}>
                {day.getDate()}
              </Text>
              {isToday && (
                <View style={[weekStyles.todayDot, { backgroundColor: isSelected ? C.purple : C.orange }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Meal Slot Card ───────────────────────────────────────────────────────────

function MealSlotCard({
  mealType, entry, mealOption, onAssign, onRemove, onTimeEdit, C, isDark,
}: {
  mealType: string;
  entry: ScheduleEntry | undefined;
  mealOption: DietMealOption | undefined;
  onAssign: () => void;
  onRemove: () => void;
  onTimeEdit: () => void;
  C: Record<string, string>;
  isDark: boolean;
}) {
  const accent = getMealTypeColor(mealType);
  const icon = getMealTypeIcon(mealType);
  const time = entry?.scheduled_time ?? DEFAULT_TIMES[mealType] ?? '12:00';
  const label = getMealTypeLabel(mealType);

  return (
    <View style={[slotStyles.card, { backgroundColor: isDark ? '#141425' : '#FAFAFA', borderColor: C.border }]}>
      {/* Header row */}
      <View style={slotStyles.header}>
        <View style={slotStyles.typeGroup}>
          <View style={[slotStyles.iconBadge, { backgroundColor: accent + '20' }]}>
            <Ionicons name={icon as any} size={16} color={accent} />
          </View>
          <Text style={[slotStyles.typeLabel, { color: C.textPrime }]}>{label}</Text>
        </View>
        {/* Time button */}
        <TouchableOpacity
          onPress={onTimeEdit}
          style={[slotStyles.timeBtn, { backgroundColor: accent + '18', borderColor: accent + '33' }]}
          activeOpacity={0.7}
        >
          <Ionicons name="time-outline" size={12} color={accent} />
          <Text style={[slotStyles.timeBtnText, { color: accent }]}>{formatTime12(time)}</Text>
          <Ionicons name="pencil-outline" size={10} color={accent} />
        </TouchableOpacity>
      </View>

      {/* Meal content */}
      {entry?.meal_id && mealOption ? (
        <View style={[slotStyles.assignedCard, { backgroundColor: isDark ? '#1E1E32' : '#ffffff', borderColor: C.borderHi }]}>
          <View style={slotStyles.assignedRow}>
            {mealOption.meal_image ? (
              <Image source={{ uri: mealOption.meal_image }} style={slotStyles.mealImage} contentFit="cover" />
            ) : (
              <View style={[slotStyles.mealImagePlaceholder, { backgroundColor: accent + '22' }]}>
                <Ionicons name={icon as any} size={24} color={accent} />
              </View>
            )}
            <View style={slotStyles.mealDetails}>
              <Text style={[slotStyles.mealName, { color: C.textPrime }]} numberOfLines={2}>
                {mealOption.name}
              </Text>
              <View style={slotStyles.macroRow}>
                <Text style={[slotStyles.macro, { color: '#f97316' }]}>{mealOption.totalCalories} kcal</Text>
                <Text style={[slotStyles.macro, { color: '#34d399' }]}>P:{mealOption.totalProtein}g</Text>
                <Text style={[slotStyles.macro, { color: '#a78bfa' }]}>C:{mealOption.totalCarbs}g</Text>
                <Text style={[slotStyles.macro, { color: '#60a5fa' }]}>F:{mealOption.totalFat}g</Text>
              </View>
            </View>
            <View style={slotStyles.actions}>
              <TouchableOpacity
                onPress={onAssign}
                style={[slotStyles.actionBtn, { backgroundColor: accent + '18', borderColor: accent + '33' }]}
                activeOpacity={0.7}
              >
                <Ionicons name="swap-horizontal-outline" size={14} color={accent} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onRemove}
                style={[slotStyles.actionBtn, { backgroundColor: '#fb718518', borderColor: '#fb718533' }]}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={14} color="#fb7185" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          onPress={onAssign}
          style={[slotStyles.emptySlot, { borderColor: C.border }]}
          activeOpacity={0.7}
        >
          <View style={[slotStyles.addIcon, { backgroundColor: accent + '18', borderColor: accent + '33' }]}>
            <Ionicons name="add" size={18} color={accent} />
          </View>
          <Text style={[slotStyles.emptyText, { color: C.textSub }]}>Assign a meal</Text>
          <Text style={[slotStyles.emptyHint, { color: C.textSub }]}>from your diet plan</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Meal Picker Modal ────────────────────────────────────────────────────────

function MealPickerModal({
  visible, mealType, options, onSelect, onClose, C, isDark,
}: {
  visible: boolean;
  mealType: string;
  options: DietMealOption[];
  onSelect: (option: DietMealOption) => void;
  onClose: () => void;
  C: Record<string, string>;
  isDark: boolean;
}) {
  const accent = getMealTypeColor(mealType);
  const icon = getMealTypeIcon(mealType);
  const label = getMealTypeLabel(mealType);

  // Only show meals belonging to this meal type
  const sorted = useMemo(() => {
    return options.filter(o => o.meal_type.toLowerCase() === mealType.toLowerCase());
  }, [options, mealType]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={pickerStyles.backdrop} onPress={onClose} />
      <View style={[pickerStyles.sheet, { backgroundColor: isDark ? '#0D0D1A' : '#ffffff' }]}>
        {/* Handle */}
        <View style={[pickerStyles.handle, { backgroundColor: isDark ? '#333' : '#ddd' }]} />

        {/* Header */}
        <View style={pickerStyles.sheetHeader}>
          <View style={pickerStyles.headerLeft}>
            <View style={[pickerStyles.iconBadge, { backgroundColor: accent + '20' }]}>
              <Ionicons name={icon as any} size={20} color={accent} />
            </View>
            <View>
              <Text style={[pickerStyles.sheetTitle, { color: C.textPrime }]}>Choose a meal</Text>
              <Text style={[pickerStyles.sheetSubtitle, { color: C.textSub }]}>for {label}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={[pickerStyles.closeBtn, { backgroundColor: C.surfaceHi }]}>
            <Ionicons name="close" size={18} color={C.textMid} />
          </TouchableOpacity>
        </View>

        <View style={[pickerStyles.divider, { backgroundColor: C.border }]} />

        {sorted.length === 0 ? (
          <View style={pickerStyles.empty}>
            <Ionicons name="restaurant-outline" size={32} color={C.textSub} />
            <Text style={[{ color: C.textSub, fontSize: 14, textAlign: 'center' }]}>
              No {label} meals in your diet plan yet.
            </Text>
          </View>
        ) : (
          <FlatList
            data={sorted}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const itemAccent = getMealTypeColor(item.meal_type);
              return (
                <TouchableOpacity
                  onPress={() => onSelect(item)}
                  style={[pickerStyles.optionCard, {
                    backgroundColor: isDark ? '#1A1A2E' : '#F5F5FA',
                    borderColor: C.borderHi,
                  }]}
                  activeOpacity={0.75}
                >
                  <View style={pickerStyles.optionRow}>
                    {item.meal_image ? (
                      <Image source={{ uri: item.meal_image }} style={pickerStyles.optionImage} contentFit="cover" />
                    ) : (
                      <View style={[pickerStyles.optionImagePlaceholder, { backgroundColor: itemAccent + '20' }]}>
                        <Ionicons name={getMealTypeIcon(item.meal_type) as any} size={22} color={itemAccent} />
                      </View>
                    )}
                    <View style={pickerStyles.optionInfo}>
                      <View style={pickerStyles.optionTitleRow}>
                        <Text style={[pickerStyles.optionName, { color: C.textPrime }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View style={[pickerStyles.typePill, { backgroundColor: itemAccent + '18', borderColor: itemAccent + '33' }]}>
                          <Text style={[pickerStyles.typePillText, { color: itemAccent }]}>
                            {getMealTypeLabel(item.meal_type)}
                          </Text>
                        </View>
                      </View>
                      <View style={pickerStyles.optionMacros}>
                        <Text style={[pickerStyles.calText, { color: '#f97316' }]}>{item.totalCalories} kcal</Text>
                        <Text style={[pickerStyles.macroText, { color: '#34d399' }]}>P:{item.totalProtein}g</Text>
                        <Text style={[pickerStyles.macroText, { color: '#a78bfa' }]}>C:{item.totalCarbs}g</Text>
                        <Text style={[pickerStyles.macroText, { color: '#60a5fa' }]}>F:{item.totalFat}g</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={C.textSub} />
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

// ─── Time Picker Modal ────────────────────────────────────────────────────────

function TimePickerModal({
  visible, mealType, currentTime, onSelect, onClose, C, isDark,
}: {
  visible: boolean;
  mealType: string;
  currentTime: string;
  onSelect: (time: string) => void;
  onClose: () => void;
  C: Record<string, string>;
  isDark: boolean;
}) {
  const accent = getMealTypeColor(mealType);
  const label = getMealTypeLabel(mealType);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={pickerStyles.backdrop} onPress={onClose} />
      <View style={[pickerStyles.sheet, { backgroundColor: isDark ? '#0D0D1A' : '#ffffff', maxHeight: 420 }]}>
        <View style={[pickerStyles.handle, { backgroundColor: isDark ? '#333' : '#ddd' }]} />
        <View style={pickerStyles.sheetHeader}>
          <View style={pickerStyles.headerLeft}>
            <Ionicons name="time-outline" size={22} color={accent} />
            <View>
              <Text style={[pickerStyles.sheetTitle, { color: C.textPrime }]}>Set meal time</Text>
              <Text style={[pickerStyles.sheetSubtitle, { color: C.textSub }]}>{label}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={[pickerStyles.closeBtn, { backgroundColor: C.surfaceHi }]}>
            <Ionicons name="close" size={18} color={C.textMid} />
          </TouchableOpacity>
        </View>
        <View style={[pickerStyles.divider, { backgroundColor: C.border }]} />
        <FlatList
          data={TIME_OPTIONS}
          keyExtractor={t => t}
          contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const selected = item === currentTime;
            return (
              <TouchableOpacity
                onPress={() => { onSelect(item); onClose(); }}
                style={[
                  timeStyles.timeRow,
                  { borderColor: selected ? accent : C.border },
                  selected && { backgroundColor: accent + '18' },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[timeStyles.timeText, { color: selected ? accent : C.textMid }]}>
                  {formatTime12(item)}
                </Text>
                {selected && <Ionicons name="checkmark-circle" size={18} color={accent} />}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MealSchedulePage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeDiet } = useUserDiet();
  const { isDark, colors } = useTheme();

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
    purple: '#8B5CF6',
    green: '#34d399',
    blue: '#60a5fa',
    rose: '#fb7185',
  };

  const [userId, setUserId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  });
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));

  // schedule: keyed by "YYYY-MM-DD:meal_type"
  const [entries, setEntries] = useState<Record<string, ScheduleEntry>>({});
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [saving, setSaving] = useState<string | null>(null); // mealType being saved

  // Picker state
  const [mealPickerType, setMealPickerType] = useState<string | null>(null);
  const [timePickerType, setTimePickerType] = useState<string | null>(null);

  // Diet meal options (flat list from activeDiet)
  const dietMealOptions = useMemo<DietMealOption[]>(() => {
    if (!activeDiet?.diet_meals) return [];
    return activeDiet.diet_meals
      .filter(row => row.user_meals)
      .map(row => {
        const m = row.user_meals!;
        return {
          id: row.id,
          meal_id: m.meal_id,
          name: m.meal_name || m.meal_type || 'Meal',
          meal_type: row.meal_type,
          meal_image: m.meal_image ?? null,
          totalCalories: m.total_calories ?? 0,
          totalProtein: m.total_protein ?? 0,
          totalCarbs: m.total_carbs ?? 0,
          totalFat: m.total_fat ?? 0,
        };
      });
  }, [activeDiet]);

  // Meal types from diet structure
  const mealTypes = useMemo(() => {
    if (!activeDiet?.meal_structure) return [];
    return AVAILABLE_MEAL_TYPES.filter(mt => activeDiet.meal_structure.includes(mt.key));
  }, [activeDiet]);

  // Entry key
  const entryKey = (date: Date, mealType: string) =>
    `${toDateString(date)}:${mealType}`;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  // Load schedule for the selected week (fetch the whole week at once)
  const loadWeekSchedule = useCallback(async (uid: string, ws: Date) => {
    setLoadingSchedule(true);
    const days = getWeekDays(ws);
    const from = toDateString(days[0]);
    const to = toDateString(days[6]);

    const { data, error } = await supabase
      .from('meal_schedule')
      .select('*')
      .eq('user_id', uid)
      .gte('scheduled_date', from)
      .lte('scheduled_date', to);

    if (!error && data) {
      const map: Record<string, ScheduleEntry> = {};
      for (const row of data) {
        const k = `${row.scheduled_date}:${row.meal_type}`;
        map[k] = row as ScheduleEntry;
      }
      setEntries(prev => ({ ...prev, ...map }));
    }
    setLoadingSchedule(false);
  }, []);

  useEffect(() => {
    if (userId) loadWeekSchedule(userId, weekStart);
  }, [userId, weekStart]);

  const handlePrevWeek = () => {
    const ws = new Date(weekStart);
    ws.setDate(ws.getDate() - 7);
    setWeekStart(ws);
    // move selectedDate back too if it's in current week
    const sd = new Date(selectedDate);
    sd.setDate(sd.getDate() - 7);
    setSelectedDate(sd);
  };

  const handleNextWeek = () => {
    const ws = new Date(weekStart);
    ws.setDate(ws.getDate() + 7);
    setWeekStart(ws);
    const sd = new Date(selectedDate);
    sd.setDate(sd.getDate() + 7);
    setSelectedDate(sd);
  };

  const handleSelectDate = (d: Date) => {
    setSelectedDate(d);
    // If clicking a day outside current week range, update weekStart
    const ws = getWeekStart(d);
    if (toDateString(ws) !== toDateString(weekStart)) {
      setWeekStart(ws);
    }
  };

  const getEntry = (mealType: string): ScheduleEntry | undefined =>
    entries[entryKey(selectedDate, mealType)];

  const getMealOption = (mealId: string | null | undefined): DietMealOption | undefined => {
    if (!mealId) return undefined;
    return dietMealOptions.find(o => o.meal_id === mealId);
  };

  const upsertEntry = async (mealType: string, updates: Partial<ScheduleEntry>) => {
    if (!userId || !activeDiet) return;
    setSaving(mealType);

    const key = entryKey(selectedDate, mealType);
    const existing = entries[key];
    const dateStr = toDateString(selectedDate);
    const defaultTime = DEFAULT_TIMES[mealType] ?? '12:00';

    const payload: Omit<ScheduleEntry, 'id'> & { id?: string } = {
      ...(existing ?? {}),
      user_id: userId,
      diet_id: activeDiet.diet_id,
      scheduled_date: dateStr,
      meal_type: mealType,
      meal_id: existing?.meal_id ?? null,
      scheduled_time: existing?.scheduled_time ?? defaultTime,
      ...updates,
    };

    const { data, error } = existing?.id
      ? await supabase
        .from('meal_schedule')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single()
      : await supabase
        .from('meal_schedule')
        .insert(payload)
        .select()
        .single();

    if (!error && data) {
      setEntries(prev => ({ ...prev, [key]: data as ScheduleEntry }));
    } else if (error) {
      Alert.alert('Error', 'Could not save. Please try again.');
    }
    setSaving(null);
  };

  const removeEntry = async (mealType: string) => {
    const key = entryKey(selectedDate, mealType);
    const existing = entries[key];
    if (!existing?.id) {
      // Just clear from local state
      setEntries(prev => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
      return;
    }

    setSaving(mealType);
    const { error } = await supabase
      .from('meal_schedule')
      .delete()
      .eq('id', existing.id);

    if (!error) {
      setEntries(prev => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
    } else {
      Alert.alert('Error', 'Could not remove. Please try again.');
    }
    setSaving(null);
  };

  const handleAssignMeal = async (mealType: string, option: DietMealOption) => {
    setMealPickerType(null);
    await upsertEntry(mealType, { meal_id: option.meal_id });
  };

  const handleSetTime = async (mealType: string, time: string) => {
    await upsertEntry(mealType, { scheduled_time: time });
  };

  const handleGoToToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setSelectedDate(today);
    setWeekStart(getWeekStart(today));
  };

  const isToday = toDateString(selectedDate) === toDateString(new Date());

  // Day macros summary
  const dayTotals = useMemo(() => {
    let cal = 0, protein = 0, carbs = 0, fat = 0;
    for (const mt of mealTypes) {
      const e = getEntry(mt.key);
      if (!e?.meal_id) continue;
      const opt = getMealOption(e.meal_id);
      if (!opt) continue;
      cal += opt.totalCalories;
      protein += opt.totalProtein;
      carbs += opt.totalCarbs;
      fat += opt.totalFat;
    }
    return { cal, protein, carbs, fat };
  }, [entries, selectedDate, mealTypes, dietMealOptions]);

  return (
    <View style={[pageStyles.root, { backgroundColor: C.bg, paddingTop: insets.top }]}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[pageStyles.header, { backgroundColor: C.bg, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={C.textPrime} />
        </TouchableOpacity>
        <View style={pageStyles.headerCenter}>
          <Text style={[pageStyles.headerTitle, { color: C.textPrime }]}>Meal Schedule</Text>
          {activeDiet && (
            <Text style={[pageStyles.headerSub, { color: C.textSub }]} numberOfLines={1}>
              {activeDiet.diet_name}
            </Text>
          )}
        </View>
        {!isToday && (
          <TouchableOpacity
            onPress={handleGoToToday}
            style={[pageStyles.todayBtn, { backgroundColor: C.purple + '18', borderColor: C.purple + '44' }]}
          >
            <Text style={[pageStyles.todayBtnText, { color: C.purple }]}>Today</Text>
          </TouchableOpacity>
        )}
        {isToday && <View style={{ width: 60 }} />}
      </View>

      {/* ── Week Strip ──────────────────────────────────────────────────── */}
      <View style={[pageStyles.weekCard, { backgroundColor: C.surface, borderColor: C.border }]}>
        <WeekStrip
          weekStart={weekStart}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          C={C}
        />
      </View>

      {/* ── Day label ──────────────────────────────────────────────────── */}
      <View style={pageStyles.dayLabel}>
        <Text style={[pageStyles.dayTitle, { color: C.textPrime }]}>
          {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          {isToday && <Text style={{ color: C.orange }}> · Today</Text>}
        </Text>

        {/* Day macro summary */}
        {dayTotals.cal > 0 && (
          <View style={pageStyles.totalsRow}>
            <Text style={[pageStyles.totalItem, { color: '#f97316' }]}>{dayTotals.cal} kcal</Text>
            <Text style={[pageStyles.totalItem, { color: '#34d399' }]}>P:{dayTotals.protein}g</Text>
            <Text style={[pageStyles.totalItem, { color: '#a78bfa' }]}>C:{dayTotals.carbs}g</Text>
            <Text style={[pageStyles.totalItem, { color: '#60a5fa' }]}>F:{dayTotals.fat}g</Text>
          </View>
        )}
      </View>

      {/* ── Meal Slots ─────────────────────────────────────────────────── */}
      {!activeDiet ? (
        <View style={pageStyles.noDiet}>
          <Ionicons name="nutrition-outline" size={40} color={C.textSub} />
          <Text style={[pageStyles.noDietText, { color: C.textSub }]}>No active diet selected.</Text>
          <TouchableOpacity onPress={() => router.push('/(protected)/(pages)/journal/diets')}>
            <Text style={{ color: C.purple, fontSize: 14, fontWeight: '600' }}>Set up a diet plan →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={pageStyles.scroll}
          contentContainerStyle={pageStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loadingSchedule && (
            <ActivityIndicator color={C.purple} style={{ marginBottom: 12 }} />
          )}
          {mealTypes.map(mt => {
            const entry = getEntry(mt.key);
            const mealOpt = getMealOption(entry?.meal_id);
            const isSaving = saving === mt.key;
            return (
              <View key={mt.key} style={isSaving && { opacity: 0.6 }}>
                <MealSlotCard
                  mealType={mt.key}
                  entry={entry}
                  mealOption={mealOpt}
                  onAssign={() => setMealPickerType(mt.key)}
                  onRemove={() => removeEntry(mt.key)}
                  onTimeEdit={() => setTimePickerType(mt.key)}
                  C={C}
                  isDark={isDark}
                />
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── Meal Picker Modal ──────────────────────────────────────────── */}
      <MealPickerModal
        visible={mealPickerType != null}
        mealType={mealPickerType ?? ''}
        options={dietMealOptions}
        onSelect={opt => mealPickerType && handleAssignMeal(mealPickerType, opt)}
        onClose={() => setMealPickerType(null)}
        C={C}
        isDark={isDark}
      />

      {/* ── Time Picker Modal ──────────────────────────────────────────── */}
      {timePickerType && (
        <TimePickerModal
          visible={timePickerType != null}
          mealType={timePickerType}
          currentTime={getEntry(timePickerType)?.scheduled_time ?? DEFAULT_TIMES[timePickerType] ?? '12:00'}
          onSelect={time => handleSetTime(timePickerType, time)}
          onClose={() => setTimePickerType(null)}
          C={C}
          isDark={isDark}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const pageStyles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 14,
    borderBottomWidth: 1, gap: 12,
  },
  headerCenter: { flex: 1, gap: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12 },
  todayBtn: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
  },
  todayBtnText: { fontSize: 13, fontWeight: '600' },
  weekCard: {
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 18, borderWidth: 1, padding: 14,
  },
  dayLabel: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4, gap: 4 },
  dayTitle: { fontSize: 16, fontWeight: '700' },
  totalsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  totalItem: { fontSize: 12, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  noDiet: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40 },
  noDietText: { fontSize: 15 },
});

const weekStyles = StyleSheet.create({
  container: { gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthLabel: { fontSize: 14, fontWeight: '700' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCell: {
    alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4,
    borderRadius: 12, borderWidth: 1.5, flex: 1, marginHorizontal: 2, gap: 2,
  },
  dayLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  dayNum: { fontSize: 15, fontWeight: '600' },
  todayDot: { width: 4, height: 4, borderRadius: 2 },
});

const slotStyles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBadge: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontSize: 15, fontWeight: '700' },
  timeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
  },
  timeBtnText: { fontSize: 12, fontWeight: '600' },
  assignedCard: { borderRadius: 14, borderWidth: 1, padding: 10 },
  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealImage: { width: 60, height: 60, borderRadius: 10 },
  mealImagePlaceholder: { width: 60, height: 60, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mealDetails: { flex: 1, gap: 5 },
  mealName: { fontSize: 14, fontWeight: '600', lineHeight: 18 },
  macroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  macro: { fontSize: 11, fontWeight: '500' },
  actions: { gap: 6 },
  actionBtn: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  emptySlot: {
    borderWidth: 1, borderStyle: 'dashed', borderRadius: 14,
    paddingVertical: 22, alignItems: 'center', gap: 4,
  },
  addIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  emptyHint: { fontSize: 11 },
});

const pickerStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '80%', paddingBottom: 30,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: 16, fontWeight: '700' },
  sheetSubtitle: { fontSize: 12, marginTop: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1 },
  empty: { padding: 40, alignItems: 'center' },
  optionCard: { borderRadius: 14, borderWidth: 1, padding: 12 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  optionImage: { width: 54, height: 54, borderRadius: 10 },
  optionImagePlaceholder: { width: 54, height: 54, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optionInfo: { flex: 1, gap: 5 },
  optionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  optionName: { fontSize: 14, fontWeight: '600', flex: 1 },
  typePill: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  typePillText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  optionMacros: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  calText: { fontSize: 12, fontWeight: '600' },
  macroText: { fontSize: 11, fontWeight: '500' },
});

const timeStyles = StyleSheet.create({
  timeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 8,
  },
  timeText: { fontSize: 15, fontWeight: '500' },
});
