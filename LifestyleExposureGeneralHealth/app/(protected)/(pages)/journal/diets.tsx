// app/diets.tsx
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DietCard } from '@/components/ui/journal/diet-card';
import { useUserDiet } from '@/hooks/useUserDiet';

export default function DietsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const {
    activeDiet,
    userDiets,
    isLoading,
    selectDiet,
    deleteDiet,
  } = useUserDiet();

  const [selectedDietId, setSelectedDietId] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  const handleSelectCard = (dietId: string) => {
    // Toggle selection
    setSelectedDietId((prev) => (prev === dietId ? null : dietId));
  };

  const handleActivateDiet = async (dietId: string) => {
    setIsActivating(true);
    try {
      const success = await selectDiet(dietId);
      if (success) {
        setSelectedDietId(null);
        // Optionally go back to journal
        router.back();
      } else {
        Alert.alert('Error', 'Failed to activate diet. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to activate diet. Please try again.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleEditDiet = (dietId: string) => {
    router.push({
      pathname: '/(protected)/(pages)/journal/diets-edit',
      params: { dietId },
    });
  };

  const handleDeleteDiet = (dietId: string, dietName: string) => {
    Alert.alert(
      'Delete Diet',
      `Are you sure you want to delete "${dietName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteDiet(dietId);
            if (success) {
              setSelectedDietId(null);
            } else {
              Alert.alert('Error', 'Failed to delete diet. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleCreateDiet = () => {
    router.push('/(protected)/(pages)/journal/diets-create');
  };

  return (
    <>
      <Stack.Screen
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <ThemedView style={styles.container}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { borderBottomColor: isDark ? '#2D2D3D' : '#EBEBEB' },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="close"
              size={24}
              color={isDark ? '#FFFFFF' : '#000000'}
            />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>My Diets</ThemedText>
          <View style={styles.headerButton} />
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <ThemedText style={styles.loadingText}>Loading diets...</ThemedText>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Active Diet Section */}
            {activeDiet && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Active Diet</ThemedText>
                <DietCard
                  diet={activeDiet}
                  isSelected={selectedDietId === activeDiet.diet_id}
                  isActive={true}
                  onSelect={() => handleSelectCard(activeDiet.diet_id)}
                  onEdit={() => handleEditDiet(activeDiet.diet_id)}
                  onActivate={() => { }}
                  onDelete={() =>
                    handleDeleteDiet(activeDiet.diet_id, activeDiet.diet_name)
                  }
                />
              </View>
            )}

            {/* All Diets Section */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>
                {activeDiet ? 'Other Diets' : 'Your Diets'}
              </ThemedText>

              {userDiets.filter((d) => d.diet_id !== activeDiet?.diet_id)
                .length === 0 && !activeDiet ? (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="nutrition-outline"
                    size={48}
                    color="#8B5CF6"
                    style={{ opacity: 0.4 }}
                  />
                  <ThemedText style={styles.emptyTitle}>No diets yet</ThemedText>
                  <ThemedText style={styles.emptySubtitle}>
                    Create your first diet plan to start tracking your meals.
                  </ThemedText>
                </View>
              ) : (
                userDiets
                  .filter((d) => d.diet_id !== activeDiet?.diet_id)
                  .map((diet) => (
                    <DietCard
                      key={diet.diet_id}
                      diet={diet}
                      isSelected={selectedDietId === diet.diet_id}
                      isActive={false}
                      onSelect={() => handleSelectCard(diet.diet_id)}
                      onEdit={() => handleEditDiet(diet.diet_id)}
                      onActivate={() => handleActivateDiet(diet.diet_id)}
                      onDelete={() =>
                        handleDeleteDiet(diet.diet_id, diet.diet_name)
                      }
                    />
                  ))
              )}
            </View>

            {/* Bottom spacing for FAB */}
            <View style={{ height: 80 }} />
          </ScrollView>
        )}

        {/* Floating Action Button - Create Diet */}
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreateDiet}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Loading overlay when activating */}
        {isActivating && (
          <View style={styles.overlay}>
            <View
              style={[
                styles.overlayContent,
                { backgroundColor: isDark ? '#1C1C2E' : '#FFFFFF' },
              ]}
            >
              <ActivityIndicator size="large" color="#8B5CF6" />
              <ThemedText style={styles.overlayText}>
                Activating diet...
              </ThemedText>
            </View>
          </View>
        )}
      </ThemedView>
    </>
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
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    opacity: 0.6,
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.45,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContent: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  overlayText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
