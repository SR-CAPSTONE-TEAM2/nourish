import {faker} from '@faker-js/faker'
import { supabaseAdmin as supabase} from '../dummy_data/supabaseAdmin'


faker.seed(42)


async function seedUserMetrics() {

    console.log("Cleaning up old data...")
    
    // Cleanup
    await supabase.from('user_metrics').delete()
        .neq('metric_id', '00000000-0000-0000-0000-000000000000')

    // Seeding
    console.log("Seeding user_metrics...")
    const {data: users} = await supabase.from('user_profiles').select('user_id')
    const goals = []

    if (!users || users.length === 0) {
        throw new Error("No users found.")
    }

    // Generating date range (1 year)
    const dates: Date[] = []
    const current = new Date("2025-01-01")
    const now = new Date()
    

    while (current <= now) {
        dates.push(new Date(current))
        current.setDate(current.getDate() + 1)
    }
    
    for (const {user_id} of users) {
        const baseWeight = faker.helpers.weightedArrayElement([
            {weight: 2, value: faker.number.int({min:36, max: 55})},
            {weight: 5, value: faker.number.int({min:56, max: 86})},
            {weight: 3, value: faker.number.int({min:87, max: 120})}
        ])
        let currentWeight = baseWeight
        for (const date of dates) {
            const weight_delta = faker.number.float({
                min: -0.4,
                max: 0.4,
            })

            currentWeight += weight_delta
            currentWeight = Math.max(baseWeight - 3, Math.min(baseWeight + 3, currentWeight))
            
            goals.push({
            metric_id: faker.string.uuid(),
            user_id,
            weight: Number(currentWeight.toFixed(1)),
            protein: faker.number.int({min:50, max: 120}),
            carbs: faker.number.int({min: 140, max: 375}),
            sugar: faker.number.int({min: 3, max: 45}),
            observation_date: date.toISOString().split('T')[0]
        })
        }   
    }

    const BATCH_SIZE = 500

    for (let i = 0; i < goals.length; i += BATCH_SIZE) {
        const batch = goals.slice(i, i + BATCH_SIZE)
        const {error} = await supabase.from('user_metrics').insert(batch)
        if (error) throw error
    }
}

seedUserMetrics().catch(console.error)