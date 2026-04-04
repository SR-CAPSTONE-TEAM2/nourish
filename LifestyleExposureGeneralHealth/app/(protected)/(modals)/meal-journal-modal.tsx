// (protected)/modals/meal-journal-modal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
  Image,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { TemplateMeal } from '@/types/diets-meals';
import { useMealJournalEntries, JournalEntry } from '@/hooks/useMealJournalEntries';
import { useUserDiet } from '@/hooks/useUserDiet';


interface MealJournalModalProps {
  visible: boolean;
  meal: TemplateMeal | null;
  mealType: { key: string; label: string; icon: string } | null;
  onClose: () => void;
}

// ─── Helper Functions ────────────────────────────────────────────────────────
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

/** Journal entry card */
function JournalEntryCard({
  entry,
  isDark,
  onDelete,
}: {
  entry: JournalEntry;
  isDark: boolean;
  onDelete: () => void;
}) {

  return (
    <View
      style={[
        styles.entryCard,
        { backgroundColor: isDark ? '#252536' : '#F8F8FA' },
      ]}
    >
      <View style={styles.entryHeader}>
        <ThemedText style={styles.entryTime}>
          {formatTime(entry.timestamp)}
        </ThemedText>
        <TouchableOpacity onPress={onDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={14} color={isDark ? '#666' : '#AAA'} />
        </TouchableOpacity>
      </View>
      <ThemedText style={styles.entryText}>{entry.text}</ThemedText>
    </View>
  );
}

/** New entry input */
function NewEntryInput({
  value,
  onChange,
  onSubmit,
  onCancel,
  isDark,
  isExpanded,
  onFocus,
}: {
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isDark: boolean;
  isExpanded: boolean;
  onFocus: () => void;
}) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  if (!isExpanded) {
    return (
      <TouchableOpacity
        style={[
          styles.addEntryButton,
          { backgroundColor: isDark ? '#252536' : '#F0EBF8' },
        ]}
        onPress={onFocus}
        activeOpacity={0.7}
      >
        <Ionicons name="add-circle" size={20} color="#8B5CF6" />
        <ThemedText style={styles.addEntryButtonText}>Add journal entry</ThemedText>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.newEntryContainer,
        { backgroundColor: isDark ? '#252536' : '#FFFFFF' },
      ]}
    >
      <TextInput
        ref={inputRef}
        style={[
          styles.newEntryInput,
          {
            backgroundColor: isDark ? '#1E1E2E' : '#F8F8FA',
            color: isDark ? '#FFFFFF' : '#111111',
          },
        ]}
        placeholder="How was this meal? How do you feel?"
        placeholderTextColor={isDark ? '#666' : '#AAA'}
        value={value}
        onChangeText={onChange}
        multiline
        textAlignVertical="top"
      />
      <View style={styles.newEntryActions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
        >
          <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.submitButton,
            { opacity: value.trim() ? 1 : 0.5 },
          ]}
          onPress={onSubmit}
          disabled={!value.trim()}
        >
          <Ionicons name="send" size={16} color="#FFFFFF" />
          <ThemedText style={styles.submitButtonText}>Save</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function MealJournalModal({
  visible,
  meal,
  mealType,
  onClose,
}: MealJournalModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { entries, addEntry, deleteEntry, isLoading } = useMealJournalEntries(meal?.meal_id);
  const [rating, setRating] = useState<number | null>(meal?.rating ?? null);
  const { refreshDiets } = useUserDiet();
  const [newEntryText, setNewEntryText] = useState('');
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // Animation on open/close
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setNewEntryText('');
      setIsInputExpanded(false);
    } else {
      setRating(meal?.rating ?? null);
    }
  }, [visible, meal]);

  const handleAddEntry = async () => {
    if (!newEntryText.trim()) return;
    const ok = await addEntry(newEntryText);
    if (ok) {
      setNewEntryText('');
      setIsInputExpanded(false);
      Keyboard.dismiss();
    }
  };

  const handleDeleteEntry = (entryId: string) => deleteEntry(entryId);

  const handleCancelEntry = () => {
    setNewEntryText('');
    setIsInputExpanded(false);
    Keyboard.dismiss();
  };

  const handleRatingPress = async (star: number) => {
    if (!meal?.meal_id) return;
    const newRating = rating === star ? null : star;
    setRating(newRating); // optimistic

    const { error } = await supabase
      .from('user_meals')
      .update({ meal_rating: newRating })
      .eq('meal_id', meal.meal_id);

    if (error) {
      console.error('Failed to save rating:', error);
      setRating(rating); // revert on failure
    } else {
      await refreshDiets(); // sync back to parent
    }
  };
  if (!meal || !mealType) return null;

  // Group entries by date
  const groupedEntries = entries.reduce<Record<string, JournalEntry[]>>((acc, entry) => {
    const dateKey = formatDate(entry.timestamp);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(entry);
    return acc;
  }, {});

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            styles.overlay,
            { opacity: overlayAnim },
          ]}
        />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.modalContainer,
            {
              backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF',
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleBar}>
            <View style={[styles.handle, { backgroundColor: isDark ? '#3D3D4D' : '#D0D0D0' }]} />
          </View>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: isDark ? '#2D2D3D' : '#EBEBEB' }]}>
            <View style={styles.headerTitleRow}>
              <Ionicons name={mealType.icon as any} size={20} color="#8B5CF6" />
              <ThemedText style={styles.headerTitle}>{meal.name}</ThemedText>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close-circle" size={28} color={isDark ? '#555' : '#CCC'} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Left Side - Meal Info (25%) */}
            <View style={styles.leftPanel}>
              {/* Meal Image */}
              <View
                style={[
                  styles.mealImageContainer,
                  { backgroundColor: isDark ? '#2D2D3D' : '#F0EBF8' },
                ]}
              >
                <ThemedText style={styles.mealImageEmoji}>🍽️</ThemedText>
              </View>

              {/* Nutritional Info */}
              <View style={styles.nutritionContainer}>
                <View style={styles.nutritionItem}>
                  <ThemedText style={[styles.nutritionValue, { color: '#f97316' }]}>
                    {meal.totalCalories}
                  </ThemedText>
                  <ThemedText style={styles.nutritionLabel}>kcal</ThemedText>
                </View>

                <View style={styles.nutritionDivider} />

                <View style={styles.nutritionItem}>
                  <ThemedText style={[styles.nutritionValue, { color: '#34d399' }]}>
                    {meal.totalProtein}g
                  </ThemedText>
                  <ThemedText style={styles.nutritionLabel}>protein</ThemedText>
                </View>

                <View style={styles.nutritionDivider} />

                <View style={styles.nutritionItem}>
                  <ThemedText style={[styles.nutritionValue, { color: '#a78bfa' }]}>
                    {meal.totalCarbs}g
                  </ThemedText>
                  <ThemedText style={styles.nutritionLabel}>carbs</ThemedText>
                </View>

                <View style={styles.nutritionDivider} />

                <View style={styles.nutritionItem}>
                  <ThemedText style={[styles.nutritionValue, { color: '#60a5fa' }]}>
                    {meal.totalFat}g
                  </ThemedText>
                  <ThemedText style={styles.nutritionLabel}>fat</ThemedText>
                </View>
              </View>

              {/* Rating */}
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => handleRatingPress(star)}
                    hitSlop={6}
                  >
                    <Ionicons
                      name={rating && rating >= star ? 'star' : 'star-outline'}
                      size={18}                              // ← slightly larger since now interactive
                      color={rating && rating >= star ? '#fbbf24' : isDark ? '#444' : '#CCC'}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Ingredients count */}
              {meal.ingredients && meal.ingredients.length > 0 && (
                <ThemedText style={styles.ingredientsCount}>
                  {meal.ingredients.length} ingredients
                </ThemedText>
              )}
            </View>

            {/* Right Side - Journal Timeline (75%) */}
            <View style={styles.rightPanel}>
              {/* Add Entry Button/Input */}
              <NewEntryInput
                value={newEntryText}
                onChange={setNewEntryText}
                onSubmit={handleAddEntry}
                onCancel={handleCancelEntry}
                isDark={isDark}
                isExpanded={isInputExpanded}
                onFocus={() => setIsInputExpanded(true)}
              />

              {/* Journal Timeline */}
              <ScrollView
                style={styles.entriesScroll}
                contentContainerStyle={styles.entriesScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {entries.length === 0 ? (
                  <View style={styles.emptyEntries}>
                    <Ionicons
                      name="journal-outline"
                      size={32}
                      color={isDark ? '#444' : '#CCC'}
                    />
                    <ThemedText style={styles.emptyEntriesText}>
                      No journal entries yet
                    </ThemedText>
                    <ThemedText style={styles.emptyEntriesHint}>
                      Tap above to add your first entry
                    </ThemedText>
                  </View>
                ) : (
                  Object.entries(groupedEntries).map(([dateLabel, dateEntries]) => (
                    <View key={dateLabel} style={styles.dateGroup}>
                      <ThemedText style={styles.dateLabel}>{dateLabel}</ThemedText>
                      {dateEntries.map((entry) => (
                        <JournalEntryCard
                          key={entry.id}
                          entry={entry}
                          isDark={isDark}
                          onDelete={() => handleDeleteEntry(entry.id)}
                        />
                      ))}
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '60%',
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },

  // Left Panel (25%)
  leftPanel: {
    width: '28%',
    padding: 12,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#2D2D3D',
    alignItems: 'center',
    gap: 12,
  },
  mealImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealImageEmoji: {
    fontSize: 36,
  },
  nutritionContainer: {
    width: '100%',
    gap: 8,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  nutritionLabel: {
    fontSize: 9,
    opacity: 0.5,
    textTransform: 'uppercase',
  },
  nutritionDivider: {
    height: 1,
    backgroundColor: '#3D3D4D',
    opacity: 0.2,
    marginVertical: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  ingredientsCount: {
    fontSize: 10,
    opacity: 0.5,
    textAlign: 'center',
  },

  // Right Panel (75%)
  rightPanel: {
    flex: 1,
    padding: 12,
    gap: 12,
  },
  addEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addEntryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8B5CF6',
  },
  newEntryContainer: {
    borderRadius: 12,
    padding: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  newEntryInput: {
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    minHeight: 72,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  newEntryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newEntryMeta: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  entryActionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#8B5CF6',
  },
  submitButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },

  // Timeline
  entriesScroll: {
    flex: 1,
  },
  entriesScrollContent: {
    paddingVertical: 8,
    gap: 4,
  },
  emptyEntries: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyEntriesText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.4,
  },
  emptyEntriesHint: {
    fontSize: 12,
    opacity: 0.3,
    textAlign: 'center',
  },
  dateGroup: {
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  entryCard: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  entryTime: {
    fontSize: 11,
    opacity: 0.45,
    fontWeight: '500',
  },
  entryText: {
    fontSize: 14,
    lineHeight: 20,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelButtonText: {
    fontSize: 13,
    opacity: 0.5,
  },
});
