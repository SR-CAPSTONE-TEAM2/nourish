import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { UserProfile, Meal, Metric } from '@/types/types'

interface UserContextType {
  profile: UserProfile | null
  meals: Meal[]
  metrics: Metric[]
  loading: boolean
  refresh: () => void
}

const UserContext = createContext<UserContextType | null>(null)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [meals, setMeals] = useState<Meal[]>([])
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: prof }, { data: mealData }, { data: metricData }] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('user_meals').select('*').eq('user_id', user.id).order('meal_date', { ascending: true }),
      supabase.from('user_metrics').select('*').eq('user_id', user.id).order('observation_date', { ascending: true }),
    ])

    if (prof) setProfile(prof)
    if (mealData) setMeals(mealData)
    if (metricData) setMetrics(metricData)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <UserContext.Provider value={{ profile, meals, metrics, loading, refresh: load }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within a UserProvider')
  return ctx
}
