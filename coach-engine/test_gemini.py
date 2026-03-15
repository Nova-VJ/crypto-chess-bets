import asyncio
import httpx

GEMINI_API_KEY = "AIzaSyCfoROVEWcTR4OR7JeejOHC2AI133YbC3o"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key={GEMINI_API_KEY}"

async def test_gemini():
    print("Testing Gemini...")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(GEMINI_URL, json={
                "contents": [{"parts": [{"text": "Dime hola en una palabra."}]}]
            }, timeout=10)
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text}")
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_gemini())
