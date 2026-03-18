import {faker} from '@faker-js/faker'
import { supabaseAdmin as supabase} from './supabaseAdmin'

faker.seed(42)

async function seedUserGoals() {
    console.log("Cleaning up user_goals...")
    await supabase.from('user_goals').delete().neq('user_goal_id', '00000000-0000-0000-0000-000000000000')

    console.log("Seeding user goals...")
    const rows = []
    const {data: users} = await supabase.from('user_profiles').select('user_id')
    const {data: goals} = await supabase.from('goal_definitions').select('goal_id')
    for (const {user_id} of users) {
        const goal = goals[Math.floor(Math.random() * goals.length)]
        rows.push({
            user_goal_id: faker.string.uuid(),
            user_id: user_id,
            goal_id: goal.goal_id,
            target_value: 0,
            is_active: faker.datatype.boolean(),
            start_date: faker.date.past({years: 1})
        })
    }

    const {error} = await supabase.from('user_goals').insert(rows)
    if (error) throw error

}
seedUserGoals().catch(console.error)