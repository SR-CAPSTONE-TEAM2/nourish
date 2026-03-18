// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
// import "@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenAI } from "npm:@google/genai";
import { createClient } from "npm:@supabase/supabase-js@2";

console.log("Hello from Functions!")

Deno.serve(async (req) => { //req is query from app


  const supabase = createClient(
    Deno.env.get('EXPO_PUBLIC_SUPABASE_URL') ?? '',
    Deno.env.get('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );

  console.log("[DEBUG] Supabase client created")
  const { query } = await req.json();

  console.log("[DEBUG] Query: ", query)

  const client = new GoogleGenAI({ apiKey: Deno.env.get("GEMINI_API_KEY") });

  console.log("[DEBUG] Gemini client created")

  const embedding_response = await client.models.embedContent({
    model: "gemini-embedding-001",
    contents: [query],
    config: {
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: 768,
    }
  });

  const query_embedding = embedding_response.embeddings[0].values;

  console.log("[DEBUG] Query embedding created")

  const rpc_response = await supabase.rpc("match_research_sections", {
    query_embedding: query_embedding,
    match_threshold: 0.5,
    match_count: 5,
  });

  console.log("[DEBUG] RPC response created")

  console.log("[DEBUG] RPC response: ", rpc_response.data)
  console.log("[DEBUG] Error: ", rpc_response.error)

  const context_chunks = rpc_response.data.map((item: any) => item.content);
  const context_text = context_chunks.join("\n\n");

  console.log("[DEBUG] Context chunks created")

  const prompt = `
    You are a medical research assistant. Use the following research excerpts to answer the user's question accurately. 
    If the answer isn't in the context, say you don't have enough information from the current studies.

    CONTEXT FROM RESEARCH PAPERS:
    ${context_text}

    USER QUESTION:
    ${query}

    ANSWER:
    `;

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  console.log("[DEBUG] Response generated")

  const data = {
    message: response.text,
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
