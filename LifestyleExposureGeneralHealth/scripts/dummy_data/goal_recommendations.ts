import {faker} from '@faker-js/faker'
import { supabaseAdmin as supabase} from './supabaseAdmin'

faker.seed(42)

const RECOMMENDATIONS: Record< string, {ingredient: string; direction: number}[]> = {
    'Reduce Body Fat': [
        { ingredient: 'calories', direction: -1 },
        { ingredient: 'sugar', direction: -1 },
        { ingredient: 'protein', direction: 1 },
        { ingredient: 'fiber', direction: 1 }
    ],
    'Increase Muscle Mass': [
        { ingredient: 'protein', direction: 1 },
        { ingredient: 'calories', direction: 1 },
        { ingredient: 'carbohydrates', direction: 1 }
    ],
    'Improve Gut Health': [
        { ingredient: 'fiber', direction: 1 },
        { ingredient: 'sugar', direction: -1 }
    ],
    'Improve Heart Health': [
        { ingredient: 'saturated_fat', direction: -1 },
        { ingredient: 'unsaturated_fat', direction: 1 },
        { ingredient: 'sodium', direction: -1 }
    ],
    'Increase Energy Levels': [
        { ingredient: 'carbohydrates', direction: 1 },
        { ingredient: 'iron', direction: 1 },
        { ingredient: 'sugar', direction: -1 }
    ],
    'Improve Blood Sugar Control': [
        { ingredient: 'carbohydrates', direction: -1 },
        { ingredient: 'fiber', direction: 1 },
        { ingredient: 'sugar', direction: -1 }
    ],
    'Increase Hydration': [
        { ingredient: 'water', direction: 1 },
        { ingredient: 'sodium', direction: -1 }
    ],
    'Reduce Inflammation': [
        { ingredient: 'omega_3', direction: 1 },
        { ingredient: 'sugar', direction: -1 },
        { ingredient: 'saturated_fat', direction: -1 }
    ]
}

async function seedGoalRecommendations() {
    console.log("Cleaning up goal_recommendations...")
    await supabase.from('goal_recommendations').delete().neq('rec_id', '00000000-0000-0000-0000-000000000000' )

    console.log("Fetching goals...")

    const {data: goals, error} = await supabase.from("goal_definitions").select('goal_id, goal_name')
    if (error) throw error
    if (!goals || goals.length === 0) {
        throw new Error("No goals found.")
    } 

    console.log("Seeding goal_recommendations")

    const rows = goals.flatMap(goal => {
        const recs = RECOMMENDATIONS[goal.goal_name] ?? []
        return recs.map(rec => ({
            rec_id: faker.string.uuid(),
            goal_id: goal.goal_id,
            ingredient: rec.ingredient,
            direction: rec.direction
        }))
    })

    const {error: insertError} = await supabase.from('goal_recommendations').insert(rows)
    if (insertError) throw insertError

    console.log(`Inserted ${rows.length} recommendations.`)

}
seedGoalRecommendations().catch(console.error)