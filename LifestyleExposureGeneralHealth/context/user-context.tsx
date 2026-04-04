// context/user-context.tsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { UserProfile, Meal, Metric } from '@/types/types';
import { Diet } from '@/types/diets-meals';

interface UserContextType {
  user: User | null;
  profile: UserProfile | null;
  meals: Meal[];
  metrics: Metric[];
  activeDiet: Diet | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setActiveDiet: (diet: Diet | null) => void;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [activeDiet, setActiveDiet] = useState<Diet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setUser(null);
        setLoading(false); // redirect fires immediately, no network wait
      }
      // if session exists, let load() handle the full data fetch
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        setUser(null);
        setProfile(null);
        setMeals([]);
        setMetrics([]);
        setActiveDiet(null);
        setLoading(false);
        return;
      }

      setUser(authUser);

      const [
        { data: prof },
        { data: mealData },
        { data: metricData },
        { data: userDietData }
      ] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', authUser.id)
          .single(),
        supabase
          .from('user_meals')
          .select('*')
          .eq('user_id', authUser.id)
          .order('meal_date', { ascending: false }),
        supabase
          .from('user_metrics')
          .select('*')
          .eq('user_id', authUser.id)
          .order('observation_date', { ascending: false }),
        supabase
          .from('user_diets')
          .select(`
            *,
            diet:diets(*)
          `)
          .eq('user_id', authUser.id)
          .eq('is_active', true)
          .single(),
      ]);

      if (prof) setProfile(prof);
      if (mealData) setMeals(mealData);
      if (metricData) setMetrics(metricData);
      if (userDietData?.diet) setActiveDiet(userDietData.diet as Diet);

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          load();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setMeals([]);
          setMetrics([]);
          setActiveDiet(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [load]);

  return (
    <UserContext.Provider
      value={{
        user,
        profile,
        meals,
        metrics,
        activeDiet,
        loading,
        refresh: load,
        setActiveDiet,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within a UserProvider');
  return ctx;
}
