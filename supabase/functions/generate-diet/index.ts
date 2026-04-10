import { createClient } from "npm:@supabase/supabase-js@2";
import { Ollama } from "npm:ollama";

console.log("Generate Diet Function started");

Deno.serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('EXPO_PUBLIC_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const authHeader = req.headers.get('Authorization');

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { startDate, endDate, preferences } = await req.json();

    // Query historical meals to provide as context
    const { data: meals, error: mealsError } = await supabase
      .from('user_meals')
      .select('meal_date, meal_type, meal_items ( ingredient_name, quantity )')
      .gte('meal_date', `${startDate} 00:00:00`)
      .lte('meal_date', `${endDate} 23:59:59`);

    if (mealsError) {
      console.error("[ERROR] Failed to fetch meals", mealsError);
    }

    const mealsContext = meals && meals.length > 0 ? meals.map(m =>
      `- ${m.meal_type}: ${m.meal_items?.map(i => `${i.quantity || 1}x ${i.ingredient_name}`).join(', ')}`
    ).join('\n') : "No historical meals found.";

    const prompt = `
You are an expert nutritionist AI. Your task is to generate a personalized daily diet plan for a user.
You MUST output ONLY valid JSON using the exact schema below. Do not include markdown formatting or reasoning text outside the JSON.

SCHEMA:
{
  "breakfast": ["Generic food item 1", "Generic food item 2"],
  "lunch": ["Item 1"],
  "dinner": ["Item 1", "Item 2"],
  "afternoon snack": ["Item 1"],
  "evening snack": []
}

INSTRUCTIONS:
- Output distinctly separated, singular, raw ingredients (e.g. "Oatmeal", "Chicken Breast", "Broccoli").
- CRITICAL: Break complex dish names apart! Do NOT output "Oatmeal with berries and nuts". You MUST separate them into multiple array items: "Oatmeal", "Berries", "Walnuts".
- For each meal array, limit the list to exactly the 1 to 5 raw ingredients that construct EXACTLY ONE dish. Do not give multiple optional dishes.
- Make sure all arrays are present in the JSON, even if empty.
- The JSON should only be for a single day. 
- The JSON should not contain any other text other than the JSON object.

USER CONTEXT:
Recent Historical Meals (for inspiration only):
${mealsContext}

Additional Preferences/Constraints:
${preferences || 'None'}

CRITICAL INSTRUCTION: You MUST respond ONLY with a raw, valid JSON object. Do NOT include ANY conversational text, introductions, explanations, markdown formatting, or bullet points. If you output anything other than a JSON dictionary, the system will crash.

ABSOLUTE ARRAY RULES:
1. MAX 5 ITEMS. Each meal array length MUST NOT EXCEED 5 items! Provide exactly one specific dish concept per meal. DO NOT generate options or lists of 20 varieties.
2. RAW ATOMIC INGREDIENTS ONLY. Do NOT output "Steel-cut oatmeal with chia seeds and raspberries". You MUST separate them into multiple literal strings -> ["Oatmeal", "Chia Seeds", "Raspberries"].

EXAMPLE OF EXPECTED ATOMIC OUTPUT:
{
  "breakfast": ["Oatmeal", "Chia Seeds", "Raspberries"],
  "lunch": ["Chicken Breast", "Brown Rice", "Broccoli", "Olive Oil"],
  "dinner": ["Salmon", "Sweet Potato", "Asparagus"],
  "afternoon snack": ["Apple", "Almonds"],
  "evening snack": []
}
`;
    //const ollamaHost = 'http://host.docker.internal:11434';
    const ollamaHost = 'http://100.82.27.91:11434';

    // --- PING CHECK ---
    try {
      console.log(`[INFO] Pinging Ollama at ${ollamaHost}...`);
      const ping = await fetch(`${ollamaHost}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (!ping.ok) throw new Error("Ping failed");
      console.log(`[INFO] Successfully reached Ollama!`);
    } catch (err) {
      console.error(`[ERROR] Could not connect to Ollama at ${ollamaHost}. Network or container routing issue.`, err);
      return new Response(JSON.stringify({ error: `Cannot reach local Ollama server at ${ollamaHost}. Please check your OLLAMA_HOST bindings or network routing.` }), { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // --- Implement Keep-Alive Stream to prevent Kong 504 Gateway Timeouts ---
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send a space character every 15 seconds to keep the Kong connection open
        const keepAliveInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(" "));
          } catch (e) { }
        }, 15000);

        try {
          const ollama = new Ollama({ host: ollamaHost });

          const MAX_RETRIES = 2;
          let finalDict = null;
          let attempt = 0;
          let rawLLMContent = "";

          while (attempt <= MAX_RETRIES && !finalDict) {
            attempt++;
            console.log(`[INFO] Generating diet plan, attempt ${attempt}...`);

            console.log(`[INFO] Sending API Request to Ollama...`);
            const responseStream = await ollama.chat({
              model: 'gemma4:26b',
              format: 'json',
              messages: [
                {
                  role: 'system',
                  content: `You are an expert nutritionist AI. You MUST output ONLY valid JSON. Your JSON MUST contain exactly these keys mapping to string arrays of singular generic ingredients: "breakfast", "lunch", "dinner", "afternoon snack", "evening snack". DO NOT generate multiple days. Return precisely 1 day. ABSOLUTE RULE: You MUST output atomic raw ingredients (e.g. "Oatmeal", "Almonds") separated into different array elements. DO NOT output complex recipes in a single string. ABSOLUTE RULE: You MUST limit each array to a MAX of 5 items! DO NOT generate a list of 10 meal options! Provide exactly ONE dish per meal.`
                },
                {
                  role: 'user', content: `Generate a diet adapting to my preferences. Output JSON.`
                },
                {
                  role: 'assistant', content: `{\n  "breakfast": ["oatmeal", "blueberries", "almonds"],\n  "lunch": ["chicken breast", "brown rice", "broccoli"],\n  "dinner": ["salmon", "sweet potato"],\n  "afternoon snack": ["apple"],\n  "evening snack": []\n}`
                },
                { role: 'user', content: prompt }
              ],
              stream: true,
              options: {
                temperature: 0.2,
                num_predict: 600
              }
            });

            let content = "";
            for await (const chunk of responseStream) {
              content += chunk.message.content;
              // Print character to terminal to track progress without newlines
              await Deno.stdout.write(encoder.encode(chunk.message.content.replace(/\n/g, "\\n")));
            }

            rawLLMContent = content;

            console.log(`\n\n[INFO] Finished LLM generation loop! Length: ${content.length}`);
            console.log(`\n=================== RAW LLM OUTPUT ===================`);
            console.log(content);
            console.log(`======================================================\n`);

            try {
              console.log(`[INFO] Attempting to parse JSON structure...`);
              content = content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
              const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || content.match(/(\{[\s\S]*\})/);
              const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();

              const parsed = JSON.parse(jsonStr);
              console.log(`[INFO] Successfully parsed valid JSON.`);
              finalDict = {
                "breakfast": [],
                "lunch": [],
                "dinner": [],
                "afternoon snack": [],
                "evening snack": []
              };

              // Detect if it's an array wrapped in a key
              let payloadArray = null;
              if (Array.isArray(parsed)) {
                payloadArray = parsed;
              } else if (parsed.meal_plan && Array.isArray(parsed.meal_plan)) {
                payloadArray = parsed.meal_plan;
              } else if (parsed.diet && Array.isArray(parsed.diet)) {
                payloadArray = parsed.diet;
              }

              if (payloadArray) {
                console.log(`[WARN] Array structure found instead of schema map. Mapping dynamically...`);
                payloadArray.forEach((item: any) => {
                  const mType = (item.meal_name || item.meal || item.type || "").toLowerCase();
                  let foods: string[] = [];
                  if (item.meal_items && Array.isArray(item.meal_items)) foods = item.meal_items;
                  else if (item.food) foods = [item.food];

                  foods.forEach(food => {
                    if (mType.includes("breakfast")) finalDict.breakfast.push(food);
                    else if (mType.includes("lunch")) finalDict.lunch.push(food);
                    else if (mType.includes("dinner")) finalDict.dinner.push(food);
                    else if (mType.includes("evening")) finalDict["evening snack"].push(food);
                    else finalDict["afternoon snack"].push(food);
                  });
                });
              } else {
                // Recursive search for the actual diet block
                const findDietBlock = (obj: any): any => {
                  if (!obj || typeof obj !== 'object') return null;
                  if (obj.breakfast || obj.lunch || obj.dinner) return obj;
                  for (const key of Object.keys(obj)) {
                     const found = findDietBlock(obj[key]);
                     if (found) return found;
                  }
                  return null;
                };

                const block = findDietBlock(parsed) || parsed;
                finalDict.breakfast = Array.isArray(block.breakfast) ? block.breakfast : [];
                finalDict.lunch = Array.isArray(block.lunch) ? block.lunch : [];
                finalDict.dinner = Array.isArray(block.dinner) ? block.dinner : [];
                finalDict["afternoon snack"] = Array.isArray(block['afternoon snack']) ? block['afternoon snack'] : Array.isArray(block.snack) ? block.snack : [];
                finalDict["evening snack"] = Array.isArray(block['evening snack']) ? block['evening snack'] : [];
              }
            } catch (e) {
              console.error(`[ERROR] Failed to parse JSON on attempt ${attempt}:`, e);
            }
          }

          if (!finalDict) {
            console.error(`[ERROR] Reached MAX_RETRIES. Bailing out.`);
            clearInterval(keepAliveInterval);
            controller.enqueue(encoder.encode(JSON.stringify({ error: "Failed to generate a valid diet plan after multiple attempts. Please regenerate." })));
            controller.close();
            return;
          }

          console.log(`[INFO] Beginning USDA RPC lookups concurrently...`);
          const enrichedDict: any = {};
          const lookupTasks: Promise<void>[] = [];

          for (const mealType of Object.keys(finalDict)) {
            enrichedDict[mealType] = [];
            const items = (finalDict as any)[mealType] || [];

            for (const ingredientStr of items) {
              if (!ingredientStr || typeof ingredientStr !== 'string') continue;

              const lookupTask = async () => {
                console.log(`[DEBUG] Looking up USDA match for: ${ingredientStr}`);

                let foodItem: any = {
                  original_name: ingredientStr,
                  fdc_id: null,
                  ingredient_name: ingredientStr,
                  calories: null,
                  protein: null,
                  carbs: null,
                  fat: null,
                  amount: null,
                  unit: "serving",
                  modifier: null
                };

                const { data } = await supabase.rpc('search_food_with_portions', {
                  search_term: ingredientStr,
                  result_limit: 1,
                  result_offset: 0
                });

                if (data && data.length > 0) {
                  console.log(`[DEBUG] Found phrase match: ${data[0].ingredient_name}`);
                  foodItem = { ...foodItem, ...data[0] };
                } else {
                  const words = ingredientStr.split(/\s+/).filter(w => w.length > 2);
                  if (words.length > 0) {
                    console.log(`[DEBUG] Phrase match failed. Falling back to word match: ${words[0]}`);
                    const { data: fallbackData } = await supabase.rpc('search_food_with_portions', {
                      search_term: words[0],
                      result_limit: 1,
                      result_offset: 0
                    });
                    if (fallbackData && fallbackData.length > 0) {
                      console.log(`[DEBUG] Found fallback match: ${fallbackData[0].ingredient_name}`);
                      foodItem = { ...foodItem, ...fallbackData[0] };
                    }
                  }
                }
                enrichedDict[mealType].push(foodItem);
              };

              lookupTasks.push(lookupTask());
            }
          }

          // Wait for all concurrent database lookups to finish!
          await Promise.all(lookupTasks);

          console.log(`[INFO] Successfully enriched diet payload and returning!`);
          clearInterval(keepAliveInterval);
          controller.enqueue(encoder.encode(JSON.stringify({ diet: enrichedDict, debug_raw_llm: rawLLMContent })));
          controller.close();

        } catch (error: any) {
          console.error("[ERROR] Execution failed:", error);
          clearInterval(keepAliveInterval);
          controller.enqueue(encoder.encode(JSON.stringify({ error: error.message })));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("[ERROR] Unhandled exception:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
