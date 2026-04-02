// components/ui/journal/meal-journal-sheet.tsx
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  useColorScheme,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MealEntryForm } from '@/components/ui/journal/meal-entry-form';
import { MealEntryCard } from '@/components/ui/journal/meal-entry-card';
import { useMealEntries } from '@/hooks/useMealEntries';
import { MealEntry, TemplateMeal } from '@/types/journal';

interface MealJournalSheetProps {
  mealKey: string;
  mealLabel: string;
  mealIcon: string;
  templateMeals?: TemplateMeal[];
  onClose: () => void;
}

/** Template meal card displayed in the planned meals section */
function TemplateMealCard({
  meal,
  isDark,
  onLogThis,
}: {
  meal: TemplateMeal;
  isDark: boolean;
  onLogThis: () => void;
}) {
  return (
    <View
      style={[
        styles.templateMealCard,
        { backgroundColor: isDark ? '#1E1E2E' : '#FFFFFF' },
      ]}
    >
      <View
        style={[
          styles.templateImagePlaceholder,
          { backgroundColor: isDark ? '#2D2D3D' : '#F0EBF8' },
        ]}
      >
        <ThemedText style={styles.templateEmoji}>🍽️</ThemedText>
      </View>

      <View style={styles.templateInfo}>
        <ThemedText style={styles.templateName} numberOfLines={1}>
          {meal.name}
        </ThemedText>

        <View style={styles.templateMacrosRow}>
          <ThemedText style={[styles.templateMacroText, { color: '#f97316' }]}>
            {meal.totalCalories} kcal
          </ThemedText>
          <ThemedText style={[styles.templateMacroText, { color: '#34d399' }]}>
            P: {meal.totalProtein}g
          </ThemedText>
          <ThemedText style={[styles.templateMacroText, { color: '#a78bfa' }]}>
            C: {meal.totalCarbs}g
          </ThemedText>
          <ThemedText style={[styles.templateMacroText, { color: '#60a5fa' }]}>
            F: {meal.totalFat}g
          </ThemedText>
        </View>

        <View style={styles.templateRatingRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={meal.rating && meal.rating >= star ? 'star' : 'star-outline'}
              size={12}
              color={meal.rating && meal.rating >= star ? '#fbbf24' : isDark ? '#444' : '#CCC'}
            />
          ))}
          {meal.ingredients && meal.ingredients.length > 0 && (
            <ThemedText style={styles.templateIngredientCount}>
              {meal.ingredients.length} {meal.ingredients.length === 1 ? 'ingredient' : 'ingredients'}
            </ThemedText>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={styles.logThisButton}
        onPress={onLogThis}
        activeOpacity={0.7}
      >
        <Ionicons name="add-circle" size={24} color="#8B5CF6" />
      </TouchableOpacity>
    </View>
  );
}

export function MealJournalSheet({
  mealKey,
  mealLabel,
  mealIcon,
  templateMeals = [],
  onClose,
}: MealJournalSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { entries, isLoading, addEntry, updateEntry, deleteEntry } =
    useMealEntries(mealKey);

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MealEntry | null>(null);
  const [prefillMeal, setPrefillMeal] = useState<TemplateMeal | null>(null);

  const handleEdit = (entry: MealEntry) => {
    setEditingEntry(entry);
    setPrefillMeal(null);
    setIsFormVisible(true);
  };

  const handleLogTemplateMeal = (meal: TemplateMeal) => {
    setPrefillMeal(meal);
    setEditingEntry(null);
    setIsFormVisible(true);
  };

  const handleCloseForm = () => {
    setIsFormVisible(false);
    setEditingEntry(null);
    setPrefillMeal(null);
  };

  const handleSubmit = async (entryData: Omit<MealEntry, 'id' | 'createdAt'>) => {
    if (editingEntry) {
      await updateEntry({ ...editingEntry, ...entryData });
    } else {
      await addEntry(entryData);
    }
    handleCloseForm();
  };

  // Use the most recent entry's image in the header if available
  const latestImage = (entries[0] as any)?.imageUrl ?? null;

  // Calculate totals from template meals
  const plannedTotals = templateMeals.reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.totalCalories || 0),
      protein: acc.protein + (meal.totalProtein || 0),
      carbs: acc.carbs + (meal.totalCarbs || 0),
      fat: acc.fat + (meal.totalFat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <ThemedView style={styles.container}>
      {/* Sheet Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: isDark ? '#2D2D3D' : '#EBEBEB' },
        ]}
      >
        {/* ~20% width: meal image or icon placeholder */}
        <View style={styles.imageArea}>
          {latestImage ? (
            <Image source={{ uri: latestImage }} style={styles.mealImage} />
          ) : (
            <View
              style={[
                styles.iconPlaceholder,
                { backgroundColor: isDark ? '#2D2D3D' : '#F0EBF8' },
              ]}
            >
              <Ionicons name={mealIcon as any} size={28} color="#8B5CF6" />
            </View>
          )}
        </View>

        {/* Meal title + entry count */}
        <View style={styles.headerMeta}>
          <ThemedText style={styles.sheetTitle}>{mealLabel}</ThemedText>
          {!isLoading && (
            <ThemedText style={styles.entryCountText}>
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'} logged
            </ThemedText>
          )}
        </View>

        <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={8}>
          <Ionicons
            name="close-circle"
            size={28}
            color={isDark ? '#555' : '#CCC'}
          />
        </TouchableOpacity>
      </View>

      {/* Planned Meals Summary */}
      {templateMeals.length > 0 && plannedTotals.calories > 0 && (
        <View style={[styles.plannedSummary, { backgroundColor: isDark ? '#1A1A2E' : '#FAFAFA' }]}>
          <ThemedText style={styles.plannedSummaryTitle}>Planned for this meal</ThemedText>
          <View style={styles.plannedMacros}>
            <View style={styles.plannedMacroItem}>
              <ThemedText style={[styles.plannedMacroValue, { color: '#f97316' }]}>
                {plannedTotals.calories}
              </ThemedText>
              <ThemedText style={styles.plannedMacroLabel}>kcal</ThemedText>
            </View>
            <View style={styles.plannedMacroDivider} />
            <View style={styles.plannedMacroItem}>
              <ThemedText style={[styles.plannedMacroValue, { color: '#34d399' }]}>
                {plannedTotals.protein}g
              </ThemedText>
              <ThemedText style={styles.plannedMacroLabel}>protein</ThemedText>
            </View>
            <View style={styles.plannedMacroDivider} />
            <View style={styles.plannedMacroItem}>
              <ThemedText style={[styles.plannedMacroValue, { color: '#a78bfa' }]}>
                {plannedTotals.carbs}g
              </ThemedText>
              <ThemedText style={styles.plannedMacroLabel}>carbs</ThemedText>
            </View>
            <View style={styles.plannedMacroDivider} />
            <View style={styles.plannedMacroItem}>
              <ThemedText style={[styles.plannedMacroValue, { color: '#60a5fa' }]}>
                {plannedTotals.fat}g
              </ThemedText>
              <ThemedText style={styles.plannedMacroLabel}>fat</ThemedText>
            </View>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Planned Meals Section */}
        {templateMeals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar-outline" size={16} color="#8B5CF6" />
              <ThemedText style={styles.sectionTitle}>Planned Meals</ThemedText>
              <View style={styles.sectionBadge}>
                <ThemedText style={styles.sectionBadgeText}>{templateMeals.length}</ThemedText>
              </View>
            </View>
            <ThemedText style={styles.sectionHint}>
              Tap + to quickly log a planned meal
            </ThemedText>
            <View style={styles.templateMealsList}>
              {templateMeals.map((meal) => (
                <TemplateMealCard
                  key={meal.id}
                  meal={meal}
                  isDark={isDark}
                  onLogThis={() => handleLogTemplateMeal(meal)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Divider if both sections have content */}
        {templateMeals.length > 0 && (entries.length > 0 || !isLoading) && (
          <View style={[styles.sectionDivider, { backgroundColor: isDark ? '#2D2D3D' : '#E8E8E8' }]} />
        )}

        {/* Entry History Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={16} color="#8B5CF6" />
            <ThemedText style={styles.sectionTitle}>{`Today's Entries`}</ThemedText>
            {entries.length > 0 && (
              <View style={styles.sectionBadge}>
                <ThemedText style={styles.sectionBadgeText}>{entries.length}</ThemedText>
              </View>
            )}
          </View>

          {isLoading ? (
            <ActivityIndicator
              size="large"
              color="#8B5CF6"
              style={styles.loader}
            />
          ) : entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="journal-outline"
                size={44}
                color="#8B5CF6"
                style={{ opacity: 0.4 }}
              />
              <ThemedText style={styles.emptyTitle}>No entries yet</ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                {templateMeals.length > 0
                  ? 'Log a planned meal above or add a custom entry below.'
                  : `Tap below to log your first ${mealLabel.toLowerCase()} entry.`}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.entriesList}>
              {entries.map((entry) => (
                <MealEntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={() => handleEdit(entry)}
                  onDelete={() => deleteEntry(entry.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer: Add Entry */}
      <View
        style={[
          styles.footer,
          { borderTopColor: isDark ? '#2D2D3D' : '#EBEBEB' },
        ]}
      >
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setEditingEntry(null);
            setPrefillMeal(null);
            setIsFormVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <ThemedText style={styles.addButtonText}>Add Custom Entry</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Nested Entry Form Modal */}
      <Modal
        visible={isFormVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseForm}
      >
        <ThemedView style={{ flex: 1 }}>
          <MealEntryForm
            onSubmit={handleSubmit}
            onCancel={handleCloseForm}
            initialEntry={editingEntry ?? undefined}
            lockedMealType={mealKey}
            prefillMeal={prefillMeal ?? undefined}
          />
        </ThemedView>
      </Modal>
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
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  imageArea: {
    width: '20%',
  },
  mealImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
  },
  iconPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerMeta: {
    flex: 1,
    gap: 2,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  entryCountText: {
    fontSize: 13,
    opacity: 0.5,
  },
  closeButton: {
    padding: 4,
  },

  // Planned Summary
  plannedSummary: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
  },
  plannedSummaryTitle: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  plannedMacros: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  plannedMacroItem: {
    flex: 1,
    alignItems: 'center',
  },
  plannedMacroValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  plannedMacroLabel: {
    fontSize: 9,
    opacity: 0.5,
    marginTop: 1,
  },
  plannedMacroDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#3D3D4D',
    opacity: 0.3,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // Section
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  sectionBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHint: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: -4,
  },
  sectionDivider: {
    height: 1,
    marginVertical: 16,
  },

  // Template Meals
  templateMealsList: {
    gap: 8,
  },
  templateMealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  templateImagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateEmoji: {
    fontSize: 20,
  },
  templateInfo: {
    flex: 1,
    gap: 3,
  },
  templateName: {
    fontSize: 14,
    fontWeight: '600',
  },
  templateMacrosRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  templateMacroText: {
    fontSize: 10,
    fontWeight: '500',
  },
  templateRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  templateIngredientCount: {
    fontSize: 9,
    opacity: 0.5,
    marginLeft: 6,
  },
  logThisButton: {
    padding: 4,
  },

  // Entries List
  entriesList: {
    gap: 10,
  },

  // Loader
  loader: {
    marginTop: 60,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    opacity: 0.6,
  },
  emptySubtitle: {
    fontSize: 13,
    opacity: 0.45,
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  // Footer
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
