import { Stack } from 'expo-router';

export default function StatsLayout() {
  return (
    <Stack
      screenOptions={{ freezeOnBlur: true, }}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          freezeOnBlur: true,
          title: 'Stats',
        }}
      />
    </Stack>
  );
}
