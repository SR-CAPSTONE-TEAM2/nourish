// components/ui/journal/meal-entry-card.tsx

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MealEntry } from '@/types/diets-meals';
import { MEAL_TYPES, MOOD_RATINGS, PHYSICAL_FEELINGS, EMOTIONAL_FEELINGS } from '@/constants/journal';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/context/theme-context';

interface MealEntryCardProps {
  entry: MealEntry;
  onEdit: (entry: MealEntry) => void;
  onDelete: (id: string) => void;
}

export const MealEntryCard: React.FC<MealEntryCardProps> = ({
  entry,
  onEdit,
  onDelete,
}) => {
  const { isDark, colors } = useTheme();

  const mealTypeInfo = MEAL_TYPES.find((m) => m.value === entry.mealType);
  const moodInfo = MOOD_RATINGS.find((m) => m.value === entry.moodRating);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(entry.id),
        },
      ]
    );
  };

  const getPhysicalFeelingLabel = (value: string) => {
    return PHYSICAL_FEELINGS.find((f) => f.value === value);
  };

  const getEmotionalFeelingLabel = (value: string) => {
    return EMOTIONAL_FEELINGS.find((f) => f.value === value);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          shadowColor: isDark ? '#000' : '#8B5CF6',
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.mealTypeContainer}>
          <ThemedText style={styles.mealTypeIcon}>{mealTypeInfo?.icon}</ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.mealTypeLabel}>
            {mealTypeInfo?.label}
          </ThemedText>
        </View>
        <View
          style={[
            styles.moodBadge,
            { backgroundColor: colors.surfaceHighlight },
          ]}
        >
          <ThemedText style={styles.moodEmoji}>{moodInfo?.emoji}</ThemedText>
        </View>
      </View>

      {/* Timestamp */}
      <ThemedText style={styles.timestamp}>{formatDate(entry.timestamp)}</ThemedText>

      {/* Food Description */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>What I ate</ThemedText>
        <ThemedText style={styles.foodDescription}>{entry.foodDescription}</ThemedText>
      </View>

      {/* Physical Feelings */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Physical feelings</ThemedText>
        <View style={styles.tagsContainer}>
          {entry.physicalFeelings.map((feeling) => {
            const feelingInfo = getPhysicalFeelingLabel(feeling);
            return (
              <View
                key={feeling}
                style={[
                  styles.tag,
                  { backgroundColor: isDark ? colors.surfaceHighlight : 'rgba(139, 92, 246, 0.1)' },
                ]}
              >
                <ThemedText style={styles.tagText}>
                  {feelingInfo?.icon} {feelingInfo?.label}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </View>

      {/* Emotional Feelings */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Emotional feelings</ThemedText>
        <View style={styles.tagsContainer}>
          {entry.emotionalFeelings.map((feeling) => {
            const feelingInfo = getEmotionalFeelingLabel(feeling);
            return (
              <View
                key={feeling}
                style={[
                  styles.tag,
                  styles.emotionalTag,
                  { backgroundColor: isDark ? colors.surfaceHighlight : 'rgba(59, 130, 246, 0.1)' },
                ]}
              >
                <ThemedText style={styles.tagText}>
                  {feelingInfo?.icon} {feelingInfo?.label}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </View>

      {/* Notes */}
      {entry.notes ? (
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Notes</ThemedText>
          <ThemedText style={styles.notes}>{entry.notes}</ThemedText>
        </View>
      ) : null}

      {/* Actions */}
      <View
        style={[
          styles.actions,
          { borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: colors.surfaceHighlight },
          ]}
          onPress={() => onEdit(entry)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="pencil-outline"
            size={16}
            color={colors.icon}
          />
          <ThemedText style={styles.actionButtonText}>Edit</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.deleteButton,
            { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
          ]}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
          <ThemedText style={[styles.actionButtonText, styles.deleteButtonText]}>
            Delete
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealTypeIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  mealTypeLabel: {
    fontSize: 18,
  },
  moodBadge: {
    borderRadius: 16,
    padding: 8,
  },
  moodEmoji: {
    fontSize: 24,
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 16,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.5,
    marginBottom: 8,
  },
  foodDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  emotionalTag: {},
  tagText: {
    fontSize: 12,
  },
  notes: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
    opacity: 0.8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {},
  deleteButtonText: {
    color: '#EF4444',
  },
});
