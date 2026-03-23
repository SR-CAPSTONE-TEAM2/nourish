import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/user-context';

export function useMealEntryCount(mealKey: string) {
  const { user } = useUser();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.id || !mealKey) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    supabase
      .from('meal_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('meal_type', mealKey)
      .gte('created_at', todayStart.toISOString())
      .then(({ count: c }) => setCount(c ?? 0));
  }, [user?.id, mealKey]);

  return { count };
}
