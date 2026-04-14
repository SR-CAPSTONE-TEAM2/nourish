// components/ui/journal/meal-entry-form.tsx
import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MealType, MoodRating, PhysicalFeeling, EmotionalFeeling, MealEntry, TemplateMeal } from '@/types/diets-meals';
import { MealTypeSelector } from '@/components/ui/journal/meal-selector';
import {
  MoodRatingSelector,
  PhysicalFeelingsSelector,
  EmotionalFeelingsSelector,
} from './mood-selector';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/context/theme-context';

interface MealEntryFormProps {
  onSubmit: (entry: Omit<MealEntry, 'id' | 'createdAt'>) => Promise<void>;
  onCancel: () => void;
  initialEntry?: MealEntry;
  lockedMealType?: string;
  prefillMeal?: TemplateMeal; // ← add this
}

export const MealEntryForm: React.FC<MealEntryFormProps> = ({
  onSubmit,
  onCancel,
  initialEntry,
  lockedMealType,
  prefillMeal, // ← add this
}) => {
  const { isDark, colors } = useTheme();

  // Build prefilled food description from template meal
  const getPrefillDescription = (): string => {
    if (initialEntry?.foodDescription) return initialEntry.foodDescription;
    if (prefillMeal) {
      // If the template meal has ingredients, list them
      if (prefillMeal.ingredients && prefillMeal.ingredients.length > 0) {
        return prefillMeal.ingredients
          .map((ing) => `${ing.qty}x ${ing.ingredient_name}`)
          .join('\n');
      }
      // Otherwise just use the meal name
      return prefillMeal.name;
    }
    return '';
  };

  const [mealType, setMealType] = useState<MealType | null>(
    (lockedMealType as MealType) ?? initialEntry?.mealType ?? null
  );
  const [foodDescription, setFoodDescription] = useState(getPrefillDescription());
  const [physicalFeelings, setPhysicalFeelings] = useState<PhysicalFeeling[]>(
    initialEntry?.physicalFeelings || []
  );
  const [emotionalFeelings, setEmotionalFeelings] = useState<EmotionalFeeling[]>(
    initialEntry?.emotionalFeelings || []
  );
  const [moodRating, setMoodRating] = useState<MoodRating>(
    initialEntry?.moodRating || 3
  );
  const [notes, setNotes] = useState(initialEntry?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const togglePhysicalFeeling = (feeling: PhysicalFeeling) => {
    setPhysicalFeelings((prev) =>
      prev.includes(feeling)
        ? prev.filter((f) => f !== feeling)
        : [...prev, feeling]
    );
  };

  const toggleEmotionalFeeling = (feeling: EmotionalFeeling) => {
    setEmotionalFeelings((prev) =>
      prev.includes(feeling)
        ? prev.filter((f) => f !== feeling)
        : [...prev, feeling]
    );
  };

  const validateForm = (): boolean => {
    if (!mealType) {
      Alert.alert('Validation Error', 'Please select a meal type.');
      return false;
    }
    if (!foodDescription.trim()) {
      Alert.alert('Validation Error', 'Please describe what you ate.');
      return false;
    }
    if (physicalFeelings.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one physical feeling.');
      return false;
    }
    if (emotionalFeelings.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one emotional feeling.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        mealType: mealType!,
        foodDescription: foodDescription.trim(),
        physicalFeelings,
        emotionalFeelings,
        moodRating,
        notes: notes.trim(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to save entry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = [
    styles.textInput,
    {
      backgroundColor: colors.card,
      color: colors.text,
    },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          {initialEntry ? 'Edit Entry' : prefillMeal ? 'Log Planned Meal' : 'New Entry'}
        </ThemedText>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
        >
          <ThemedText style={[styles.saveButtonText, isSubmitting && styles.saveButtonTextDisabled]}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Prefill info banner */}
        {prefillMeal && (
          <View style={[styles.prefillBanner, { backgroundColor: colors.surfaceHighlight }]}>
            <Ionicons name="restaurant-outline" size={16} color="#8B5CF6" />
            <ThemedText style={styles.prefillBannerText}>
              Logging: {prefillMeal.name} ({prefillMeal.totalCalories} kcal)
            </ThemedText>
          </View>
        )}

        {/* Only show selector if meal type isn't locked by the sheet */}
        {!lockedMealType && (
          <MealTypeSelector selected={mealType} onSelect={setMealType} />
        )}

        <View style={styles.inputContainer}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            What did you eat?
          </ThemedText>
          <TextInput
            style={[inputStyle, styles.multilineInput]}
            placeholder="Describe your meal..."
            placeholderTextColor={colors.textMuted}
            value={foodDescription}
            onChangeText={setFoodDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <MoodRatingSelector selected={moodRating} onSelect={setMoodRating} />

        <PhysicalFeelingsSelector
          selected={physicalFeelings}
          onToggle={togglePhysicalFeeling}
        />

        <EmotionalFeelingsSelector
          selected={emotionalFeelings}
          onToggle={toggleEmotionalFeeling}
        />

        <View style={styles.inputContainer}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Additional Notes (Optional)
          </ThemedText>
          <TextInput
            style={[inputStyle, styles.notesInput]}
            placeholder="Any other thoughts about this meal..."
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(139, 92, 246, 0.5)',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  saveButtonTextDisabled: {
    opacity: 0.7,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  prefillBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  prefillBannerText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8B5CF6',
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 12,
  },
  textInput: {
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 80,
  },
  notesInput: {
    minHeight: 100,
  },
  bottomSpacer: {
    height: 40,
  },
});
