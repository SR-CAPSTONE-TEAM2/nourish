import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/ui/progress-bars/progress-bar-default';
import { RECOMMENDED } from '@/constants/recommended';

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
      <View style={styles.caloriesCard}>
        <View style={styles.caloriesTopRow}>
          <ThemedText style={styles.caloriesLabel}>CALORIES</ThemedText>
          <View style={[styles.percentBadge, { backgroundColor: calOnTrack ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.07)' }]}>
            <ThemedText style={[styles.percentBadgeText, { color: calOnTrack ? '#8B5CF6' : '#E8E8F0' }]}>
              {calPercent}%
            </ThemedText>
          </View>
        </View>
        <View style={styles.caloriesValueRow}>
          <ThemedText style={styles.caloriesValue}>{totals.calories}</ThemedText>
          <ThemedText style={styles.caloriesUnit}> kcal</ThemedText>
        </View>
        <ThemedText style={styles.caloriesTarget}>Daily goal: {RECOMMENDED.calories} kcal</ThemedText>
        <ProgressBar percent={calPercent} />
      </View>

      {/* Macro row */}
      <View style={styles.macroRow}>
        {macros.map(({ label, total, rec, percent, unit, color }) => (
          <View key={label} style={[styles.macroCard, { borderTopColor: color }]}>
            <ThemedText style={[styles.macroLabel, { color }]}>{label}</ThemedText>
            <ThemedText style={styles.macroValue}>
              {total}<ThemedText style={styles.macroUnit}>{unit}</ThemedText>
            </ThemedText>
            <ThemedText style={styles.macroTarget}>/ {rec}{unit}</ThemedText>
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
    backgroundColor: '#1C1C2E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
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
    color: '#6B6B8A',
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
    color: '#E8E8F0',
    lineHeight: 56,
  },
  caloriesUnit: {
    fontSize: 18,
    color: '#6B6B8A',
    marginBottom: 8,
    fontFamily: 'Ubuntu_400Regular',
  },
  caloriesTarget: {
    fontSize: 13,
    color: '#6B6B8A',
    fontFamily: 'Ubuntu_400Regular',
    marginBottom: 10,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 10,
  },
  macroCard: {
    flex: 1,
    backgroundColor: '#1C1C2E',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
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
    color: '#E8E8F0',
    lineHeight: 28,
  },
  macroUnit: {
    fontSize: 13,
    color: '#6B6B8A',
    fontWeight: 'normal',
  },
  macroTarget: {
    fontSize: 11,
    color: '#6B6B8A',
    fontFamily: 'Ubuntu_400Regular',
    marginBottom: 8,
    marginTop: 2,
  },
})
