// (protected)/(pages)/journal/diets-create.tsx)
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { CreateDietForm } from '@/components/ui/journal/create-diet-form';
import { useUserDiet } from '@/hooks/useUserDiet';
import { CreateDietInput } from '@/types/journal';

export default function CreateDietScreen() {
  const router = useRouter();
  const { createDiet, selectDiet } = useUserDiet();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleSubmit = async (input: CreateDietInput): Promise<void> => {
    // Prevent double submission
    if (isNavigating) return;

    try {
      const newDiet = await createDiet(input);

      if (newDiet) {
        setIsNavigating(true);

        // Ask user if they want to activate the new diet
        Alert.alert(
          'Diet Created',
          'Would you like to set this as your active diet?',
          [
            {
              text: 'Not Now',
              style: 'cancel',
              onPress: () => {
                // Navigate back to diets list
                router.back();
              },
            },
            {
              text: 'Yes, Activate',
              onPress: async () => {
                try {
                  await selectDiet(newDiet.diet_id);
                  // Go back to journal (pop both modals)
                  // Use replace or dismiss depending on your navigation structure
                  if (router.canDismiss()) {
                    router.dismiss(2);
                  } else {
                    router.back();
                    // Small delay then go back again
                    setTimeout(() => {
                      if (router.canGoBack()) {
                        router.back();
                      }
                    }, 100);
                  }
                } catch (error) {
                  console.error('Failed to activate diet:', error);
                  // Still navigate back even if activation fails
                  router.back();
                }
              },
            },
          ],
          {
            cancelable: false, // Prevent dismissing by tapping outside
          }
        );
      } else {
        throw new Error('Failed to create diet');
      }
    } catch (error) {
      setIsNavigating(false);
      Alert.alert('Error', 'Failed to create diet. Please try again.');
      // Don't re-throw - let the form handle it gracefully
    }
  };

  const handleCancel = () => {
    if (!isNavigating) {
      router.back();
    }
  };

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
          isEditing={false}
        />
      </ThemedView>
    </>
  );
}
