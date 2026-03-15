import traceback
from main import play_move, PlayMoveRequest
import asyncio

async def test():
    req = PlayMoveRequest(fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", persona="fischer")
    try:
        res = await play_move(req)
        print("RESULT", res)
    except Exception as e:
        traceback.print_exc()

asyncio.run(test())
