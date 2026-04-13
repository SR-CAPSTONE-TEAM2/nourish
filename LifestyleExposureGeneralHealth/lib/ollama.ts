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

  const exampleJson = `{"ingredients":[{"name":"wheat flour","chemicals":["bromate"],"pesticides":["glyphosate"],"risk_score":2,"reasoning":"common grain"}],"overall_risk_score":2,"summary":"moderate risk"}`

  const response = await chatWithOllama([
    {
      role: 'system',
      content: `You are a food safety JSON API. You MUST respond with ONLY a JSON object, no other text. No markdown, no explanation, no code fences.

The JSON must have this structure:
{"ingredients":[{"name":"string","chemicals":["string"],"pesticides":["string"],"risk_score":0,"reasoning":"string"}],"overall_risk_score":0,"summary":"string"}

risk_score ranges from -10 (harmful) to +10 (beneficial). Keep ingredient lists short (max 5 ingredients).`,
    },
    {
      role: 'user',
      content: `Analyze: "apple"`,
    },
    {
      role: 'assistant',
      content: exampleJson,
    },
    {
      role: 'user',
      content: `Analyze: "${foodName}"${modifierStr}`,
    },
  ], { temperature: 0.1, timeout: 180000 })

  // Extract JSON from the response — handle markdown fencing, leading text, etc.
  const parsed = extractJson(response)
  if (!parsed) {
    throw new Error(`Failed to parse LLM response as JSON: ${response.slice(0, 300)}`)
  }
  return parsed as FoodAnalysisResult
}
