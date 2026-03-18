import { StyleSheet, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DefaultCardData } from './types';

interface CardProps {
  data: DefaultCardData;
  onPress?: () => void;
  disabled?: boolean;
}

export function DefaultCard({ data, onPress, disabled = false }: CardProps) {
  const theme = useColorScheme() ?? 'light';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme === 'light' ? '#f0f0f0' : '#1C1C2E' },
        pressed && onPress && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <ThemedText type="subtitle">{data.title}</ThemedText>
      <ThemedText>{data.desc}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 220,
    height: 180,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
});

