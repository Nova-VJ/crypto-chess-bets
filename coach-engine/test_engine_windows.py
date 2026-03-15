import asyncio
import sys
import os
import chess.engine

STOCKFISH_PATH = os.path.join(os.getcwd(), "engine", "stockfish-windows-x86-64-avx2.exe")

async def test_engine():
    print(f"Platform: {sys.platform}")
    if sys.platform == "win32":
        print("Setting ProactorEventLoopPolicy...")
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    print(f"Testing Stockfish at: {STOCKFISH_PATH}")
    if not os.path.exists(STOCKFISH_PATH):
        print("ERROR: Stockfish not found!")
        return

    try:
        transport, engine = await chess.engine.popen_uci(STOCKFISH_PATH)
        print("Engine connected successfully!")
        
        board = chess.Board()
        result = await engine.play(board, chess.engine.Limit(time=0.1))
        print(f"Engine played move: {result.move}")
        
        await engine.quit()
        transport.close()
        print("Engine closed correctly.")
    except Exception as e:
        print(f"FAILED with error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_engine())
