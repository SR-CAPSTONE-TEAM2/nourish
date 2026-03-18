import { StyleSheet, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MealCardData } from './types';

interface MealCardProps {
  data: MealCardData;
  onPress?: () => void;
}

export function MealCard({ data, onPress }: MealCardProps) {
  const theme = useColorScheme() ?? 'light';

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme === 'light' ? '#ffffff' : '#1C1C2E' },
        pressed && onPress && styles.pressed,
      ]}
    >
      <Image
        source={data.image}
        style={styles.image}
        contentFit="cover"
        placeholder={require('@/assets/images/generic-meal-image.jpg')}
        transition={200}
      />
      <ThemedView style={styles.content}>
        <ThemedText type="subtitle" numberOfLines={1}>
          {data.name}
        </ThemedText>

        <ThemedView style={styles.macrosContainer}>
          {data.macros.calories && (
            <ThemedText style={styles.macro}>
              🔥 {data.macros.calories} cal
            </ThemedText>
          )}
          {data.macros.protein && (
            <ThemedText style={styles.macro}>
              💪 {data.macros.protein}
            </ThemedText>
          )}
          {data.macros.carbs && (
            <ThemedText style={styles.macro}>
              🌾 {data.macros.carbs}
            </ThemedText>
          )}
          {data.macros.fat && (
            <ThemedText style={styles.macro}>
              🥑 {data.macros.fat}
            </ThemedText>
          )}
        </ThemedView>

        {data.rating !== undefined && (
          <ThemedText style={styles.rating}>
            {'★'.repeat(Math.floor(data.rating))}
            {'☆'.repeat(5 - Math.floor(data.rating))}
          </ThemedText>
        )}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 120,
  },
  content: {
    padding: 12,
  },
  macrosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  macro: {
    fontSize: 12,
    opacity: 0.8,
  },
  rating: {
    fontSize: 12,
    color: '#FFB800',
    marginTop: 8,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});
