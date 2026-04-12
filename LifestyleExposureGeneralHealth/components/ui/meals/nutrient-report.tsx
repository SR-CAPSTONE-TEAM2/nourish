import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ProgressBar } from '@/components/ui/progress-bars/progress-bar-default';
import { RECOMMENDED_VITAMINS, RECOMMENDED_MINERALS } from '@/constants/recommended';
import { Vitamins, Minerals } from '@/types/types';
import { useTheme } from '@/context/theme-context';

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
  const { isDark, colors } = useTheme();

  return (
    <ThemedView style={styles.reportSection}>
      <ThemedText type="title" style={[styles.reportTitle, { color: colors.text }]}>Nutrient Report</ThemedText>

      {/* Vitamins Subsection */}
      <View style={[styles.reportSubsection, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => onToggleSection('vitamins')}
          style={styles.reportHeader}
          activeOpacity={0.7}
        >
          <View style={styles.reportHeaderLeft}>
            <View style={[styles.sectionAccent, { backgroundColor: '#8B5CF6' }]} />
            <ThemedText type="subtitle" style={{ color: colors.text }}>Vitamins</ThemedText>
          </View>
          <ThemedText type="defaultSemiBold" style={[styles.chevron, { color: colors.textMuted }]}>
            {expandedReportSections.has('vitamins') ? '▼' : '▶'}
          </ThemedText>
        </TouchableOpacity>
        {expandedReportSections.has('vitamins') && (
          <View style={styles.vitaminsList}>
            {/* Vitamin A */}
            <View style={[styles.vitaminNutrientRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle" style={{ color: colors.text }}>Vitamin A</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>{totalVitamins.vitaminA.toFixed(1)} / {RECOMMENDED_VITAMINS.vitaminA} mcg</ThemedText>
              </View>
              <ProgressBar percent={vitaminPercents.vitaminA} />
            </View>

            {/* B1 */}
            <View style={[styles.vitaminNutrientRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle" style={{ color: colors.text }}>B1 (Thiamine)</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>{totalVitamins.vitaminB1.toFixed(1)} / {RECOMMENDED_VITAMINS.vitaminB1} mg</ThemedText>
              </View>
              <ProgressBar percent={vitaminPercents.vitaminB1} />
            </View>

            {/* B2 */}
            <View style={[styles.vitaminNutrientRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle" style={{ color: colors.text }}>B2 (Riboflavin)</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>{totalVitamins.vitaminB2.toFixed(1)} / {RECOMMENDED_VITAMINS.vitaminB2} mg</ThemedText>
              </View>
              <ProgressBar percent={vitaminPercents.vitaminB2} />
            </View>

            {/* B3 */}
            <View style={[styles.vitaminNutrientRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle" style={{ color: colors.text }}>B3 (Niacin)</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>{totalVitamins.vitaminB3.toFixed(1)} / {RECOMMENDED_VITAMINS.vitaminB3} mg</ThemedText>
              </View>
              <ProgressBar percent={vitaminPercents.vitaminB3} />
            </View>

            {/* B5 */}
            <View style={[styles.vitaminNutrientRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle" style={{ color: colors.text }}>B5 (Pantothenic acid)</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>{totalVitamins.vitaminB5.toFixed(1)} / {RECOMMENDED_VITAMINS.vitaminB5} mg</ThemedText>
              </View>
              <ProgressBar percent={vitaminPercents.vitaminB5} />
            </View>

            {/* B6 */}
            <View style={[styles.vitaminNutrientRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle" style={{ color: colors.text }}>B6 (Pyridoxine)</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>{totalVitamins.vitaminB6.toFixed(1)} / {RECOMMENDED_VITAMINS.vitaminB6} mg</ThemedText>
              </View>
              <ProgressBar percent={vitaminPercents.vitaminB6} />
            </View>

            {/* B12 */}
            <View style={[styles.vitaminNutrientRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle" style={{ color: colors.text }}>B12 (Cobalamin)</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>{totalVitamins.vitaminB12.toFixed(1)} / {RECOMMENDED_VITAMINS.vitaminB12} mcg</ThemedText>
              </View>
              <ProgressBar percent={vitaminPercents.vitaminB12} />
            </View>

            {/* Folate */}
            <View style={[styles.vitaminNutrientRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle" style={{ color: colors.text }}>Folate</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>{totalVitamins.folate.toFixed(1)} / {RECOMMENDED_VITAMINS.folate} mcg</ThemedText>
              </View>
              <ProgressBar percent={vitaminPercents.folate} />
            </View>

            {/* Vitamin C */}
            <View style={[styles.vitaminNutrientRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle" style={{ color: colors.text }}>Vitamin C</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>{totalVitamins.vitaminC.toFixed(1)} / {RECOMMENDED_VITAMINS.vitaminC} mg</ThemedText>
              </View>
              <ProgressBar percent={vitaminPercents.vitaminC} />
            </View>

            {/* Vitamin D */}
            <View style={[styles.vitaminNutrientRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle" style={{ color: colors.text }}>Vitamin D</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>{totalVitamins.vitaminD.toFixed(1)} / {RECOMMENDED_VITAMINS.vitaminD} mcg</ThemedText>
              </View>
              <ProgressBar percent={vitaminPercents.vitaminD} />
            </View>

            {/* Vitamin E */}
            <View style={[styles.vitaminNutrientRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle" style={{ color: colors.text }}>Vitamin E</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>{totalVitamins.vitaminE.toFixed(1)} / {RECOMMENDED_VITAMINS.vitaminE} mg</ThemedText>
              </View>
              <ProgressBar percent={vitaminPercents.vitaminE} />
            </View>

            {/* Vitamin K */}
            <View style={[styles.vitaminNutrientRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle" style={{ color: colors.text }}>Vitamin K</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>{totalVitamins.vitaminK.toFixed(1)} / {RECOMMENDED_VITAMINS.vitaminK} mcg</ThemedText>
              </View>
              <ProgressBar percent={vitaminPercents.vitaminK} />
            </View>
          </View>
        )}
      </View>

      {/* Minerals Subsection */}
      <View style={[styles.reportSubsection, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => onToggleSection('minerals')}
          style={styles.reportHeader}
          activeOpacity={0.7}
        >
          <View style={styles.reportHeaderLeft}>
            <View style={[styles.sectionAccent, { backgroundColor: '#F59E0B' }]} />
            <ThemedText type="subtitle" style={{ color: colors.text }}>Minerals</ThemedText>
          </View>
          <ThemedText type="defaultSemiBold" style={[styles.chevron, { color: colors.textMuted }]}>
            {expandedReportSections.has('minerals') ? '▼' : '▶'}
          </ThemedText>
        </TouchableOpacity>
        {expandedReportSections.has('minerals') && (
          <View style={styles.vitaminsList}>
            {/* Calcium */}
            <View style={[styles.vitaminNutrientRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle" style={{ color: colors.text }}>Calcium</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>{totalMinerals.calcium.toFixed(1)} / {RECOMMENDED_MINERALS.calcium} mg</ThemedText>
              </View>
              <ProgressBar percent={mineralPercents.calcium} />
            </View>

            {/* Copper */}
            <View style={[styles.vitaminNutrientRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle" style={{ color: colors.text }}>Copper</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>{totalMinerals.copper.toFixed(1)} / {RECOMMENDED_MINERALS.copper} mg</ThemedText>
              </View>
              <ProgressBar percent={mineralPercents.copper} />
            </View>

            {/* Iron */}
            <View style={[styles.vitaminNutrientRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle" style={{ color: colors.text }}>Iron</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>{totalMinerals.iron.toFixed(1)} / {RECOMMENDED_MINERALS.iron} mg</ThemedText>
              </View>
              <ProgressBar percent={mineralPercents.iron} />
            </View>

            {/* Magnesium */}
            <View style={[styles.vitaminNutrientRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle" style={{ color: colors.text }}>Magnesium</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>{totalMinerals.magnesium.toFixed(1)} / {RECOMMENDED_MINERALS.magnesium} mg</ThemedText>
              </View>
              <ProgressBar percent={mineralPercents.magnesium} />
            </View>

            {/* Manganese */}
            <View style={[styles.vitaminNutrientRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle" style={{ color: colors.text }}>Manganese</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>{totalMinerals.manganese.toFixed(1)} / {RECOMMENDED_MINERALS.manganese} mg</ThemedText>
              </View>
              <ProgressBar percent={mineralPercents.manganese} />
            </View>

            {/* Phosphorus */}
            <View style={[styles.vitaminNutrientRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle" style={{ color: colors.text }}>Phosphorus</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>{totalMinerals.phosphorus.toFixed(1)} / {RECOMMENDED_MINERALS.phosphorus} mg</ThemedText>
              </View>
              <ProgressBar percent={mineralPercents.phosphorus} />
            </View>

            {/* Selenium */}
            <View style={[styles.vitaminNutrientRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle" style={{ color: colors.text }}>Selenium</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>{totalMinerals.selenium.toFixed(1)} / {RECOMMENDED_MINERALS.selenium} mcg</ThemedText>
              </View>
              <ProgressBar percent={mineralPercents.selenium} />
            </View>

            {/* Sodium */}
            <View style={[styles.vitaminNutrientRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle" style={{ color: colors.text }}>Sodium</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>{totalMinerals.sodium.toFixed(1)} / {RECOMMENDED_MINERALS.sodium} mg</ThemedText>
              </View>
              <ProgressBar percent={mineralPercents.sodium} />
            </View>

            {/* Zinc */}
            <View style={[styles.vitaminNutrientRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
              <View style={styles.vitaminLabel}>
                <ThemedText type="subtitle" style={{ color: colors.text }}>Zinc</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>{totalMinerals.zinc.toFixed(1)} / {RECOMMENDED_MINERALS.zinc} mg</ThemedText>
              </View>
              <ProgressBar percent={mineralPercents.zinc} />
            </View>
          </View>
        )}
      </View>
    </ThemedView>
  );
};


const styles = StyleSheet.create({
  chevron: {
    fontSize: 11,
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
    borderWidth: 1,
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
  },
  vitaminLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
})
