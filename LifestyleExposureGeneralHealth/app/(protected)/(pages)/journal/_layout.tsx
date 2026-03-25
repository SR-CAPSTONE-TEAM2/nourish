import { Stack } from 'expo-router';

export default function JournalLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          freezeOnBlur: true,
          title: 'Journal',
        }}
      />
      {/* Other screens */}
      <Stack.Screen
        name="diets"
        options={{
          headerShown: false,
          freezeOnBlur: true,
          title: 'Diets',
        }}
      />
    </Stack>
  );
}
