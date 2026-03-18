import os

import google.genai as genai
from google.genai import types
from supabase import create_client
import dotenv
dotenv.load_dotenv()
supabase = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_KEY"))
gemini_client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

def get_answer_from_research(user_query):

    query_embedding = gemini_client.models.embed_content(
            model="gemini-embedding-001",
            contents=user_query,
            config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT", output_dimensionality=768)
        ).embeddings[0].values

    rpc_response = supabase.rpc("match_research_sections", {
        "query_embedding": query_embedding,
        "match_threshold": 0.5, # can be adjusted
        "match_count": 5       
    }).execute()

    context_chunks = [item['content'] for item in rpc_response.data]
    context_text = "\n\n".join(context_chunks)

    prompt = f"""
    You are a medical research assistant. Use the following research excerpts to answer the user's question accurately. 
    If the answer isn't in the context, say you don't have enough information from the current studies.

    CONTEXT FROM RESEARCH PAPERS:
    {context_text}

    USER QUESTION:
    {user_query}

    ANSWER:
    """
    
    response = gemini_client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )
    return response.text


# example usage
question = "How does gut microbiomes effect the brain?"
print(get_answer_from_research(question))
