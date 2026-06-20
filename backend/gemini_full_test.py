"""Full Gemini test suite with real API calls."""
import os, time, json
from dotenv import load_dotenv
load_dotenv()

from google import genai
from google.genai import types

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

EMBED_MODEL = "models/gemini-embedding-001"
GEN_MODEL   = "models/gemini-2.5-flash"

results = {}

# --- Embedding ---
print("[EMBEDDING TEST] model: " + EMBED_MODEL)
t0 = time.time()
r = client.models.embed_content(model=EMBED_MODEL, contents="machine learning")
lat = round((time.time()-t0)*1000)
vec = r.embeddings[0].values
print(f"  Status:  SUCCESS")
print(f"  Latency: {lat}ms")
print(f"  Dims:    {len(vec)}")
print(f"  Sample:  {vec[:4]}")
results["embed"] = "PASS"
time.sleep(3)

# --- Chat ---
print()
print("[CHAT GENERATION TEST] model: " + GEN_MODEL)
t0 = time.time()
r = client.models.generate_content(
    model=GEN_MODEL,
    contents="Explain neural networks in 3 sentences.",
)
lat = round((time.time()-t0)*1000)
print(f"  Status:  SUCCESS")
print(f"  Latency: {lat}ms")
print(f"  Tokens in:  {r.usage_metadata.prompt_token_count}")
print(f"  Tokens out: {r.usage_metadata.candidates_token_count}")
print(f"  Answer: {r.text[:250]}")
results["chat"] = "PASS"
time.sleep(3)

# --- Quiz ---
print()
print("[QUIZ GENERATION TEST]")
quiz_prompt = (
    'Generate 3 MCQ quiz questions about machine learning. '
    'Return a JSON array with this structure: '
    '[{"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], '
    '"answer": "A", "explanation": "..."}]'
)
t0 = time.time()
r = client.models.generate_content(
    model=GEN_MODEL,
    contents=quiz_prompt,
    config=types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0.4,
    ),
)
lat = round((time.time()-t0)*1000)
parsed = json.loads(r.text)
print(f"  Status:     SUCCESS")
print(f"  Latency:    {lat}ms")
print(f"  Questions:  {len(parsed)}")
for i, q in enumerate(parsed[:2], 1):
    print(f"  Q{i}: {q['question'][:80]}")
results["quiz"] = "PASS"
time.sleep(3)

# --- Flashcards ---
print()
print("[FLASHCARD GENERATION TEST]")
flash_prompt = (
    "Generate 3 flashcards about neural networks. "
    "Return a JSON array: "
    '[{"front": "...", "back": "...", "source_document": "test.pdf", "page_reference": "p.1"}]'
)
t0 = time.time()
r = client.models.generate_content(
    model=GEN_MODEL,
    contents=flash_prompt,
    config=types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0.4,
    ),
)
lat = round((time.time()-t0)*1000)
parsed = json.loads(r.text)
print(f"  Status:      SUCCESS")
print(f"  Latency:     {lat}ms")
print(f"  Flashcards:  {len(parsed)}")
for i, f in enumerate(parsed[:2], 1):
    print(f"  F{i}: {str(f.get('front', ''))[:70]}")
results["flashcards"] = "PASS"

print()
print("=" * 50)
print("FINAL RESULTS")
print("=" * 50)
for k, v in results.items():
    print(f"  {k}: {v}")
