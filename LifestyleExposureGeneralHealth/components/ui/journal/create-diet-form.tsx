// components/ui/journal/create-diet-form.tsx
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  useColorScheme,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AVAILABLE_MEAL_TYPES, CreateDietInput } from '@/types/journal';

interface CreateDietFormProps {
  onSubmit: (diet: CreateDietInput) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<CreateDietInput>;
  isEditing?: boolean;
}

export function CreateDietForm({
  onSubmit,
  onCancel,
  initialData,
  isEditing = false,
}: CreateDietFormProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [dietName, setDietName] = useState(initialData?.diet_name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [selectedMeals, setSelectedMeals] = useState<string[]>(
    initialData?.meal_structure || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleMeal = (mealKey: string) => {
    setSelectedMeals((prev) => {
      if (prev.includes(mealKey)) {
        return prev.filter((m) => m !== mealKey);
      } else {
        const newMeals = [...prev, mealKey];
        return newMeals.sort((a, b) => {
          const indexA = AVAILABLE_MEAL_TYPES.findIndex((m) => m.key === a);
          const indexB = AVAILABLE_MEAL_TYPES.findIndex((m) => m.key === b);
          return indexA - indexB;
        });
      }
    });
  };

  const handleSubmit = async () => {
    if (!dietName.trim()) {
      Alert.alert('Error', 'Please enter a diet name');
      return;
    }
    if (selectedMeals.length === 0) {
      Alert.alert('Error', 'Please select at least one meal');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        diet_name: dietName.trim(),
        description: description.trim() || undefined,
        meal_structure: selectedMeals,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to save diet. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: isDark ? '#2D2D3D' : '#F5F5F5',
      color: isDark ? '#FFFFFF' : '#000000',
      borderColor: isDark ? '#3D3D4D' : '#E0E0E0',
    },
  ];

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
          <Ionicons name="close" size={24} color={isDark ? '#FFFFFF' : '#000000'} />
        </TouchableOpacity>
        <ThemedText style={styles.title}>
          {isEditing ? 'Edit Diet Plan' : 'Create Diet Plan'}
        </ThemedText>
        <TouchableOpacity
          onPress={handleSubmit}
          style={styles.headerButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#8B5CF6" />
          ) : (
            <ThemedText style={styles.saveText}>Save</ThemedText>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Diet Name */}
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Diet Name *</ThemedText>
          <TextInput
            style={inputStyle}
            value={dietName}
            onChangeText={setDietName}
            placeholder="e.g., My Custom Diet"
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            maxLength={50}
            autoCapitalize="words"
          />
          <ThemedText style={styles.charCount}>{dietName.length}/50</ThemedText>
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Description (Optional)</ThemedText>
          <TextInput
            style={[inputStyle, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your diet plan..."
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            multiline
            numberOfLines={3}
            maxLength={200}
            textAlignVertical="top"
          />
          <ThemedText style={styles.charCount}>{description.length}/200</ThemedText>
        </View>

        {/* Meal Selection */}
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>
            Select Meals * ({selectedMeals.length} selected)
          </ThemedText>
          <ThemedText style={styles.hint}>
            Tap to select the meals in your diet plan. They will be ordered chronologically.
          </ThemedText>

          <View style={styles.mealsGrid}>
            {AVAILABLE_MEAL_TYPES.map((meal) => {
              const isSelected = selectedMeals.includes(meal.key);
              return (
                <TouchableOpacity
                  key={meal.key}
                  style={[
                    styles.mealChip,
                    {
                      backgroundColor: isSelected
                        ? '#8B5CF6'
                        : isDark
                          ? '#2D2D3D'
                          : '#F5F5F5',
                      borderColor: isSelected
                        ? '#8B5CF6'
                        : isDark
                          ? '#3D3D4D'
                          : '#E0E0E0',
                    },
                  ]}
                  onPress={() => toggleMeal(meal.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={meal.icon as any}
                    size={16}
                    color={isSelected ? '#FFFFFF' : isDark ? '#AAAAAA' : '#555555'}
                  />
                  <ThemedText
                    style={[
                      styles.mealChipLabel,
                      { color: isSelected ? '#FFFFFF' : isDark ? '#FFFFFF' : '#000000' },
                    ]}
                  >
                    {meal.label}
                  </ThemedText>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#FFFFFF"
                      style={styles.mealChipCheck}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Meals Preview */}
        {selectedMeals.length > 0 && (
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Meal Order Preview</ThemedText>
            <View
              style={[
                styles.previewContainer,
                {
                  backgroundColor: isDark ? '#1A1A2E' : '#F0EBF8',
                  borderColor: isDark ? '#3D3D4D' : '#D8C8F0',
                },
              ]}
            >
              {selectedMeals.map((mealKey, index) => {
                const meal = AVAILABLE_MEAL_TYPES.find((m) => m.key === mealKey);
                if (!meal) return null;
                return (
                  <View key={mealKey} style={styles.previewRow}>
                    <ThemedText style={styles.previewIndex}>{index + 1}.</ThemedText>
                    <Ionicons name={meal.icon as any} size={16} color="#8B5CF6" />
                    <ThemedText style={styles.previewLabel}>{meal.label}</ThemedText>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  headerButton: {
    minWidth: 48,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    opacity: 0.85,
  },
  hint: {
    fontSize: 12,
    opacity: 0.55,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 10,
  },
  charCount: {
    fontSize: 11,
    opacity: 0.45,
    textAlign: 'right',
    marginTop: 4,
  },
  mealsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mealChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  mealChipLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  mealChipCheck: {
    marginLeft: 2,
  },
  previewContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewIndex: {
    fontSize: 13,
    opacity: 0.5,
    width: 20,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});
