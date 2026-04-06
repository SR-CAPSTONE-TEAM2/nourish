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
    options?.timeout ?? 30000
  )

  try {
    const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
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
 * Analyze a food item — ask the LLM to identify ingredients and
 * potential chemical/pesticide concerns. Returns structured JSON.
 */
export type FoodAnalysisResult = {
  ingredients: {
    name: string
    chemicals: string[]
    pesticides: string[]
    risk_score: number // -10 to +10
    reasoning: string
  }[]
  overall_risk_score: number
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

  const response = await chatWithOllama([
    {
      role: 'system',
      content: `You are a food safety analyst. Given a food item, identify its likely ingredients and any chemicals or pesticides commonly associated with those ingredients. Consider factors like whether the food is organic, the brand, and how it was produced.

Respond ONLY with valid JSON matching this exact schema — no markdown, no explanation outside the JSON:
{
  "ingredients": [
    {
      "name": "ingredient name",
      "chemicals": ["chemical names commonly found in this ingredient"],
      "pesticides": ["pesticide names commonly found on this ingredient"],
      "risk_score": <number from -10 (very harmful) to +10 (very beneficial)>,
      "reasoning": "brief explanation"
    }
  ],
  "overall_risk_score": <number from -10 to +10>,
  "summary": "brief overall assessment"
}`,
    },
    {
      role: 'user',
      content: `Analyze this food item: "${foodName}"${modifierStr}`,
    },
  ], { temperature: 0.3, timeout: 60000 })

  // Parse the JSON response — strip any markdown fencing the LLM might add
  const cleaned = response
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    return JSON.parse(cleaned) as FoodAnalysisResult
  } catch {
    throw new Error(`Failed to parse LLM response as JSON: ${cleaned.slice(0, 200)}`)
  }
}
