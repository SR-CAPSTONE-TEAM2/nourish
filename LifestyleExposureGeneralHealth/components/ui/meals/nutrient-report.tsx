import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ProgressBar } from '@/components/ui/progress-bars/progress-bar-default';
import { RECOMMENDED_VITAMINS, RECOMMENDED_MINERALS } from '@/constants/recommended';
import { Vitamins, Minerals } from '@/types/types';

interface NutrientReportProps {
  totalVitamins: Vitamins;
  vitaminPercents: Vitamins;
  totalMinerals: Minerals;
  mineralPercents: Minerals;
  expandedReportSections: Set<string>;
  onToggleSection: (section: string) => void;
}

export const toggleReportSection = (
  section: string,
  expandedReportSections: Set<string>,
  setExpandedReportSections: (sections: Set<string>) => void
) => {
  const updated = new Set(expandedReportSections);
  if (updated.has(section)) {
    updated.delete(section);
  } else {
    updated.add(section);
  }
  setExpandedReportSections(updated);
};

export const NutrientReport = ({
  totalVitamins,
  vitaminPercents,
  totalMinerals,
  mineralPercents,
  expandedReportSections,
  onToggleSection,
}: NutrientReportProps) => {
  return (
    <ThemedView style={styles.reportSection}>
      <ThemedText type="title" style={styles.reportTitle}>Nutrient Report</ThemedText>

      {/* Vitamins Subsection */}
      <ThemedView style={styles.reportSubsection}>
        <TouchableOpacity
          onPress={() => onToggleSection('vitamins')}
          style={styles.reportHeader}
          activeOpacity={0.7}
        >
          <View style={styles.reportHeaderLeft}>
            <View style={[styles.sectionAccent, { backgroundColor: '#8B5CF6' }]} />
            <ThemedText type="subtitle">Vitamins</ThemedText>
          </View>
          <ThemedText type="defaultSemiBold" style={styles.chevron}>
            {expandedReportSections.has('vitamins') ? '▼' : '▶'}
          </ThemedText>
        </TouchableOpacity>
        {expandedReportSections.has('vitamins') && (
          <View style={styles.vitaminsList}>
            {/* Vitamin A */}
            <ThemedView style={styles.vitaminNutrientRow}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle">Vitamin A</ThemedText>
                <ThemedText type="defaultSemiBold">{Math.round(totalVitamins.vitaminA)} / {RECOMMENDED_VITAMINS.vitaminA} mcg</ThemedText>
              </View>
              <ProgressBar percent={vitaminPercents.vitaminA} />
            </ThemedView>

            {/* B1 */}
            <ThemedView style={styles.vitaminNutrientRow}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle">B1 (Thiamine)</ThemedText>
                <ThemedText type="defaultSemiBold">{totalVitamins.vitaminB1.toFixed(2)} / {RECOMMENDED_VITAMINS.vitaminB1} mg</ThemedText>
              </View>
              <ProgressBar percent={vitaminPercents.vitaminB1} />
            </ThemedView>

            {/* B2 */}
            <ThemedView style={styles.vitaminNutrientRow}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle">B2 (Riboflavin)</ThemedText>
                <ThemedText type="defaultSemiBold">{totalVitamins.vitaminB2.toFixed(2)} / {RECOMMENDED_VITAMINS.vitaminB2} mg</ThemedText>
              </View>
              <ProgressBar percent={vitaminPercents.vitaminB2} />
            </ThemedView>

            {/* B3 */}
            <ThemedView style={styles.vitaminNutrientRow}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle">B3 (Niacin)</ThemedText>
                <ThemedText type="defaultSemiBold">{totalVitamins.vitaminB3.toFixed(2)} / {RECOMMENDED_VITAMINS.vitaminB3} mg</ThemedText>
              </View>
              <ProgressBar percent={vitaminPercents.vitaminB3} />
            </ThemedView>

            {/* B5 */}
            <ThemedView style={styles.vitaminNutrientRow}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle">B5 (Pantothenic acid)</ThemedText>
                <ThemedText type="defaultSemiBold">{totalVitamins.vitaminB5.toFixed(2)} / {RECOMMENDED_VITAMINS.vitaminB5} mg</ThemedText>
              </View>
              <ProgressBar percent={vitaminPercents.vitaminB5} />
            </ThemedView>

            {/* B6 */}
            <ThemedView style={styles.vitaminNutrientRow}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle">B6 (Pyridoxine)</ThemedText>
                <ThemedText type="defaultSemiBold">{totalVitamins.vitaminB6.toFixed(2)} / {RECOMMENDED_VITAMINS.vitaminB6} mg</ThemedText>
              </View>
              <ProgressBar percent={vitaminPercents.vitaminB6} />
            </ThemedView>

            {/* B12 */}
            <ThemedView style={styles.vitaminNutrientRow}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle">B12 (Cobalamin)</ThemedText>
                <ThemedText type="defaultSemiBold">{totalVitamins.vitaminB12.toFixed(2)} / {RECOMMENDED_VITAMINS.vitaminB12} mcg</ThemedText>
              </View>
              <ProgressBar percent={vitaminPercents.vitaminB12} />
            </ThemedView>

            {/* Folate */}
            <ThemedView style={styles.vitaminNutrientRow}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle">Folate</ThemedText>
                <ThemedText type="defaultSemiBold">{Math.round(totalVitamins.folate)} / {RECOMMENDED_VITAMINS.folate} mcg</ThemedText>
              </View>
              <ProgressBar percent={vitaminPercents.folate} />
            </ThemedView>

            {/* Vitamin C */}
            <ThemedView style={styles.vitaminNutrientRow}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle">Vitamin C</ThemedText>
                <ThemedText type="defaultSemiBold">{Math.round(totalVitamins.vitaminC)} / {RECOMMENDED_VITAMINS.vitaminC} mg</ThemedText>
              </View>
              <ProgressBar percent={vitaminPercents.vitaminC} />
            </ThemedView>

            {/* Vitamin D */}
            <ThemedView style={styles.vitaminNutrientRow}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle">Vitamin D</ThemedText>
                <ThemedText type="defaultSemiBold">{totalVitamins.vitaminD.toFixed(1)} / {RECOMMENDED_VITAMINS.vitaminD} mcg</ThemedText>
              </View>
              <ProgressBar percent={vitaminPercents.vitaminD} />
            </ThemedView>

            {/* Vitamin E */}
            <ThemedView style={styles.vitaminNutrientRow}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle">Vitamin E</ThemedText>
                <ThemedText type="defaultSemiBold">{totalVitamins.vitaminE.toFixed(2)} / {RECOMMENDED_VITAMINS.vitaminE} mg</ThemedText>
              </View>
              <ProgressBar percent={vitaminPercents.vitaminE} />
            </ThemedView>

            {/* Vitamin K */}
            <ThemedView style={styles.vitaminNutrientRow}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle">Vitamin K</ThemedText>
                <ThemedText type="defaultSemiBold">{Math.round(totalVitamins.vitaminK)} / {RECOMMENDED_VITAMINS.vitaminK} mcg</ThemedText>
              </View>
              <ProgressBar percent={vitaminPercents.vitaminK} />
            </ThemedView>
          </View>
        )}
      </ThemedView>

      {/* Minerals Subsection */}
      <ThemedView style={styles.reportSubsection}>
        <TouchableOpacity
          onPress={() => onToggleSection('minerals')}
          style={styles.reportHeader}
          activeOpacity={0.7}
        >
          <View style={styles.reportHeaderLeft}>
            <View style={[styles.sectionAccent, { backgroundColor: '#F59E0B' }]} />
            <ThemedText type="subtitle">Minerals</ThemedText>
          </View>
          <ThemedText type="defaultSemiBold" style={styles.chevron}>
            {expandedReportSections.has('minerals') ? '▼' : '▶'}
          </ThemedText>
        </TouchableOpacity>
        {expandedReportSections.has('minerals') && (
          <View style={styles.vitaminsList}>
            {/* Calcium */}
            <ThemedView style={styles.vitaminNutrientRow}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle">Calcium</ThemedText>
                <ThemedText type="defaultSemiBold">{Math.round(totalMinerals.calcium)} / {RECOMMENDED_MINERALS.calcium} mg</ThemedText>
              </View>
              <ProgressBar percent={mineralPercents.calcium} />
            </ThemedView>

            {/* Copper */}
            <ThemedView style={styles.vitaminNutrientRow}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle">Copper</ThemedText>
                <ThemedText type="defaultSemiBold">{totalMinerals.copper.toFixed(2)} / {RECOMMENDED_MINERALS.copper} mg</ThemedText>
              </View>
              <ProgressBar percent={mineralPercents.copper} />
            </ThemedView>

            {/* Iron */}
            <ThemedView style={styles.vitaminNutrientRow}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle">Iron</ThemedText>
                <ThemedText type="defaultSemiBold">{totalMinerals.iron.toFixed(1)} / {RECOMMENDED_MINERALS.iron} mg</ThemedText>
              </View>
              <ProgressBar percent={mineralPercents.iron} />
            </ThemedView>

            {/* Magnesium */}
            <ThemedView style={styles.vitaminNutrientRow}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle">Magnesium</ThemedText>
                <ThemedText type="defaultSemiBold">{Math.round(totalMinerals.magnesium)} / {RECOMMENDED_MINERALS.magnesium} mg</ThemedText>
              </View>
              <ProgressBar percent={mineralPercents.magnesium} />
            </ThemedView>

            {/* Manganese */}
            <ThemedView style={styles.vitaminNutrientRow}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle">Manganese</ThemedText>
                <ThemedText type="defaultSemiBold">{totalMinerals.manganese.toFixed(2)} / {RECOMMENDED_MINERALS.manganese} mg</ThemedText>
              </View>
              <ProgressBar percent={mineralPercents.manganese} />
            </ThemedView>

            {/* Phosphorus */}
            <ThemedView style={styles.vitaminNutrientRow}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle">Phosphorus</ThemedText>
                <ThemedText type="defaultSemiBold">{Math.round(totalMinerals.phosphorus)} / {RECOMMENDED_MINERALS.phosphorus} mg</ThemedText>
              </View>
              <ProgressBar percent={mineralPercents.phosphorus} />
            </ThemedView>

            {/* Selenium */}
            <ThemedView style={styles.vitaminNutrientRow}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle">Selenium</ThemedText>
                <ThemedText type="defaultSemiBold">{Math.round(totalMinerals.selenium)} / {RECOMMENDED_MINERALS.selenium} mcg</ThemedText>
              </View>
              <ProgressBar percent={mineralPercents.selenium} />
            </ThemedView>

            {/* Sodium */}
            <ThemedView style={styles.vitaminNutrientRow}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle">Sodium</ThemedText>
                <ThemedText type="defaultSemiBold">{Math.round(totalMinerals.sodium)} / {RECOMMENDED_MINERALS.sodium} mg</ThemedText>
              </View>
              <ProgressBar percent={mineralPercents.sodium} />
            </ThemedView>

            {/* Zinc */}
            <ThemedView style={styles.vitaminNutrientRow}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle">Zinc</ThemedText>
                <ThemedText type="defaultSemiBold">{totalMinerals.zinc.toFixed(2)} / {RECOMMENDED_MINERALS.zinc} mg</ThemedText>
              </View>
              <ProgressBar percent={mineralPercents.zinc} />
            </ThemedView>
          </View>
        )}
      </ThemedView>
    </ThemedView>
  );
};


const styles = StyleSheet.create({
  chevron: {
    fontSize: 11,
    color: '#6B6B8A',
  },
  reportSection: {
    marginVertical: 4,
    gap: 10,
  },
  reportTitle: {
    marginBottom: 4,
    fontSize: 24,
    fontWeight: 'bold',
  },
  reportSubsection: {
    borderRadius: 14,
    backgroundColor: '#1C1C2E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  reportHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionAccent: {
    width: 3,
    height: 20,
    borderRadius: 2,
  },
  vitaminsList: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
  },
  vitaminNutrientRow: {
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  vitaminLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
})
