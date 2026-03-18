import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          freezeOnBlur: true,
          title: 'Profile',
        }}
      />
      <Stack.Screen
        name="ask-ai"
        options={{
          headerShown: true,
          freezeOnBlur: true,
          title: 'Ask AI',
        }}
      />
      {/* Other screens */}
      <Stack.Screen
        name='settings'
        options={{
          headerShown: true,
          freezeOnBlur: true,
          title: 'Settings',
        }}
      />
      <Stack.Screen
        name='linked-apps'
        options={{
          headerShown: true,
          freezeOnBlur: true,
          title: 'Linked Third-Party Apps',
        }}
      />
      <Stack.Screen
        name='account-deletion'
        options={{
          headerShown: true,
          freezeOnBlur: true,
          title: 'Account Deletion',
        }}
      />
    </Stack>
  );
}
