import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load env from the agent_network directory
load_dotenv("agent_network/.env")

api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    print("❌ GOOGLE_API_KEY not found in agent_network/.env")
    exit(1)

genai.configure(api_key=api_key)

print(f"Listing models for key: {api_key[:5]}...")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
except Exception as e:
    print(f"❌ Error listing models: {e}")
