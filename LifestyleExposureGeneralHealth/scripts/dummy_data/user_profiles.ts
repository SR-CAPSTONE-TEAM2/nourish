import {faker} from '@faker-js/faker'
import { supabaseAdmin as supabase} from '../dummy_data/supabaseAdmin'

faker.seed(42)

const NUM_USERS = 15
const SEED_PREFIX = "seed_"

function generateUsername(first: string, last: string) {
    return (
        first.toLowerCase() + last.toLowerCase() + faker.number.int({min: 0, max: 999})
    )
}

async function createAuthUser() {
    const email = `${SEED_PREFIX}${faker.internet.email().toLowerCase()}`
    const password = "Password123!"

    const {data, error} = await supabase.auth.admin.createUser({
        email, password, email_confirm: true
    })

    if (error) throw error
    return data.user
}

async function createUserProfile(userId: string) {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    const age = faker.helpers.weightedArrayElement([
        {weight: 5, value: faker.number.int({min:18, max: 35})},
        {weight: 3, value: faker.number.int({min:36, max: 48})},
        {weight: 2, value: faker.number.int({min:49, max: 65})}
    ])


    const profile = {
        user_id: userId,
        username: generateUsername(firstName, lastName),
        first_name: firstName, 
        last_name: lastName,
        birthday: faker.date.birthdate({mode: "age", min: age, max: age}),
        height: faker.helpers.weightedArrayElement([
            {weight: 3, value: faker.number.int({min:147, max: 160})},
            {weight: 5, value: faker.number.int({min: 161, max: 185})},
            {weight: 2, value: faker.number.int({min: 186, max: 200})}
        ]),
        notifications_enabled: faker.helpers.weightedArrayElement([
            {weight: 7, value:true},
            {weight: 3, value: false}
        ]),
        created_at: faker.date.past({years:1})
    }

    const {error} = await supabase.from('user_profiles').upsert(profile)

    if (error) throw error
}


async function cleanupUserProfiles() {
    try {
        console.log("Cleaning up seed users...");

        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        if (error) throw error;

        const seedUsers = users.filter(u => u.email?.startsWith(SEED_PREFIX));
        
        await Promise.all(seedUsers.map(user => supabase.auth.admin.deleteUser(user.id)));
        
        console.log(`Deleted ${seedUsers.length} seed users.`);
    } catch (err: any) {
        console.warn("Skipping cleanup.. ")
    }

}

async function seedUserProfiles() {
    console.log("Cleaning up old data...")
    await cleanupUserProfiles()

    console.log("Seeding user_profiles...")

    for (let i = 0; i < NUM_USERS; i ++) {
        const user = await createAuthUser()
        await createUserProfile(user.id)

        console.log(`${user.email}`)
    }
    console.log("Done seeding user_profiles.")
}
seedUserProfiles().catch(console.error)