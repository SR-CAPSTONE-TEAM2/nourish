// components/ui/journal/mood-selector.tsx

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { MoodRating, PhysicalFeeling, EmotionalFeeling } from '@/types/diets-meals';
import {
  MOOD_RATINGS,
  PHYSICAL_FEELINGS,
  EMOTIONAL_FEELINGS,
} from '@/constants/journal';
import { ThemedText } from '@/components/themed-text';

interface MoodRatingSelectorProps {
  selected: MoodRating;
  onSelect: (rating: MoodRating) => void;
}

export const MoodRatingSelector: React.FC<MoodRatingSelectorProps> = ({
  selected,
  onSelect,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold" style={styles.label}>
        Overall Mood
      </ThemedText>
      <View style={styles.moodContainer}>
        {MOOD_RATINGS.map((mood) => {
          const isSelected = selected === mood.value;
          return (
            <TouchableOpacity
              key={mood.value}
              style={[
                styles.moodOption,
                {
                  backgroundColor: isSelected
                    ? 'rgba(139, 92, 246, 0.2)'
                    : isDark
                      ? '#1C1C2E'
                      : '#F5F5F7',
                  borderColor: isSelected ? '#8B5CF6' : 'transparent',
                },
              ]}
              onPress={() => onSelect(mood.value as MoodRating)}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.moodEmoji}>{mood.emoji}</ThemedText>
              <ThemedText
                style={[
                  styles.moodLabel,
                  isSelected && styles.moodLabelSelected,
                ]}
              >
                {mood.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

interface FeelingsSelectorProps<T> {
  title: string;
  options: { value: T; label: string; icon: string }[];
  selected: T[];
  onToggle: (value: T) => void;
}

export function FeelingsSelector<T extends string>({
  title,
  options,
  selected,
  onToggle,
}: FeelingsSelectorProps<T>) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold" style={styles.label}>
        {title}
      </ThemedText>
      <View style={styles.feelingsContainer}>
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.feelingChip,
                {
                  backgroundColor: isSelected
                    ? 'rgba(139, 92, 246, 0.2)'
                    : isDark
                      ? '#1C1C2E'
                      : '#F5F5F7',
                  borderColor: isSelected
                    ? '#8B5CF6'
                    : isDark
                      ? '#2D2D3A'
                      : '#E5E5E7',
                },
              ]}
              onPress={() => onToggle(option.value)}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.feelingIcon}>{option.icon}</ThemedText>
              <ThemedText
                style={[
                  styles.feelingLabel,
                  isSelected && styles.feelingLabelSelected,
                ]}
              >
                {option.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export const PhysicalFeelingsSelector: React.FC<{
  selected: PhysicalFeeling[];
  onToggle: (feeling: PhysicalFeeling) => void;
}> = ({ selected, onToggle }) => (
  <FeelingsSelector
    title="How does your body feel?"
    options={PHYSICAL_FEELINGS}
    selected={selected}
    onToggle={onToggle}
  />
);

export const EmotionalFeelingsSelector: React.FC<{
  selected: EmotionalFeeling[];
  onToggle: (feeling: EmotionalFeeling) => void;
}> = ({ selected, onToggle }) => (
  <FeelingsSelector
    title="How do you feel emotionally?"
    options={EMOTIONAL_FEELINGS}
    selected={selected}
    onToggle={onToggle}
  />
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 12,
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  moodOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 2,
  },
  moodEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 10,
    textAlign: 'center',
    opacity: 0.7,
  },
  moodLabelSelected: {
    color: '#8B5CF6',
    fontWeight: '600',
    opacity: 1,
  },
  feelingsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  feelingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  feelingIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  feelingLabel: {
    fontSize: 13,
    opacity: 0.8,
  },
  feelingLabelSelected: {
    color: '#8B5CF6',
    fontWeight: '600',
    opacity: 1,
  },
});
