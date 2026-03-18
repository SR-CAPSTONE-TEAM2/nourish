import {faker} from '@faker-js/faker'
import { supabaseAdmin as supabase} from '../dummy_data/supabaseAdmin'


faker.seed(42)

async function seedUserMeals () {
    console.log("Cleaning up old data...")
    
    // Cleanup
    await supabase.from('user_meals').delete()
        .neq('meal_id', '00000000-0000-0000-0000-000000000000')

    // Seeding
    console.log("Seeding user_meals...")
    const {data: users} = await supabase.from('user_profiles').select('user_id')

    if (!users || users.length == 0) {
        throw new Error("No users found.")
    }

    const meals = []
    // Generating date range (1 year)
    const dates: Date[] = []
    const current = new Date("2025-01-01")
    const now = new Date()
    while (current <= now) {
        dates.push(new Date(current))
        current.setDate(current.getDate() + 1)
    }

    const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const

    const caloriesByType: Record<string, [number, number]> = {
        Breakfast: [300, 600],
        Lunch: [400, 800], 
        Dinner: [500, 900],
        Snack: [100, 300]
    }

    for (const {user_id} of users) {

        for (const date of dates) {
            for (const type of MEAL_TYPES) {
                if (type == "Snack" && Math.random() < 0.7) {
                        continue
                }
                const [minCals, maxCals] = caloriesByType[type]
                meals.push({
                    meal_id: faker.string.uuid(),
                    meal_type: type,
                    meal_date: date.toISOString().split('T')[0],
                    meal_journal: '',
                    meal_rating: faker.number.int({min: 1, max: 5}),
                    total_calories: faker.number.int({min: minCals, max: maxCals}),
                    user_id
                })
            }
        }
    }

    const BATCH_SIZE = 500

    for (let i = 0; i < meals.length; i += BATCH_SIZE) {
        const batch = meals.slice(i, i + BATCH_SIZE)
        const {error} = await supabase.from('user_meals').insert(batch)
        if (error) throw error
    }
}
seedUserMeals().catch(console.error)