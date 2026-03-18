import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';

const getBarColor = (percent: number) => {
  if (percent >= 100) return '#EF4444'; // Over — red
  return '#00ff7f';                     // Under — blue
};

export const ProgressBar = ({ percent }: { percent: number }) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const fillColor = getBarColor(percent);
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${clamped}%`, backgroundColor: fillColor }]} />
      </View>
      <ThemedText type="defaultSemiBold" style={styles.percentText}>{Math.round(percent)}%</ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  percentText: {
    width: 44,
    textAlign: 'right',
    fontSize: 12,
    color: '#6B6B8A',
  },
})
