import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MealType } from '@/types/diets-meals';
import { MEAL_TYPES } from '@/constants/journal';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/context/theme-context';

interface MealTypeSelectorProps {
  selected: MealType | null;
  onSelect: (type: MealType) => void;
}

export const MealTypeSelector: React.FC<MealTypeSelectorProps> = ({
  selected,
  onSelect,
}) => {
  const { isDark, colors } = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold" style={styles.label}>
        Meal Type
      </ThemedText>
      <View style={styles.optionsContainer}>
        {MEAL_TYPES.map((meal) => {
          const isSelected = selected === meal.value;
          return (
            <TouchableOpacity
              key={meal.value}
              style={[
                styles.option,
                {
                  backgroundColor: isSelected
                    ? 'rgba(139, 92, 246, 0.2)'
                    : colors.card,
                  borderColor: isSelected ? '#8B5CF6' : 'transparent',
                },
              ]}
              onPress={() => onSelect(meal.value)}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.optionIcon}>{meal.icon}</ThemedText>
              <ThemedText
                style={[
                  styles.optionLabel,
                  isSelected && styles.optionLabelSelected,
                ]}
              >
                {meal.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
  },
  optionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  optionLabelSelected: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
});
