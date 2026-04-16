/**
 * Ollama LLM client — connects to a local model over Tailscale.
 *
 * Env vars (set in .env):
 *   EXPO_PUBLIC_OLLAMA_HOST  — e.g. "http://100.x.x.x:11434"
 *   EXPO_PUBLIC_OLLAMA_MODEL — e.g. "meditron", "medllama2"
 */

const OLLAMA_HOST = process.env.EXPO_PUBLIC_OLLAMA_HOST ?? ''
const OLLAMA_MODEL = process.env.EXPO_PUBLIC_OLLAMA_MODEL ?? ''

export type OllamaMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type OllamaChatResponse = {
  model: string
  message: { role: string; content: string }
  done: boolean
}

/* Check if the Ollama connection is configured (env vars are set).*/
export function isOllamaConfigured(): boolean {
  return (
    OLLAMA_HOST.length > 0 &&
    !OLLAMA_HOST.includes('TAILSCALE_IP_HERE') &&
    OLLAMA_MODEL.length > 0 &&
    !OLLAMA_MODEL.includes('MODEL_NAME_HERE')
  )
}

/* Check if the Ollama server is reachable.*/
export async function pingOllama(): Promise<boolean> {
  if (!isOllamaConfigured()) return false

  try {
    const res = await fetch(OLLAMA_HOST, { method: 'GET' })
    return res.ok
  } catch {
    return false
  }
}

/* Send a chat completion request to Ollama, uses  /api/chat endpoint (non-streaming). */
export async function chatWithOllama(
  messages: OllamaMessage[],
  options?: { temperature?: number; timeout?: number }
): Promise<string> {
  if (!isOllamaConfigured()) {
    throw new Error(
      'Ollama is not configured. Set EXPO_PUBLIC_OLLAMA_HOST and EXPO_PUBLIC_OLLAMA_MODEL in .env'
    )
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(
    () => controller.abort(),
    options?.timeout ?? 120000
  )

  try {
    const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        format: 'json',
        options: {
          temperature: options?.temperature ?? 0.3,
        },
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Ollama error ${res.status}: ${text}`)
    }

    const data: OllamaChatResponse = await res.json()
    return data.message.content
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Ollama request timed out — is the PC online on Tailscale?')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Extract a JSON object from a string that may contain surrounding text,
 * markdown fencing, or other non-JSON content.
 */
function extractJson(raw: string): unknown | null {
  // 1. Try parsing the raw string directly
  try { return JSON.parse(raw.trim()) } catch {}

  // 2. Try extracting from markdown code fences
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()) } catch {}
  }

  // 3. Find the first { and last } and try parsing that substring
  const firstBrace = raw.indexOf('{')
  const lastBrace = raw.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(raw.slice(firstBrace, lastBrace + 1)) } catch {}
  }

  return null
}

/**
 * Analyze a food item — ask the LLM to identify ingredients and
 * potential chemical/pesticide concerns. Returns structured JSON.
 */
export type IngredientAnalysis = {
  name: string
  chemicals: string[]
  pesticides: string[]
  nutrient_score: number      // -10 to +10 (nutritional value: vitamins, protein, fiber, etc.)
  chemical_penalty: number    // -10 to 0 (exposure to chemicals/additives; 0 = none)
  processing_penalty: number  // -10 to 0 (level of processing; 0 = whole food)
  risk_score: number          // sum of the three above, clamped to [-10, +10]
  reasoning: string
}

export type FoodAnalysisResult = {
  ingredients: IngredientAnalysis[]
  overall_nutrient_score: number
  overall_chemical_penalty: number
  overall_processing_penalty: number
  overall_risk_score: number  // sum of overalls, clamped to [-10, +10]
  summary: string
}

export async function analyzeFoodItem(
  foodName: string,
  modifiers?: {
    brand?: string
    organic?: boolean
    raw?: boolean
    grassFed?: boolean
    wildCaught?: boolean
  }
): Promise<FoodAnalysisResult> {
  const modifierText = []
  if (modifiers?.brand) modifierText.push(`Brand: ${modifiers.brand}`)
  if (modifiers?.organic) modifierText.push('Labeled as organic')
  if (modifiers?.raw) modifierText.push('Raw/unprocessed')
  if (modifiers?.grassFed) modifierText.push('Grass-fed')
  if (modifiers?.wildCaught) modifierText.push('Wild-caught')

  const modifierStr = modifierText.length
    ? `\nAdditional info: ${modifierText.join(', ')}`
    : ''

  const appleExample = JSON.stringify({
    ingredients: [{
      name: 'apple',
      chemicals: [],
      pesticides: ['glyphosate', 'organophosphates'],
      nutrient_score: 6,
      chemical_penalty: 0,
      processing_penalty: 0,
      risk_score: 5,
      reasoning: 'Whole fruit rich in fiber and vitamins; non-organic apples often carry pesticide residue.',
    }],
    overall_nutrient_score: 6,
    overall_chemical_penalty: 0,
    overall_processing_penalty: 0,
    overall_risk_score: 5,
    summary: 'Nutritious whole fruit with minor pesticide concern.',
  })

  const bigMacExample = JSON.stringify({
    ingredients: [
      { name: 'sesame seed bun', chemicals: ['high-fructose corn syrup', 'dough conditioners'], pesticides: ['glyphosate'], nutrient_score: 0, chemical_penalty: -2, processing_penalty: -3, risk_score: -5, reasoning: 'Refined white flour with additives.' },
      { name: 'beef patty', chemicals: ['hormones', 'antibiotics'], pesticides: [], nutrient_score: 3, chemical_penalty: -2, processing_penalty: -2, risk_score: -1, reasoning: 'Protein and iron, but factory-farmed beef.' },
      { name: 'american cheese', chemicals: ['emulsifiers', 'sodium phosphate'], pesticides: [], nutrient_score: 1, chemical_penalty: -2, processing_penalty: -3, risk_score: -4, reasoning: 'Processed cheese product, high sodium.' },
      { name: 'big mac sauce', chemicals: ['soybean oil', 'preservatives', 'HFCS'], pesticides: [], nutrient_score: -1, chemical_penalty: -3, processing_penalty: -4, risk_score: -8, reasoning: 'Ultra-processed condiment with seed oils and sugar.' },
      { name: 'iceberg lettuce', chemicals: [], pesticides: ['pyrethroids'], nutrient_score: 2, chemical_penalty: -1, processing_penalty: 0, risk_score: 1, reasoning: 'Low-nutrient leafy green.' },
      { name: 'pickles', chemicals: ['sodium benzoate', 'yellow #5'], pesticides: [], nutrient_score: 0, chemical_penalty: -2, processing_penalty: -1, risk_score: -3, reasoning: 'Preserved cucumbers with artificial colors.' },
      { name: 'onion', chemicals: [], pesticides: ['organophosphates'], nutrient_score: 2, chemical_penalty: -1, processing_penalty: 0, risk_score: 1, reasoning: 'Whole vegetable, minor pesticide residue.' },
    ],
    overall_nutrient_score: 1,
    overall_chemical_penalty: -3,
    overall_processing_penalty: -4,
    overall_risk_score: -6,
    summary: 'Ultra-processed fast food with multiple additives; low nutritional value relative to calorie load.',
  })

  const response = await chatWithOllama([
    {
      role: 'system',
      content: `You are a food safety JSON API. Respond with ONLY a JSON object — no markdown, no prose, no code fences.

SCHEMA (all numbers are integers):
{
  "ingredients": [{
    "name": "string",
    "chemicals": ["string"],
    "pesticides": ["string"],
    "nutrient_score": -10..+10,      // nutritional value: vitamins, protein, fiber, minerals
    "chemical_penalty": -10..0,      // exposure to additives/chemicals; 0 if none
    "processing_penalty": -10..0,    // level of processing; 0 for whole foods
    "risk_score": -10..+10,          // sum of the three, clamped to [-10, +10]
    "reasoning": "short string"
  }],
  "overall_nutrient_score": -10..+10,
  "overall_chemical_penalty": -10..0,
  "overall_processing_penalty": -10..0,
  "overall_risk_score": -10..+10,    // sum of the three overalls, clamped
  "summary": "string"
}

SCORING GUIDE:
- nutrient_score: +6..+10 = nutrient-dense whole foods (leafy greens, salmon, berries); +1..+5 = decent nutrition; 0 = empty calories; negative = net harmful to nutrition (pure sugar, trans fats)
- chemical_penalty: 0 = none; -1..-3 = pesticide residue or mild additives; -4..-7 = multiple preservatives/dyes; -8..-10 = heavy industrial additives
- processing_penalty: 0 = raw/whole; -1..-3 = cooked/minimally processed; -4..-7 = refined (white flour, refined oils); -8..-10 = ultra-processed (fast food, candy, soda)

INGREDIENT DECOMPOSITION: For composite foods (burgers, pizza, sandwiches, meals), list EVERY distinct ingredient — bun, patty, cheese, sauce, toppings. Do not lump them together. Expect 5-10 ingredients for composite foods.`,
    },
    { role: 'user', content: `Analyze: "apple"` },
    { role: 'assistant', content: appleExample },
    { role: 'user', content: `Analyze: "Big Mac"` },
    { role: 'assistant', content: bigMacExample },
    { role: 'user', content: `Analyze: "${foodName}"${modifierStr}` },
  ], { temperature: 0.1, timeout: 180000 })

  // Extract JSON from the response — handle markdown fencing, leading text, etc.
  const parsed = extractJson(response)
  if (!parsed) {
    throw new Error(`Failed to parse LLM response as JSON: ${response.slice(0, 300)}`)
  }
  return normalizeAnalysis(parsed as FoodAnalysisResult)
}

/** Clamp a number to [-10, +10]. */
const clamp10 = (n: number) => Math.max(-10, Math.min(10, Math.round(n)))

/**
 * Recompute derived scores from their components so the math is always consistent,
 * regardless of whether the model did the arithmetic correctly.
 */
function normalizeAnalysis(result: FoodAnalysisResult): FoodAnalysisResult {
  const ingredients = (result.ingredients ?? []).map((ing) => {
    const nutrient = ing.nutrient_score ?? 0
    const chemical = Math.min(0, ing.chemical_penalty ?? 0)
    const processing = Math.min(0, ing.processing_penalty ?? 0)
    return {
      ...ing,
      nutrient_score: clamp10(nutrient),
      chemical_penalty: clamp10(chemical),
      processing_penalty: clamp10(processing),
      risk_score: clamp10(nutrient + chemical + processing),
    }
  })

  const avg = (nums: number[]) => nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
  const overallNutrient = clamp10(avg(ingredients.map(i => i.nutrient_score)))
  const overallChemical = clamp10(avg(ingredients.map(i => i.chemical_penalty)))
  const overallProcessing = clamp10(avg(ingredients.map(i => i.processing_penalty)))

  return {
    ...result,
    ingredients,
    overall_nutrient_score: overallNutrient,
    overall_chemical_penalty: overallChemical,
    overall_processing_penalty: overallProcessing,
    overall_risk_score: clamp10(overallNutrient + overallChemical + overallProcessing),
  }
}
