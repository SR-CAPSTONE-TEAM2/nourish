import {faker} from '@faker-js/faker'
import { supabaseAdmin as supabase} from './supabaseAdmin'

faker.seed(42)

const GOALS = [
    {
        goal_name: 'Reduce Body Fat',
        description: 'Lower overall body fat through dietary adjustments'
    },
    {
        goal_name: 'Increase Muscle Mass',
        description: 'Support muscle growth with adequate nutrition'
    },
    {
        goal_name: 'Improve Gut Health',
        description: 'Promote a healthy digestive system'
    },
    {
        goal_name: 'Improve Heart Health',
        description: 'Support cardiovascular health'
    },
    {
        goal_name: 'Increase Energy Levels',
        description: 'Maintain steady daily energy'
    },
    {
        goal_name: 'Improve Blood Sugar Control',
        description: 'Reduce blood sugar spikes'
    },
    {
        goal_name: 'Increase Hydration',
        description: 'Improve overall hydration status'
    },
    {
        goal_name: 'Reduce Inflammation',
        description: 'Lower chronic inflammation through diet'
    }
]

async function seedGoalDefinitions() {
    console.log("Cleaning up goal definitions...")

    await supabase.from('goal_definitions').delete().neq('goal_id', '00000000-0000-0000-0000-000000000000')

    console.log("Seeding goal_definitions...")

    const rows = GOALS.map(goal => ({
        goal_id: faker.string.uuid(),
        goal_name: goal.goal_name,
        description: goal.description
    }))

    const {error} = await supabase.from("goal_definitions").insert(rows)
    if (error) throw error

    console.log(`Inserted ${rows.length} goals.`)
}

seedGoalDefinitions().catch(console.error)