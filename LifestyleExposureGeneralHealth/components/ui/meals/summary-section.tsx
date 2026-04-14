import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/ui/progress-bars/progress-bar-default';
import { RECOMMENDED } from '@/constants/recommended';
import { useTheme } from '@/context/theme-context';

interface SummarySectionProps {
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  percents: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export const SummarySection = ({ totals, percents }: SummarySectionProps) => {
  const { isDark, colors } = useTheme();

  const calPercent = percents.calories;
  const calOnTrack = calPercent >= 80 && calPercent <= 115;

  const macros = [
    { label: 'Protein', total: totals.protein, rec: RECOMMENDED.protein, percent: percents.protein, unit: 'g', color: '#6366F1' },
    { label: 'Carbs',   total: totals.carbs,   rec: RECOMMENDED.carbs,   percent: percents.carbs,   unit: 'g', color: '#F59E0B' },
    { label: 'Fat',     total: totals.fat,      rec: RECOMMENDED.fat,     percent: percents.fat,     unit: 'g', color: '#EC4899' },
  ];

  return (
    <View style={styles.summaryContainer}>
      {/* Featured calories card */}
      <View style={[styles.caloriesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.caloriesTopRow}>
          <ThemedText style={[styles.caloriesLabel, { color: colors.textMuted }]}>CALORIES</ThemedText>
          <View style={[styles.percentBadge, { backgroundColor: calOnTrack ? 'rgba(139,92,246,0.2)' : isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]}>
            <ThemedText style={[styles.percentBadgeText, { color: calOnTrack ? '#8B5CF6' : colors.text }]}>
              {calPercent}%
            </ThemedText>
          </View>
        </View>
        <View style={styles.caloriesValueRow}>
          <ThemedText style={[styles.caloriesValue, { color: colors.text }]}>{totals.calories}</ThemedText>
          <ThemedText style={[styles.caloriesUnit, { color: colors.textMuted }]}> kcal</ThemedText>
        </View>
        <ThemedText style={[styles.caloriesTarget, { color: colors.textMuted }]}>Daily goal: {RECOMMENDED.calories} kcal</ThemedText>
        <ProgressBar percent={calPercent} />
      </View>

      {/* Macro row */}
      <View style={styles.macroRow}>
        {macros.map(({ label, total, rec, percent, unit, color }) => (
          <View key={label} style={[styles.macroCard, { backgroundColor: colors.card, borderColor: colors.border, borderTopColor: color }]}>
            <ThemedText style={[styles.macroLabel, { color }]}>{label}</ThemedText>
            <ThemedText style={[styles.macroValue, { color: colors.text }]}>
              {total}<ThemedText style={[styles.macroUnit, { color: colors.textMuted }]}>{unit}</ThemedText>
            </ThemedText>
            <ThemedText style={[styles.macroTarget, { color: colors.textMuted }]}>/ {rec}{unit}</ThemedText>
            <ProgressBar percent={percent} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  summaryContainer: {
    gap: 12,
    marginVertical: 4,
  },
  caloriesCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  caloriesTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  caloriesLabel: {
    fontSize: 11,
    letterSpacing: 1.4,
    fontFamily: 'Ubuntu_400Regular',
  },
  percentBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  percentBadgeText: {
    fontSize: 13,
    fontFamily: 'Ubuntu_700Bold',
    fontWeight: '700',
  },
  caloriesValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  caloriesValue: {
    fontSize: 48,
    fontFamily: 'Ubuntu_700Bold',
    fontWeight: 'bold',
    lineHeight: 56,
  },
  caloriesUnit: {
    fontSize: 18,
    marginBottom: 8,
    fontFamily: 'Ubuntu_400Regular',
  },
  caloriesTarget: {
    fontSize: 13,
    fontFamily: 'Ubuntu_400Regular',
    marginBottom: 10,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 10,
  },
  macroCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderTopWidth: 2,
  },
  macroLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    fontFamily: 'Ubuntu_700Bold',
    fontWeight: '700',
    marginBottom: 6,
  },
  macroValue: {
    fontSize: 22,
    fontFamily: 'Ubuntu_700Bold',
    fontWeight: 'bold',
    lineHeight: 28,
  },
  macroUnit: {
    fontSize: 13,
    fontWeight: 'normal',
  },
  macroTarget: {
    fontSize: 11,
    fontFamily: 'Ubuntu_400Regular',
    marginBottom: 8,
    marginTop: 2,
  },
})
