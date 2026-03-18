import { useEffect, useRef } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useRouter, useLocalSearchParams } from 'expo-router'

export default function AuthCallback() {
  const router = useRouter()
  const params = useLocalSearchParams() as { code?: string, redirect?: string }
  const hasAttempted = useRef(false)

  useEffect(() => {
    // 1. If we already have a session, just go to the dashboard
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        router.replace('/dashboard')
        return
      }
    }

    const handleCallback = async () => {
      // 2. Prevent the double-run in StrictMode
      if (hasAttempted.current) return
      
      const authCode = params.code
      if (!authCode) return

      try {
        hasAttempted.current = true
        
        const { error } = await supabase.auth.exchangeCodeForSession(authCode)
        
        if (error) {
          // If the error is "already exchanged", it might be fine
          // Check if we actually have a session now.
          const { data: sessionData } = await supabase.auth.getSession()
          if (sessionData.session) {
            router.replace('/dashboard')
            return
          }
          throw error
        }

        router.replace('/dashboard')
      } catch (err: any) {
        console.error('Auth callback error:', err.message)
        // Only redirect to login if we definitely failed
        router.replace('/login?error=callback_failed')
      }
    }

    checkSession().then(() => handleCallback())
  }, [params.code])

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#f0f0f0" />
    </View>
  )
}