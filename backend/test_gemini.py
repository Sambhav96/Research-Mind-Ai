from dotenv import load_dotenv
from google import genai
import os

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

print("KEY:", api_key[:10] + "...")

client = genai.Client(api_key=api_key)

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Say hello in one sentence."
)

print("\nRESPONSE:")
print(response.text)