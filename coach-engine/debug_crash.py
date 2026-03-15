import sys
import os
import asyncio
import chess
import httpx
import json

# Mocking parts of main.py
def get_tactical_context(fen: str):
    try:
        board = chess.Board(fen)
        legal_moves = [board.san(move) for move in board.legal_moves]
        rows = []
        for rank in range(7, -1, -1):
            row = []
            for file in range(8):
                piece = board.piece_at(chess.square(file, rank))
                if piece:
                    color = "Blanco" if piece.color == chess.WHITE else "Negro"
                    names = {chess.PAWN: "Peón", chess.KNIGHT: "Caballo", chess.BISHOP: "Alfil", 
                             chess.ROOK: "Torre", chess.QUEEN: "Dama", chess.KING: "Rey"}
                    name = names.get(piece.piece_type, "Pieza")
                    row.append(f"{name} {color}")
                else:
                    row.append(".")
            rows.append(f"Fila {rank+1}: " + " | ".join(row))
        board_desc = "\n".join(rows)
        return {
            "legal_moves": ", ".join(legal_moves),
            "board_description": board_desc
        }
    except Exception as e:
        print(f"DEBUG: tactical context error: {e}")
        return None

async def test_chat():
    fen = "r1bqkbnr/ppp2ppp/2n5/4n3/3q1P2/P1P5/P3P1PP/RNBQK1NR w KQkq - 0 6"
    td = get_tactical_context(fen)
    print(f"DEBUG: TD generated: {td is not None}")
    
    user_is_white = True # user is white
    master_color = "NEGRAS"
    opp_color = "BLANCAS"
    turn_str = "BLANCAS"
    
    reality_anchor = (
        f"\n\n--- ANCLA DE REALIDAD (CONTEXTO INMEDIATO) ---\n"
        f"TU LADO: {master_color} | LADO DEL USUARIO: {opp_color}\n"
        f"TURNO DE: {turn_str}\n"
        f"TABLERO ACTUAL:\n{td['board_description']}\n"
        f"TUS MOVIMIENTOS LEGALES: {td['legal_moves']}\n"
        f"INSTRUCCIÓN: Comenta como FISCHER. Si el usuario te pregunta por 'mi jugada' o 'mi posición', "
        f"recuerda que TÚ eres las {master_color}. No te confundas de bando."
    )
    
    message = "describe la partida como esta ahora mismo"
    user_msg_final = f"Mensaje del usuario: {message}\nPosición FEN: {fen}{reality_anchor}"
    
    print("DEBUG: Final Prompt length:", len(user_msg_final))
    print("DEBUG: reality_anchor looks okay.")
    
    # Check if Gemini API key exists
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.getcwd(), '..', '.env'))
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: No API KEY found")
        return

    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key={api_key}"
    contents = [
        {"role": "user", "parts": [{"text": "ERES FISCHER. CONTEXTO: " + user_msg_final}]}
    ]
    
    async with httpx.AsyncClient() as client:
        print("DEBUG: Calling Gemini...")
        res = await client.post(api_url, json={"contents": contents}, timeout=30.0)
        print("DEBUG: Status Code:", res.status_code)
        if res.status_code == 200:
            data = res.json()
            if 'candidates' in data:
                print("DEBUG: Success!")
                print("Reply:", data['candidates'][0]['content']['parts'][0]['text'][:100])
            else:
                print("DEBUG: No candidates in response:", data)
        else:
            print("DEBUG: Error Response:", res.text)

if __name__ == "__main__":
    asyncio.run(test_chat())
