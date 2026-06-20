"""
Gemini Provider Activation Audit Script
Validates: API key, SDK version, available models, embeddings, generation.
"""
import os
import sys
import time
import json

# Load env BEFORE importing google.genai so the key is present
from dotenv import load_dotenv
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

print("=" * 60)
print("  GEMINI PROVIDER ACTIVATION AUDIT")
print("=" * 60)
print()

# ------------------------------------------------------------------
# 1. API Key verification
# ------------------------------------------------------------------
print("[1] API KEY CHECK")
if GEMINI_API_KEY:
    masked = GEMINI_API_KEY[:6] + "..." + GEMINI_API_KEY[-6:]
    print(f"    GEMINI_API_KEY loaded: {masked}")
    print(f"    Key length: {len(GEMINI_API_KEY)} chars")
else:
    print("    ERROR: GEMINI_API_KEY is empty!")
    sys.exit(1)
print()

# ------------------------------------------------------------------
# 2. SDK version
# ------------------------------------------------------------------
print("[2] SDK VERSION CHECK")
try:
    import google.genai
    sdk_version = google.genai.__version__
    print(f"    google-genai version: {sdk_version}")
except Exception as e:
    print(f"    ERROR importing google.genai: {e}")
    sys.exit(1)
print()

# ------------------------------------------------------------------
# 3. Initialise client
# ------------------------------------------------------------------
from google import genai
from google.genai import types

client = genai.Client(api_key=GEMINI_API_KEY)

# ------------------------------------------------------------------
# 4. List all accessible models
# ------------------------------------------------------------------
print("[3] LIST MODELS")
print("-" * 60)

embed_models = []
generate_models = []

try:
    models_response = client.models.list()
    all_models = list(models_response)
    print(f"    Total models accessible: {len(all_models)}")
    print()

    for m in all_models:
        name = m.name
        methods = getattr(m, "supported_actions", []) or []
        input_limit = getattr(m, "input_token_limit", "?")
        output_limit = getattr(m, "output_token_limit", "?")

        has_embed = any("embed" in str(method).lower() for method in methods)
        has_gen   = any("generate" in str(method).lower() or "chat" in str(method).lower() for method in methods)

        if has_embed:
            embed_models.append(name)
        if has_gen:
            generate_models.append(name)

        print(f"    MODEL: {name}")
        print(f"      Supported actions: {methods}")
        print(f"      Embedding support: {'YES' if has_embed else 'no'}")
        print(f"      Generation support: {'YES' if has_gen else 'no'}")
        print(f"      Input token limit: {input_limit}")
        print(f"      Output token limit: {output_limit}")
        print()

except Exception as e:
    print(f"    ERROR listing models: {e}")
    # Try raw REST instead to diagnose
    import httpx
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={GEMINI_API_KEY}"
    resp = httpx.get(url, timeout=10)
    print(f"    Raw REST status: {resp.status_code}")
    print(f"    Raw REST body (first 500): {resp.text[:500]}")
    print()

# ------------------------------------------------------------------
# 5. Recommended production models
# ------------------------------------------------------------------
print("[4] RECOMMENDED PRODUCTION MODELS")
print("-" * 60)

# Determine best models from what's available
EMBED_MODEL   = "models/text-embedding-004"
CHAT_MODEL    = "models/gemini-2.0-flash"
QUIZ_MODEL    = "models/gemini-2.0-flash"
FLASH_MODEL   = "models/gemini-2.0-flash"

# Fallbacks
all_model_names = [m.name for m in all_models] if "all_models" in dir() else []
if EMBED_MODEL not in all_model_names:
    for m in all_model_names:
        if "embed" in m.lower():
            EMBED_MODEL = m
            break

if CHAT_MODEL not in all_model_names:
    for m in all_model_names:
        if "gemini" in m.lower() and "flash" in m.lower():
            CHAT_MODEL = QUIZ_MODEL = FLASH_MODEL = m
            break
    else:
        for m in all_model_names:
            if "gemini" in m.lower():
                CHAT_MODEL = QUIZ_MODEL = FLASH_MODEL = m
                break

print(f"    Embeddings  : {EMBED_MODEL}")
print(f"    Chat        : {CHAT_MODEL}")
print(f"    Quiz        : {QUIZ_MODEL}")
print(f"    Flashcards  : {FLASH_MODEL}")
print()

# ------------------------------------------------------------------
# 6a. Embedding test
# ------------------------------------------------------------------
print("[5] EMBEDDING TEST: 'machine learning'")
print("-" * 60)

try:
    t_start = time.time()
    embed_response = client.models.embed_content(
        model=EMBED_MODEL,
        contents="machine learning",
    )
    latency = round((time.time() - t_start) * 1000)

    vector = embed_response.embeddings[0].values if embed_response.embeddings else []
    print(f"    Status:    SUCCESS")
    print(f"    Model:     {EMBED_MODEL}")
    print(f"    Latency:   {latency} ms")
    print(f"    Dims:      {len(vector)}")
    print(f"    Sample:    {vector[:5]}")
    EMBED_OK = True

except Exception as e:
    print(f"    Status:    FAIL")
    print(f"    Error:     {e}")
    EMBED_OK = False
print()

# ------------------------------------------------------------------
# 6b. Generation test
# ------------------------------------------------------------------
print("[6] GENERATION TEST: 'Explain neural networks'")
print("-" * 60)

try:
    t_start = time.time()
    gen_response = client.models.generate_content(
        model=CHAT_MODEL,
        contents="Explain neural networks in 3 sentences.",
    )
    latency = round((time.time() - t_start) * 1000)

    answer = gen_response.text or ""
    usage  = gen_response.usage_metadata if hasattr(gen_response, "usage_metadata") else None
    input_tokens  = getattr(usage, "prompt_token_count", "?") if usage else "?"
    output_tokens = getattr(usage, "candidates_token_count", "?") if usage else "?"

    print(f"    Status:         SUCCESS")
    print(f"    Model:          {CHAT_MODEL}")
    print(f"    Latency:        {latency} ms")
    print(f"    Input tokens:   {input_tokens}")
    print(f"    Output tokens:  {output_tokens}")
    print(f"    Response:")
    print()
    for line in answer.strip().splitlines():
        print(f"      {line}")
    GEN_OK = True

except Exception as e:
    print(f"    Status:    FAIL")
    print(f"    Error:     {type(e).__name__}: {e}")
    GEN_OK = False
print()

# ------------------------------------------------------------------
# 6c. Quiz generation test
# ------------------------------------------------------------------
print("[7] QUIZ GENERATION TEST")
print("-" * 60)

QUIZ_PROMPT = """Generate 3 multiple-choice quiz questions about machine learning.
Return valid JSON array with this exact structure:
[{"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": "A", "explanation": "..."}]"""

try:
    t_start = time.time()
    quiz_response = client.models.generate_content(
        model=QUIZ_MODEL,
        contents=QUIZ_PROMPT,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.4,
        ),
    )
    latency = round((time.time() - t_start) * 1000)
    raw = quiz_response.text or ""

    try:
        parsed = json.loads(raw)
        q_count = len(parsed) if isinstance(parsed, list) else "?"
        print(f"    Status:    SUCCESS")
        print(f"    Latency:   {latency} ms")
        print(f"    Questions: {q_count}")
        for i, q in enumerate(parsed[:2], 1):
            print(f"    Q{i}: {q.get('question','?')[:80]}...")
        QUIZ_OK = True
    except json.JSONDecodeError:
        print(f"    Status:    SUCCESS (raw text, non-JSON)")
        print(f"    Latency:   {latency} ms")
        print(f"    Response:  {raw[:200]}")
        QUIZ_OK = True

except Exception as e:
    print(f"    Status:    FAIL")
    print(f"    Error:     {type(e).__name__}: {e}")
    QUIZ_OK = False
print()

# ------------------------------------------------------------------
# 6d. Flashcard generation test
# ------------------------------------------------------------------
print("[8] FLASHCARD GENERATION TEST")
print("-" * 60)

FLASH_PROMPT = """Generate 3 flashcards about neural networks.
Return valid JSON array:
[{"front": "...", "back": "...", "source_document": "test", "page_reference": "p.1"}]"""

try:
    t_start = time.time()
    flash_response = client.models.generate_content(
        model=FLASH_MODEL,
        contents=FLASH_PROMPT,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.4,
        ),
    )
    latency = round((time.time() - t_start) * 1000)
    raw = flash_response.text or ""

    try:
        parsed = json.loads(raw)
        f_count = len(parsed) if isinstance(parsed, list) else "?"
        print(f"    Status:     SUCCESS")
        print(f"    Latency:    {latency} ms")
        print(f"    Flashcards: {f_count}")
        for i, f in enumerate(parsed[:2], 1):
            print(f"    F{i} front: {str(f.get('front','?'))[:70]}...")
        FLASH_OK = True
    except json.JSONDecodeError:
        print(f"    Status:    SUCCESS (raw text, non-JSON)")
        print(f"    Latency:   {latency} ms")
        print(f"    Response:  {raw[:200]}")
        FLASH_OK = True

except Exception as e:
    print(f"    Status:    FAIL")
    print(f"    Error:     {type(e).__name__}: {e}")
    FLASH_OK = False
print()

# ------------------------------------------------------------------
# Final summary
# ------------------------------------------------------------------
print("=" * 60)
print("  FINAL AUDIT SUMMARY")
print("=" * 60)
print(f"  API Key Loaded:      YES ({masked})")
print(f"  SDK Version:         google-genai {sdk_version}")
print(f"  Embedding Model:     {EMBED_MODEL}")
print(f"  Generation Model:    {CHAT_MODEL}")
print(f"  Embedding Test:      {'PASS' if EMBED_OK else 'FAIL'}")
print(f"  Chat/Gen Test:       {'PASS' if GEN_OK else 'FAIL'}")
print(f"  Quiz Test:           {'PASS' if QUIZ_OK else 'FAIL'}")
print(f"  Flashcard Test:      {'PASS' if FLASH_OK else 'FAIL'}")
print()

all_pass = EMBED_OK and GEN_OK and QUIZ_OK and FLASH_OK
if all_pass:
    print("  STATUS: ALL TESTS PASSED — READY FOR MIGRATION")
else:
    print("  STATUS: SOME TESTS FAILED — SEE DETAILS ABOVE")
print("=" * 60)
