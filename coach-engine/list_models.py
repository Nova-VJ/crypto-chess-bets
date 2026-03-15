import asyncio
import httpx

GEMINI_API_KEY = "AIzaSyCfoROVEWcTR4OR7JeejOHC2AI133YbC3o"
LIST_MODELS_URL = f"https://generativelanguage.googleapis.com/v1beta/models?key={GEMINI_API_KEY}"

async def list_models():
    print("Listing Models...")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(LIST_MODELS_URL, timeout=10)
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text}")
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(list_models())
