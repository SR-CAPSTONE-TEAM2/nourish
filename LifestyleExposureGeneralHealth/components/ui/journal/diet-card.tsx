// components/ui/journal/diet-card.tsx
import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { Diet, AVAILABLE_MEAL_TYPES } from '@/types/journal';

interface DietCardProps {
  diet: Diet;
  isSelected: boolean;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onActivate: () => void;
  onDelete: () => void;
}

export function DietCard({
  diet,
  isSelected,
  isActive,
  onSelect,
  onEdit,
  onActivate,
  onDelete,
}: DietCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const mealLabels = diet.meal_structure
    .map((key) => AVAILABLE_MEAL_TYPES.find((m) => m.key === key)?.label)
    .filter(Boolean)
    .slice(0, 3)
    .join(' • ');

  const remainingCount = Math.max(0, diet.meal_structure.length - 3);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#1C1C2E' : '#FFFFFF',
          borderColor: isSelected
            ? '#8B5CF6'
            : isActive
              ? '#22C55E'
              : isDark
                ? '#2D2D3D'
                : '#E5E5E7',
          borderWidth: isSelected || isActive ? 2 : 1,
        },
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        {/* Left Icon */}
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isActive
                ? 'rgba(34, 197, 94, 0.1)'
                : isDark
                  ? '#2D2D3D'
                  : '#F0EBF8',
            },
          ]}
        >
          <Ionicons
            name={isActive ? 'checkmark-circle' : 'restaurant-outline'}
            size={24}
            color={isActive ? '#22C55E' : '#8B5CF6'}
          />
        </View>

        {/* Content */}
        <View style={styles.textContent}>
          <View style={styles.titleRow}>
            <ThemedText style={styles.dietName} numberOfLines={1}>
              {diet.diet_name}
            </ThemedText>
            {isActive && (
              <View style={styles.activeBadge}>
                <ThemedText style={styles.activeBadgeText}>Active</ThemedText>
              </View>
            )}
          </View>
          {diet.description && (
            <ThemedText style={styles.description} numberOfLines={1}>
              {diet.description}
            </ThemedText>
          )}
          <ThemedText style={styles.mealStructure} numberOfLines={1}>
            {mealLabels || 'No meals configured'}
            {remainingCount > 0 && ` +${remainingCount} more`}
          </ThemedText>
          <ThemedText style={styles.mealCount}>
            {diet.meal_structure.length} meal
            {diet.meal_structure.length !== 1 ? 's' : ''}/day
          </ThemedText>
        </View>

        {/* Action Buttons - Shown when selected */}
        {isSelected ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: isDark ? '#2D2D3D' : '#F5F5F7' },
              ]}
              onPress={onEdit}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="pencil"
                size={18}
                color={isDark ? '#FFFFFF' : '#333333'}
              />
            </TouchableOpacity>
            {!isActive && (
              <TouchableOpacity
                style={[styles.actionButton, styles.activateButton]}
                onPress={onActivate}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={onDelete}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={isDark ? '#555' : '#CCC'}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dietName: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  activeBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#22C55E',
  },
  description: {
    fontSize: 13,
    opacity: 0.6,
  },
  mealStructure: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  mealCount: {
    fontSize: 11,
    opacity: 0.4,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activateButton: {
    backgroundColor: '#22C55E',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
});
