// components/ui/journal/create-diet-form.tsx
import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  useColorScheme,
  Alert,
  ActivityIndicator,
  Keyboard,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AVAILABLE_MEAL_TYPES, CreateDietInput, MealType } from '@/types/journal';

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
  const [selectedMeals, setSelectedMeals] = useState<MealType[]>(
    (initialData?.meal_structure as MealType[]) || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Store initial values for comparison using refs
  const initialValuesRef = useRef({
    dietName: initialData?.diet_name || '',
    description: initialData?.description || '',
    mealStructure: JSON.stringify(initialData?.meal_structure || []),
  });

  const toggleMeal = useCallback((mealKey: MealType) => {
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
  }, []);

  const hasUnsavedChanges = useCallback((): boolean => {
    const initial = initialValuesRef.current;
    const hasChanges =
      dietName !== initial.dietName ||
      description !== initial.description ||
      JSON.stringify(selectedMeals) !== initial.mealStructure;
    return hasChanges;
  }, [dietName, description, selectedMeals]);

  const handleSubmit = useCallback(async () => {
    Keyboard.dismiss();

    // Validation
    if (!dietName.trim()) {
      Alert.alert('Validation Error', 'Please enter a diet name');
      return;
    }

    if (selectedMeals.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one meal');
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
      console.log('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [dietName, selectedMeals, description, onSubmit]);

  const handleCancel = useCallback(() => {
    // Dismiss keyboard first
    Keyboard.dismiss();

    // Use a longer timeout to ensure keyboard is fully dismissed
    const timeoutId = setTimeout(() => {
      if (hasUnsavedChanges()) {
        Alert.alert(
          'Discard Changes?',
          'You have unsaved changes. Are you sure you want to discard them?',
          [
            { text: 'Keep Editing', style: 'cancel' },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: onCancel,
            },
          ]
        );
      } else {
        onCancel();
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [hasUnsavedChanges, onCancel]);

  const clearAllMeals = useCallback(() => {
    if (selectedMeals.length > 0) {
      Alert.alert(
        'Clear All Meals?',
        'Are you sure you want to remove all selected meals?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear All',
            style: 'destructive',
            onPress: () => setSelectedMeals([]),
          },
        ]
      );
    }
  }, [selectedMeals.length]);

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
      <View
        style={[
          styles.header,
          { borderBottomColor: isDark ? '#2D2D3D' : '#EBEBEB' },
        ]}
      >
        <Pressable
          onPress={handleCancel}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.headerButtonPressed,
          ]}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Ionicons
            name="close"
            size={24}
            color={isDark ? '#FFFFFF' : '#000000'}
          />
        </Pressable>

        <ThemedText style={styles.title}>
          {isEditing ? 'Edit Diet Plan' : 'Create Diet Plan'}
        </ThemedText>

        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && !isSubmitting && styles.headerButtonPressed,
          ]}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#8B5CF6" />
          ) : (
            <ThemedText style={styles.saveText}>Save</ThemedText>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
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
            autoFocus={!isEditing}
            returnKeyType="next"
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
            returnKeyType="done"
            blurOnSubmit={true}
          />
          <ThemedText style={styles.charCount}>
            {description.length}/200
          </ThemedText>
        </View>

        {/* Meal Selection */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <ThemedText style={styles.label}>
              Select Meals * ({selectedMeals.length} selected)
            </ThemedText>
            {selectedMeals.length > 0 && (
              <Pressable onPress={clearAllMeals} hitSlop={8}>
                <ThemedText style={styles.clearText}>Clear All</ThemedText>
              </Pressable>
            )}
          </View>
          <ThemedText style={styles.hint}>
            Tap to select the meals in your diet plan. They will be ordered
            chronologically.
          </ThemedText>

          <View style={styles.mealsGrid}>
            {AVAILABLE_MEAL_TYPES.map((meal) => {
              const isSelected = selectedMeals.includes(meal.key);
              return (
                <Pressable
                  key={meal.key}
                  style={({ pressed }) => [
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
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  onPress={() => toggleMeal(meal.key)}
                >
                  <Ionicons
                    name={meal.icon as any}
                    size={16}
                    color={
                      isSelected ? '#FFFFFF' : isDark ? '#AAAAAA' : '#555555'
                    }
                  />
                  <ThemedText
                    style={[
                      styles.mealChipLabel,
                      {
                        color: isSelected
                          ? '#FFFFFF'
                          : isDark
                            ? '#FFFFFF'
                            : '#000000',
                      },
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
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Selected Meals Preview */}
        {selectedMeals.length > 0 && (
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Meal Order Preview</ThemedText>
            <ThemedText style={styles.hint}>
              This is how your meals will appear in your daily journal. Tap the X
              to remove a meal.
            </ThemedText>
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
                    <View
                      style={[
                        styles.previewNumber,
                        { backgroundColor: isDark ? '#3D3D4D' : '#D8C8F0' },
                      ]}
                    >
                      <ThemedText style={styles.previewNumberText}>
                        {index + 1}
                      </ThemedText>
                    </View>
                    <Ionicons name={meal.icon as any} size={18} color="#8B5CF6" />
                    <ThemedText style={styles.previewLabel}>
                      {meal.label}
                    </ThemedText>
                    <Pressable
                      onPress={() => toggleMeal(mealKey)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={({ pressed }) => [
                        styles.removeButton,
                        { opacity: pressed ? 0.5 : 1 },
                      ]}
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={isDark ? '#666' : '#999'}
                      />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Tips Section */}
        <View
          style={[
            styles.tipsContainer,
            {
              backgroundColor: isDark
                ? 'rgba(139, 92, 246, 0.1)'
                : 'rgba(139, 92, 246, 0.05)',
              borderColor: isDark
                ? 'rgba(139, 92, 246, 0.2)'
                : 'rgba(139, 92, 246, 0.15)',
            },
          ]}
        >
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={18} color="#8B5CF6" />
            <ThemedText style={styles.tipsTitle}>Tips</ThemedText>
          </View>
          <ThemedText style={styles.tipText}>
            • Choose meal slots that match your typical eating schedule
          </ThemedText>
          <ThemedText style={styles.tipText}>
            • You can always edit your diet plan later
          </ThemedText>
          <ThemedText style={styles.tipText}>
            • Consider including snacks if you eat between meals
          </ThemedText>
        </View>

        {/* Bottom Spacer */}
        <View style={{ height: 40 }} />
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
  },
  headerButton: {
    minWidth: 48,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonPressed: {
    opacity: 0.5,
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
  },
  inputGroup: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.85,
  },
  clearText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    opacity: 0.55,
    marginBottom: 12,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
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
    gap: 10,
    paddingVertical: 4,
  },
  previewNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewNumberText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
  },
  previewLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  removeButton: {
    padding: 4,
  },
  tipsContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  tipText: {
    fontSize: 13,
    opacity: 0.65,
    lineHeight: 20,
    paddingLeft: 4,
  },
});
