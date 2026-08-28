import os
import requests
from dotenv import load_dotenv

load_dotenv()
key = os.getenv("GROQ_API_KEY")

r = requests.post(
    "https://api.groq.com/openai/v1/chat/completions",
    headers={"Authorization": f"Bearer {key}"},
    json={
        "model": "openai/gpt-oss-120b",
        "messages": [{"role": "user", "content": "Diz apenas: ok"}],
        "max_tokens": 10,
 },
    timeout=30,
)
print("Status:", r.status_code)
print(r.text[:1000])