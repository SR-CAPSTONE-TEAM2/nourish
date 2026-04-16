import { Redirect, Slot, Stack } from 'expo-router'
import { UserProvider, useUser } from '@/context/user-context'

function ProtectedGuard() {
  const { user, loading } = useUser()

  if (loading) return null
  if (!user) return <Redirect href="/login" />

  return <Stack screenOptions={{ headerShown: false }} />
}

export default function ProtectedLayout() {
  return (
    <UserProvider>
      <ProtectedGuard />
    </UserProvider>
  )
}
