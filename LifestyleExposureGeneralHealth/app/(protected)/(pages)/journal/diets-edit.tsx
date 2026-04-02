// (protected)/(pages)/journal/diets-edit.tsx)
import React, { useEffect, useState } from 'react';
import {
  View,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { CreateDietForm } from '@/components/ui/journal/create-diet-form';
import { useUserDiet } from '@/hooks/useUserDiet';
import { CreateDietInput, Diet } from '@/types/journal';

export default function EditDietScreen() {
  const router = useRouter();
  const { dietId } = useLocalSearchParams<{ dietId: string }>();

  const { userDiets, updateDiet, isLoading } = useUserDiet();
  const [diet, setDiet] = useState<Diet | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (dietId && userDiets.length > 0) {
      const foundDiet = userDiets.find((d) => d.diet_id === dietId);
      setDiet(foundDiet || null);
    }
  }, [dietId, userDiets]);

  const handleSubmit = async (input: CreateDietInput): Promise<void> => {
    if (!dietId || isNavigating) return;

    try {
      const success = await updateDiet(dietId, {
        diet_name: input.diet_name,
        description: input.description,
        meal_structure: input.meal_structure,
      });

      if (success) {
        setIsNavigating(true);
        // Navigate back after successful update
        router.back();
      } else {
        throw new Error('Failed to update diet');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update diet. Please try again.');
      // Don't re-throw - let the form handle it gracefully
    }
  };

  const handleCancel = () => {
    if (!isNavigating) {
      router.back();
    }
  };

  // Loading state
  if (isLoading || (!diet && dietId)) {
    return (
      <>
        <Stack.Screen
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <ThemedText style={styles.loadingText}>Loading diet...</ThemedText>
        </ThemedView>
      </>
    );
  }

  // Diet not found
  if (!diet) {
    return (
      <>
        <Stack.Screen
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <ThemedView style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>Diet not found</ThemedText>
        </ThemedView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <ThemedView style={{ flex: 1 }}>
        <CreateDietForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          initialData={{
            diet_name: diet.diet_name,
            description: diet.description,
            meal_structure: diet.meal_structure,
            meal_descriptions: diet.meal_descriptions,
          }}
          isEditing={true}
        />
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    opacity: 0.6,
  },
});
