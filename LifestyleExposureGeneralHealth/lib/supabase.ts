import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl: string | undefined = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey: string | undefined = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase URL or Anon Key")
}

const authStorage =
  Platform.OS === 'web'
    ? (typeof window !== 'undefined' ? window.localStorage : undefined)
    : AsyncStorage

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})
