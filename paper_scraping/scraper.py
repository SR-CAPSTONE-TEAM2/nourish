from paperscraper.pubmed import get_and_dump_pubmed_papers
from paperscraper.pdf import save_pdf_from_dump
import json

input_file = 'gi_studies.jsonl'
output_file = 'gi_studies_cleaned.jsonl'

# these can be changed 
ibd_keywords = ["inflammatory bowel disease", "ibd", "crohns", "ulcerative colitis", "Crohn's Disease"]
lifestyle_keywords = ["diet", "exercise", "stress", "sleep", "smoking", "alcohol"]
# make queries
queries = []
for ibd_keyword in ibd_keywords:
    for lifestyle_keyword in lifestyle_keywords:
        queries.append([ibd_keyword, lifestyle_keyword])


get_and_dump_pubmed_papers(queries, output_filepath='gi_studies.jsonl', max_results=100) #change max_results to desired amount of papers

with open(input_file, 'r') as f_in, open(output_file, 'w') as f_out:
    for line in f_in:
        paper = json.loads(line)
        if 'doi' in paper and isinstance(paper['doi'], str):
            f_out.write(json.dumps(paper) + '\n')


save_pdf_from_dump(
    'gi_studies_cleaned.jsonl', 
    pdf_path='./papers_folder', 
    key_to_save='doi'
)