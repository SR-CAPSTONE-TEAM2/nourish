// components/ui/journal/diet-card.tsx
import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Diet, AVAILABLE_MEAL_TYPES } from '@/types/journal';
import { useTheme } from '@/context/theme-context';

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
  const { colors, isDark } = useTheme();

  const mealLabels = diet.meal_structure
    .map((key) => AVAILABLE_MEAL_TYPES.find((m) => m.key === key)?.label)
    .filter(Boolean)
    .slice(0, 3)
    .join(' • ');

  const remainingCount = Math.max(0, diet.meal_structure.length - 3);

  // Determine border color
  const getBorderColor = () => {
    if (isSelected) return colors.primary;
    if (isActive) return colors.success;
    return colors.border;
  };

  // Handle action button press with event stopping
  const handleEditPress = () => {
    onEdit();
  };

  const handleActivatePress = () => {
    onActivate();
  };

  const handleDeletePress = () => {
    onDelete();
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: getBorderColor(),
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
                : isDark ? '#2D2D3D' : '#F0EBF8',
            },
          ]}
        >
          <Ionicons
            name={isActive ? 'checkmark-circle' : 'restaurant-outline'}
            size={24}
            color={isActive ? colors.success : colors.primary}
          />
        </View>

        {/* Content */}
        <View style={styles.textContent}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.dietName, { color: colors.text }]}
              numberOfLines={1}
            >
              {diet.diet_name}
            </Text>
            {isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
          </View>
          {diet.description ? (
            <Text
              style={[styles.description, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {diet.description}
            </Text>
          ) : null}
          <Text
            style={[styles.mealStructure, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {mealLabels || 'No meals configured'}
            {remainingCount > 0 && ` +${remainingCount} more`}
          </Text>
          <Text style={[styles.mealCount, { color: colors.textMuted }]}>
            {diet.meal_structure.length} meal
            {diet.meal_structure.length !== 1 ? 's' : ''}/day
          </Text>
        </View>

        {/* Action Buttons - Shown when selected */}
        {isSelected ? (
          <View style={styles.actionButtons}>
            {/* Edit Button */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: isDark ? '#2D2D3D' : '#F5F5F7' },
              ]}
              onPress={handleEditPress}
              activeOpacity={0.6}
            >
              <Ionicons
                name="pencil"
                size={18}
                color={colors.icon}
              />
            </TouchableOpacity>

            {/* Activate Button - Only show if not already active */}
            {!isActive && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.success }]}
                onPress={handleActivatePress}
                activeOpacity={0.6}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {/* Delete Button */}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.danger }]}
              onPress={handleDeletePress}
              activeOpacity={0.6}
            >
              <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textMuted}
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
  },
  mealStructure: {
    fontSize: 12,
    marginTop: 2,
  },
  mealCount: {
    fontSize: 11,
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
});
