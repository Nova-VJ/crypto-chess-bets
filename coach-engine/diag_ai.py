import asyncio
import sys
import os

# Set Proactor loop
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import analyzer

async def diag():
    print(f"Loop type: {type(asyncio.get_event_loop()).__name__}")
    fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
    persona = "fischer"
    print(f"Requesting move for {persona}...")
    try:
        result = await analyzer.get_persona_move(fen, persona)
        print("SUCCESS:", result)
    except Exception as e:
        print("FAILED:", e)

if __name__ == "__main__":
    asyncio.run(diag())
