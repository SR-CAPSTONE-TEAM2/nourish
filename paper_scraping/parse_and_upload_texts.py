import os
import re
import bioc
from google import genai
from google.genai import types
from supabase import create_client
import dotenv
import time
from keywords import NUTRIENT_KEYWORDS, TOXIN_KEYWORDS, HORMONE_KEYWORDS, MECHANISM_KEYWORDS, DISEASE_KEYWORDS

#combine all keywords
ALL_KEYWORDS = {**NUTRIENT_KEYWORDS, **TOXIN_KEYWORDS, **HORMONE_KEYWORDS, **MECHANISM_KEYWORDS, **DISEASE_KEYWORDS}

dotenv.load_dotenv()

supabase = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_KEY"))
gemini_client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))


def extract_tags(text_chunk, keyword_dict):
    found_tags = set()
    text_lower = text_chunk.lower()
    
    for category, synonyms in keyword_dict.items():
        # Check if ANY synonym exists in the text
        if any(syn in text_lower for syn in synonyms):
            found_tags.add(category)
            
    return list(found_tags)

def parse_and_upload_bioc(xml_file_path):
    # --- STEP 1: Parse BioC XML ---
    with open(xml_file_path, 'r', encoding='utf-8') as f:
        collection = bioc.biocxml.load(f)
    
    doc = collection.documents[0]
    
    metadata = {
        "title": "",
        "pubmed_id": None,
        "doi": None,
        "authors": [],
        "journal": "None", 
        "publication_date": None
    }

    sections = []
    for passage in doc.passages:
        infons = passage.infons
        stype = infons.get("section_type", "")
        
        if stype == "TITLE":
            metadata["title"] = passage.text
            metadata["pubmed_id"] = infons.get("article-id_pmid")
            metadata["doi"] = infons.get("article-id_doi")
            metadata["publication_date"] = f"{infons.get('year', '2026')}-01-01"
            
        for key, value in infons.items():
            if key.startswith("name_"):
                metadata["authors"].append(value.replace("surname:", "").replace(";given-names:", " "))
        is_target_section = any(keyword in stype.upper() for keyword in ["ABSTRACT", "RESULTS", "DISCUSS", "CONCL"])
        
        if passage.text and is_target_section:
            sections.append({
                "content": passage.text,
                "section_name": stype
            })

    paper_insert = supabase.table("papers").upsert({
        "pubmed_id": metadata["pubmed_id"],
        "doi": metadata["doi"],
        "title": metadata["title"],
        "authors": metadata["authors"],
        "publication_date": metadata["publication_date"],
    }, on_conflict="pubmed_id").execute()

    paper_id = paper_insert.data[0]['id']

    chunk_data = []
    i = 0
    for sec in sections:
        res = gemini_client.models.embed_content(
            model="gemini-embedding-001",
            contents=sec["content"],
            config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT", output_dimensionality=768)
        )
        time.sleep(1)
        chunk_data.append({
            "paper_id": paper_id,
            "content": sec["content"],
            "section_name": sec["section_name"],
            "embedding": res.embeddings[0].values,
            "diseases_referenced": extract_tags(sec["content"], ALL_KEYWORDS)
        })
        print(f"Processed section {i+1}/{len(sections)}")
        i += 1

    supabase.table("research_sections").insert(chunk_data).execute()
    print(f"Successfully uploaded: {metadata['title']}")


for file in os.listdir("papers_folder")[40:60]:
    if file.endswith(".xml"):
        parse_and_upload_bioc(os.path.join("papers_folder", file))