import { useEffect, useState } from 'react'
import { Redirect, Slot } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { UserProvider } from '@/context/user-context'

export default function ProtectedLayout() {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null

  if (!session) {
    return <Redirect href="/login" />
  }

  return (
    <UserProvider>
      <Slot />
    </UserProvider>
  )
}
