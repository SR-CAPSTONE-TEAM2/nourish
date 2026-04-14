import 'dotenv/config'
import { faker } from '@faker-js/faker'
import { supabaseAdmin as supabase } from './supabaseAdmin'

faker.seed(42)

const DEMO_USER_ID = '166912f0-8b5d-4abd-9e58-58cb3663a20b'
const START_DATE = new Date('2025-01-01')
const END_DATE = new Date()
const BATCH_SIZE = 500

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const
type MealType = typeof MEAL_TYPES[number]

type FoodRow = {
  fdc_id: number | string | null
  ingredient_name: string | null
  calories: string | null
  protein: string | null
  carbs: string | null
  fat: string | null
  vitamin_a_ug: string | null
  vitamin_b12_ug: string | null
  vitamin_b6_mg: string | null
  vitamin_c_mg: string | null
  vitamin_d_ug: string | null
  vitamin_e_mg: string | null
  vitamin_k_ug: string | null
}

type ParsedFoodRow = {
  fdc_id: number
  ingredient_name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  vitamin_a_ug: number
  vitamin_b12_ug: number
  vitamin_b6_mg: number
  vitamin_c_mg: number
  vitamin_d_ug: number
  vitamin_e_mg: number
  vitamin_k_ug: number
}

function toNumber(value: string | number | null | undefined): number {
  if (value == null || value === '') return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function isoDateOnly(d: Date): string {
  return d.toISOString().split('T')[0]
}

function buildDateRange(start: Date, end: Date): Date[] {
  const out: Date[] = []
  const cur = new Date(start)
  while (cur <= end) {
    out.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function parseFoodRow(row: FoodRow): ParsedFoodRow | null {
  const fdc = toNumber(row.fdc_id)
  const name = row.ingredient_name?.trim()
  if (!fdc || !name) return null

  return {
    fdc_id: fdc,
    ingredient_name: name,
    calories: toNumber(row.calories),
    protein: toNumber(row.protein),
    carbs: toNumber(row.carbs),
    fat: toNumber(row.fat),
    vitamin_a_ug: toNumber(row.vitamin_a_ug),
    vitamin_b12_ug: toNumber(row.vitamin_b12_ug),
    vitamin_b6_mg: toNumber(row.vitamin_b6_mg),
    vitamin_c_mg: toNumber(row.vitamin_c_mg),
    vitamin_d_ug: toNumber(row.vitamin_d_ug),
    vitamin_e_mg: toNumber(row.vitamin_e_mg),
    vitamin_k_ug: toNumber(row.vitamin_k_ug),
  }
}

function mealChance(type: MealType): number {
  switch (type) {
    case 'Breakfast': return 0.9
    case 'Lunch': return 0.95
    case 'Dinner': return 0.98
    case 'Snack': return 0.45
  }
}

function ingredientCount(type: MealType): number {
  switch (type) {
    case 'Breakfast': return faker.number.int({ min: 2, max: 4 })
    case 'Lunch': return faker.number.int({ min: 3, max: 6 })
    case 'Dinner': return faker.number.int({ min: 3, max: 7 })
    case 'Snack': return faker.number.int({ min: 1, max: 3 })
  }
}

function portionMultiplier(type: MealType): number {
  switch (type) {
    case 'Breakfast': return faker.number.float({ min: 0.8, max: 1.3, fractionDigits: 2 })
    case 'Lunch': return faker.number.float({ min: 0.9, max: 1.6, fractionDigits: 2 })
    case 'Dinner': return faker.number.float({ min: 1.0, max: 1.8, fractionDigits: 2 })
    case 'Snack': return faker.number.float({ min: 0.4, max: 0.9, fractionDigits: 2 })
  }
}

function scoreFood(food: ParsedFoodRow, mealType: MealType): number {
  const name = food.ingredient_name.toLowerCase()
  let score = 1

  if (mealType === 'Breakfast' && /(egg|milk|oat|cereal|banana|berry|toast|yogurt)/.test(name)) score += 3
  if (mealType === 'Lunch' && /(chicken|rice|bean|wrap|sandwich|salad|turkey|avocado)/.test(name)) score += 3
  if (mealType === 'Dinner' && /(beef|salmon|chicken|rice|pasta|potato|broccoli|spinach)/.test(name)) score += 3
  if (mealType === 'Snack' && /(apple|banana|nut|almond|cracker|yogurt|cheese|bar)/.test(name)) score += 3

  if (food.protein > 10) score += 0.5
  if (food.vitamin_c_mg > 10 || food.vitamin_a_ug > 100 || food.vitamin_k_ug > 20) score += 0.5

  return Math.max(score, 0.1)
}

function weightedSample<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

async function loadFoods(): Promise<ParsedFoodRow[]> {
  const { data, error } = await supabase
    .from('food_nutrients')
    .select(`
      fdc_id,
      ingredient_name,
      calories,
      protein,
      carbs,
      fat,
      vitamin_a_ug,
      vitamin_b12_ug,
      vitamin_b6_mg,
      vitamin_c_mg,
      vitamin_d_ug,
      vitamin_e_mg,
      vitamin_k_ug
    `)

  if (error) throw error
  if (!data?.length) throw new Error('No food_nutrients rows found')

  const parsed = (data as FoodRow[])
    .map(parseFoodRow)
    .filter((x): x is ParsedFoodRow => x !== null)

  if (!parsed.length) throw new Error('No valid foods parsed')
  return parsed
}

async function getAllDemoMealIds(): Promise<string[]> {
  const allMealIds: string[] = []
  const pageSize = 1000
  let from = 0

  while (true) {
    const to = from + pageSize - 1

    const { data, error } = await supabase
      .from('user_meals')
      .select('meal_id')
      .eq('user_id', DEMO_USER_ID)
      .range(from, to)

    if (error) throw error
    if (!data || data.length === 0) break

    allMealIds.push(...data.map(row => row.meal_id))

    if (data.length < pageSize) break
    from += pageSize
  }

  return allMealIds
}


async function cleanupDemoUser() {
  const mealIds = await getAllDemoMealIds()
  console.log(`Found ${mealIds.length} existing demo meals`)

  if (mealIds.length > 0) {
    const idChunks = chunk(mealIds, 100)

    for (let i = 0; i < idChunks.length; i++) {
      const ids = idChunks[i]
      const { error: itemDeleteErr } = await supabase
        .from('meal_items')
        .delete()
        .in('meal_id', ids)

      if (itemDeleteErr) {
        console.error(`meal_items delete batch ${i + 1} failed:`, itemDeleteErr)
        throw itemDeleteErr
      }

      console.log(`Deleted meal_items batch ${i + 1}/${idChunks.length}`)
    }
  }

  const { error: mealDeleteErr } = await supabase
    .from('user_meals')
    .delete()
    .eq('user_id', DEMO_USER_ID)

  if (mealDeleteErr) {
    console.error('user_meals delete error:', mealDeleteErr)
    throw mealDeleteErr
  }

  console.log('Demo user cleanup complete')
}

async function insertBatches(table: 'user_meals' | 'meal_items', rows: any[]) {
  for (const batch of chunk(rows, BATCH_SIZE)) {
    const { error } = await supabase.from(table).insert(batch)
    if (error) throw error
  }
}



async function seedDemoUserMeals() {
  console.log('Testing client...')

  const foodTest = await supabase.from('food_nutrients').select('fdc_id').limit(1)
  console.log('foodTest:', JSON.stringify(foodTest, null, 2))

  const mealTest = await supabase
    .from('user_meals')
    .select('meal_id')
    .eq('user_id', DEMO_USER_ID)
    .limit(1)

  console.log('mealTest:', JSON.stringify(mealTest, null, 2))

  console.log('Running cleanup...')
  await cleanupDemoUser()

  console.log('Loading foods...')
  const foods = await loadFoods()
  const dates = buildDateRange(START_DATE, END_DATE)

  const meals: any[] = []
  const mealItems: any[] = []

  for (const date of dates) {
    for (const mealType of MEAL_TYPES) {
      if (Math.random() > mealChance(mealType)) continue

      const meal_id = crypto.randomUUID()
      const itemCount = ingredientCount(mealType)

      const candidates = faker.helpers.shuffle([...foods]).slice(0, Math.min(300, foods.length))
      const weights = candidates.map(f => scoreFood(f, mealType))
      const used = new Set<number>()
      const items: any[] = []

      while (items.length < itemCount) {
        const food = weightedSample(candidates, weights)
        if (used.has(food.fdc_id)) continue
        used.add(food.fdc_id)

        const qty = portionMultiplier(mealType)
        const gram_weight = round2(qty * 100)

        items.push({
          meal_id,
          fdc_id: food.fdc_id,
          ingredient_name: food.ingredient_name,
          quantity: qty,
          gram_weight,
          portion_label: `${qty} x 100g`,
          calories: round2(food.calories * qty),
          protein: round2(food.protein * qty),
          carbs: round2(food.carbs * qty),
          fat: round2(food.fat * qty),
          vitamin_a_ug: round2(food.vitamin_a_ug * qty),
          vitamin_b12_ug: round2(food.vitamin_b12_ug * qty),
          vitamin_b6_mg: round2(food.vitamin_b6_mg * qty),
          vitamin_c_mg: round2(food.vitamin_c_mg * qty),
          vitamin_d_ug: round2(food.vitamin_d_ug * qty),
          vitamin_e_mg: round2(food.vitamin_e_mg * qty),
          vitamin_k_ug: round2(food.vitamin_k_ug * qty),
        })
      }

      const totals = items.reduce(
        (acc, item) => {
          acc.total_calories += item.calories
          acc.total_protein += item.protein
          acc.total_carbs += item.carbs
          acc.total_fat += item.fat
          acc.total_vitamin_a += item.vitamin_a_ug
          acc.total_vitamin_b12 += item.vitamin_b12_ug
          acc.total_vitamin_b6 += item.vitamin_b6_mg
          acc.total_vitamin_c += item.vitamin_c_mg
          acc.total_vitamin_d += item.vitamin_d_ug
          acc.total_vitamin_e += item.vitamin_e_mg
          acc.total_vitamin_k += item.vitamin_k_ug
          return acc
        },
        {
          total_calories: 0,
          total_protein: 0,
          total_carbs: 0,
          total_fat: 0,
          total_vitamin_a: 0,
          total_vitamin_b12: 0,
          total_vitamin_b6: 0,
          total_vitamin_c: 0,
          total_vitamin_d: 0,
          total_vitamin_e: 0,
          total_vitamin_k: 0,
        }
      )

      meals.push({
        meal_id,
        user_id: DEMO_USER_ID,
        meal_type: mealType,
        meal_date: isoDateOnly(date),
        meal_journal: '',
        meal_rating: faker.number.int({ min: 3, max: 5 }),
        total_calories: round2(totals.total_calories),
        total_protein: round2(totals.total_protein),
        total_carbs: round2(totals.total_carbs),
        total_fat: round2(totals.total_fat),
        total_vitamin_c: round2(totals.total_vitamin_c),
        total_vitamin_d: round2(totals.total_vitamin_d),
        total_vitamin_a: round2(totals.total_vitamin_a),
        total_vitamin_e: round2(totals.total_vitamin_e),
        total_vitamin_k: round2(totals.total_vitamin_k),
        total_vitamin_b6: round2(totals.total_vitamin_b6),
        total_vitamin_b12: round2(totals.total_vitamin_b12),
      })

      mealItems.push(...items)
    }
  }

  await insertBatches('user_meals', meals)
  await insertBatches('meal_items', mealItems)

  console.log(`Inserted ${meals.length} meals for demo user`)
  console.log(`Inserted ${mealItems.length} meal items for demo user`)
}

seedDemoUserMeals().catch((err) => {
  console.error('Top-level seed failure:')
  console.error(JSON.stringify(err, null, 2))
  console.error(err)
})