import {createClient} from '@supabase/supabase-js'
import 'dotenv/config'

export const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)