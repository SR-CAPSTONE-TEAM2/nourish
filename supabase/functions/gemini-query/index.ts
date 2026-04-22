// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
// import "@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenAI } from "npm:@google/genai";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Ollama } from "npm:ollama";

console.log("Hello from Functions!")

Deno.serve(async (req) => { //req is query from app


  const supabase = createClient(
    Deno.env.get('EXPO_PUBLIC_SUPABASE_URL') ?? '',
    Deno.env.get('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );

  console.log("[DEBUG] Supabase client created")

  // Security Check: Verify User
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("[ERROR] Unauthorized request", authError);
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const { query, nutritionData } = await req.json();

  console.log("[DEBUG] Query: ", query)
  console.log("[DEBUG] Nutrition Data provided: ", !!nutritionData)

  const apiKey = Deno.env.get("OLLAMA_API_KEY");
  const ollamaHost = apiKey ? 'https://ollama.com' : 'http://100.82.27.91:11434';
  
  const ollama = new Ollama({ 
     host: ollamaHost, 
     fetch: (input, init) => {
       const options = init || {};
       if (apiKey) {
         options.headers = { ...options.headers, 'Authorization': `Bearer ${apiKey}` };
       }
       return fetch(input, options);
     }
  });

  let prompt = "";
  if (nutritionData) {
    prompt = `
You are a helpful nutrition and health assistant. Here is the user's current daily nutrition totals for context:
${JSON.stringify(nutritionData, null, 2)}

Please answer the following question from the user:
${query}
    `;
  } else {
    prompt = `
You are a helpful nutrition and health assistant. Please answer the following question from the user:
${query}
    `;
  }

  const response = await ollama.chat({
    model: apiKey ? 'gpt-oss:120b-cloud' : 'MedAIBase/MedGemma1.5:4b',
    messages: [{ role: 'user', content: prompt }],
  });

  let content = response.message.content || "";
  let thought = "";

  // Parse <think>...</think> tags if the model uses reasoning blocks
  const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
  if (thinkMatch) {
    thought = thinkMatch[1].trim();
    content = content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
  }

  console.log("[DEBUG] Final text:", content);

  const data = {
    message: content,
    thought: thought,
  }

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/gemini-query' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
