import os
import sys
import asyncio

# Windows fix for subprocess (required for Stockfish) - MUST be first
if sys.platform == "win32":
    try:
        from asyncio import WindowsProactorEventLoopPolicy
        asyncio.set_event_loop_policy(WindowsProactorEventLoopPolicy())
        print("INFO: WindowsProactorEventLoopPolicy set successfully at module top level.")
    except Exception as e:
        print(f"ERROR setting loop policy: {e}")

import logging
import datetime
import json
import re
import random
from collections import Counter, defaultdict
from typing import List, Optional, Dict, Any, Literal, Tuple
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from pydantic import BaseModel
import httpx
import chess
import difflib
from dotenv import load_dotenv
from deploy_config import get_cors_allowed_origins, resolve_stockfish_path

# Load .env from parent directory
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, Request, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import (
    SessionLocal,
    engine,
    Base,
    DBUser,
    Game,
    MasterGame,
    CoachMessage,
    CoachRelationship,
    CoachMemoryProfile,
    CoachReferenceLog,
    WikiEntityCache,
    KnowledgeSource,
    KnowledgeUnit,
)
from wikimedia import get_or_fetch_wiki_profile

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Verify Stockfish Path
STOCKFISH_PATH = resolve_stockfish_path()

# Supabase Configuration
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "https://arkckzzogbzvtflwdjoy.supabase.co")
SUPABASE_ANON_KEY = os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key={GEMINI_API_KEY}"
gemini_available = GEMINI_API_KEY is not None

security = HTTPBearer()

def resolve_app_timezone() -> datetime.tzinfo:
    timezone_key = os.getenv("APP_TIMEZONE", "Europe/Madrid")
    try:
        return ZoneInfo(timezone_key)
    except ZoneInfoNotFoundError:
        logger.warning(
            "ZoneInfo '%s' no disponible; usando la zona local del sistema para referencias humanas.",
            timezone_key,
        )
        return datetime.datetime.now().astimezone().tzinfo or datetime.timezone.utc

APP_TIMEZONE = resolve_app_timezone()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verifies the Supabase JWT token and returns the user ID."""
    token = credentials.credentials
    logger.info(f"DEBUG: Authenticating token {token[:10]}...")
    
    if not SUPABASE_ANON_KEY:
        logger.error("SUPABASE_ANON_KEY (VITE_SUPABASE_PUBLISHABLE_KEY) is not set in environment.")
        raise HTTPException(status_code=500, detail="Backend configuration error (API Key missing)")

    async with httpx.AsyncClient() as client:
        try:
            # Verify token by calling Supabase Auth API
            headers = {"Authorization": f"Bearer {token}", "apikey": SUPABASE_ANON_KEY}
            response = await client.get(f"{SUPABASE_URL}/auth/v1/user", headers=headers)
            
            if response.status_code != 200:
                logger.warning(f"Authentication failed: {response.status_code} - {response.text}")
                raise HTTPException(status_code=401, detail="Invalid or expired token")
            
            user_data = response.json()
            return user_data["id"]
        except Exception as e:
            if isinstance(e, HTTPException): raise e
            logger.error(f"Unexpected authentication error: {str(e)}")
            raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")

VALID_INTERACTION_MODES = {"coach_room", "pre_game", "in_game", "post_game", "legacy"}
VALID_MESSAGE_KINDS = {"user", "auto_commentary"}
OPENING_PHASE_MAX_PLY = 24
GENERIC_SMALL_TALK = {
    "hola", "buenas", "hello", "hi", "que tal", "como estas", "saludos",
    "buenos dias", "buenas tardes", "buenas noches", "hey",
}
STOPWORDS = {
    "hola", "como", "estas", "estar", "para", "sobre", "desde", "hasta", "entre",
    "quiero", "puedo", "puedes", "tengo", "tiene", "usted", "ustedes", "ellos",
    "ellas", "nosotros", "vosotros", "esta", "este", "estos", "estas", "porque",
    "donde", "cuando", "sobre", "contra", "mismo", "misma", "partida", "juego",
    "jugada", "tablero", "ajedrez", "coach", "maestro", "usuario",
}

# ─── Coaching Personalities ───
COACH_PERSONALITIES = {
    "general": """Eres un Gran Maestro de ajedrez de élite y un coach pedagógico de clase mundial. 
Responde siempre en español de forma elegante, profesional y motivadora.""",
    
    "fischer": """Eres Bobby Fischer. Tu estilo es agresivo, dogmático y directo. No tienes paciencia con el juego mediocre. 
Responde siempre en español basándote en tu historial real.""",
    
    "tal": """Eres Mikhail Tal, el 'Mago de Riga'. Ves el ajedrez como un arte de sacrificio. Buscas complicaciones donde 2+2=5. 
Responde siempre en español.""",
    
    "capablanca": """Eres José Raúl Capablanca. Para ti, el ajedrez es lógica pura y técnica impecable. Desprecias las complicaciones innecesarias. 
Responde siempre en español.""",
    
    "kasparov": """Eres Garry Kasparov. Tu estilo es pura energía, dinamismo y profundidad de cálculo. 
Responde siempre en español.""",
    
    "carlsen": """Eres Magnus Carlsen. Eres el ajedrecista más completo de la historia. Tu estilo es pragmático y psicológicamente demoledor. 
Responde siempre en español."""
}

MASTER_BIO_DATA = {
    "fischer": {
        "biography": "Bobby Fischer fue el 11º Campeón Mundial y el hombre que rompió la hegemonía soviética en el 'Match del Siglo' (1972). Su juego se basaba en una claridad meridiana y un espíritu de lucha indomable.",
        "curiosities": ["Aprendió a los 6 años.", "Exigía silencio total.", "Match del Siglo contra Spassky."],
        "stats_history": "Elo máximo: 2785. Récord de victorias consecutivas: 20.",
        "books": ["My 60 Memorable Games", "Bobby Fischer Teaches Chess", "Bobby Fischer’s Games of Chess", "Checkmate: Bobby Fischer's Boys' Life Columns"]
    },
    "tal": {
        "biography": "Mikhail Tal, el Mago de Riga, fue el 8º Campeón Mundial. Revolucionó el ajedrez con su estilo de sacrificio intuitivo y su capacidad para crear caos en el tablero.",
        "curiosities": ["Sacrificios intuitivos.", "Salud precaria.", "Match 1960."],
        "stats_history": "95 partidas invicto en un periodo de su carrera.",
        "books": ["The Life and Games of Mikhail Tal", "Mikhail Tal's Best Games", "Tal-Botvinnik 1960"]
    },
    "capablanca": {
        "biography": "José Raúl Capablanca fue el 3º Campeón Mundial, conocido como 'La Máquina Humana'. Su técnica de finales y su juego posicional impecable son leyenda.",
        "curiosities": ["Genio natural.", "8 años invicto.", "Finales perfectos."],
        "stats_history": "Solo perdió 36 partidas oficiales en su vida.",
        "books": ["Chess Fundamentals", "A Primer of Chess", "My Chess Career"]
    },
    "kasparov": {
        "biography": "Garry Kasparov, el 13º Campeón Mundial y dominante del ajedrez durante 20 años. Su estilo combinaba dinamismo agresivo con una preparación teórica sin precedentes.",
        "curiosities": ["Duelo contra Deep Blue.", "20 años número 1.", "Dinamismo extremo."],
        "stats_history": "Elo máximo: 2851. Mantuvo el #1 durante 255 meses.",
        "books": ["My Great Predecessors", "Modern Chess", "How Life Imitates Chess", "Revolution in the 70s"]
    },
    "carlsen": {
        "biography": "Magnus Carlsen es el 16º Campeón Mundial y el jugador con el Elo más alto de la historia. Su estilo es el pragmatismo absoluto y la presión psicológica constante.",
        "curiosities": ["Récord de Elo.", "Genio del pragmatismo.", "Campeón en todo."],
        "stats_history": "Elo máximo: 2882. Récord de 125 partidas invicto.",
        "books": ["Endgame Virtuoso Magnus Carlsen", "Attack with Magnus Carlsen", "Magnus Carlsen: 60 Memorable Games", "Wonderboy: Magnus Carlsen"]
    }
}

MASTER_CRITERIA = {
    "fischer": "Busco precisión absoluta y lucha hasta el final. No tolero la pereza mental. Valoro la tenacidad en posiciones claras.",
    "tal": "Valoro la creatividad y el coraje por encima de la evaluación del motor. Prefiero un sacrificio brillante que complique el alma del oponente.",
    "capablanca": "Evalúo la armonía y la técnica cristalina. Desprecio las complicaciones que no tienen base lógica. Busco el camino más simple hacia la victoria.",
    "kasparov": "Busco iniciativa, dinamismo y energía. El ajedrez es una guerra psicológica de voluntad y cálculo profundo.",
    "carlsen": "Valoro el pragmatismo y la solidez. Seré objetivo, técnico y buscaré exprimir hasta la mínima ventaja con precisión quirúrgica."
}

# ─── Tactical Helpers ───
def get_tactical_context(fen: str):
    try:
        board = chess.Board(fen)
        legal_moves = [board.san(move) for move in board.legal_moves]
        
        # Board visualization (readable for LLM)
        rows = []
        for rank in range(7, -1, -1):
            row = []
            for file in range(8):
                piece = board.piece_at(chess.square(file, rank))
                if piece:
                    # e.g., "Caballo Blanco" for White Knight
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
            "board_description": board_desc,
            "can_castle_kingside": "Sí" if board.has_kingside_castling_rights(board.turn) else "No",
            "can_castle_queenside": "Sí" if board.has_queenside_castling_rights(board.turn) else "No",
            "is_check": "Sí" if board.is_check() else "No"
        }
    except Exception as e:
        logger.error(f"Error generating tactical context: {e}")
        return None

# ─── Data Models ───
class PlayMoveRequest(BaseModel):
    fen: str
    persona: str
    time_control: Optional[int] = 10

class ChatRequest(BaseModel):
    persona: str = "general"
    message: str
    interaction_mode: Literal["coach_room", "pre_game", "in_game", "post_game", "legacy"] = "coach_room"
    message_kind: Literal["user", "auto_commentary"] = "user"
    session_token: Optional[str] = None
    game_id: Optional[int] = None
    fen: Optional[str] = None
    move_count: Optional[int] = None
    turn: Optional[str] = "w"
    user_color: Optional[str] = "white"
    pgn: Optional[str] = None
    silent: bool = False

class EvaluationRequest(BaseModel):
    user_id: str
    opponent_id: str
    pgn: str
    result: str
    time_control: int
    session_token: Optional[str] = None

class HistoryRequest(BaseModel):
    user_id: str
    coach_id: str

# ─── Database Utilities ───
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ─── FastAPI App ───
app = FastAPI(title="IA Coach Pro Engine", version="2.6.5")

# Improved CORS for development - required for Authorization headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

# Mount reports directory for PDF downloads
REPORTS_DIR = os.path.join(os.getcwd(), "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)
app.mount("/reports", StaticFiles(directory=REPORTS_DIR), name="reports")

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "gemini": gemini_available}

@app.get("/api/master/{coach_id}")
async def get_master_profile(coach_id: str, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    from database import MasterGame
    names = {"fischer": "Bobby Fischer", "tal": "Mikhail Tal", "capablanca": "José Raúl Capablanca", "kasparov": "Garry Kasparov", "carlsen": "Magnus Carlsen"}
    
    games = db.query(Game).filter(Game.user_id == user_id, Game.opponent_persona == coach_id).all()
    wins = sum(1 for g in games if g.result == "1-0")
    losses = sum(1 for g in games if g.result == "0-1")
    draws = sum(1 for g in games if g.result == "1/2-1/2")
    
    # Calculate historical games from MasterGame table
    master_name_map = {
        "fischer": "Fischer", "tal": "Tal", "capablanca": "Capablanca", 
        "kasparov": "Kasparov", "carlsen": "Carlsen"
    }
    search_name = master_name_map.get(coach_id, "")
    historical_count = 0
    if search_name:
        historical_count = db.query(MasterGame).filter(
            (MasterGame.white.contains(search_name)) | (MasterGame.black.contains(search_name))
        ).count()

    # Enrichment with Wikidata/Wikipedia (no API key required).
    wiki_profile = await get_or_fetch_wiki_profile(db, coach_id, lang="es")
    bio_info = MASTER_BIO_DATA.get(coach_id, {}).copy()
    if wiki_profile and wiki_profile.get("wikipedia_summary"):
        bio_info["biography"] = wiki_profile["wikipedia_summary"]
    if wiki_profile:
        bio_info["wikimedia"] = wiki_profile
    return {
        "id": coach_id, 
        "name": names.get(coach_id, "GM"), 
        **bio_info,
        "games_played": len(games), 
        "user_wins": wins, 
        "user_losses": losses, 
        "user_draws": draws,
        "historical_games_count": historical_count
    }

@app.get("/api/master/{coach_id}/analytics")
async def get_master_analytics(coach_id: str, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    master_name_map = {
        "fischer": "Fischer", "tal": "Tal", "capablanca": "Capablanca", 
        "kasparov": "Kasparov", "carlsen": "Carlsen"
    }
    search_name = master_name_map.get(coach_id, "")
    if not search_name:
        raise HTTPException(status_code=404, detail="Master not found")

    all_games = db.query(MasterGame).filter(
        (MasterGame.white.contains(search_name)) | (MasterGame.black.contains(search_name))
    ).all()

    wins: int = 0
    losses: int = 0
    draws: int = 0
    
    current_streak = 0
    max_streak = 0
    
    openings = {}
    
    for g in all_games:
        # Determine result relative to the master
        is_white = search_name in g.white
        res = g.result
        
        master_won = (is_white and res == "1-0") or (not is_white and res == "0-1")
        master_lost = (is_white and res == "0-1") or (not is_white and res == "1-0")
        is_draw = res == "1/2-1/2"
        
        if master_won:
            wins += 1
            current_streak += 1
            if current_streak > max_streak:
                max_streak = current_streak
        elif master_lost:
            losses += 1
            current_streak = 0
        else:
            draws += 1
            current_streak = 0
            
        # Stats by opening
        op = g.opening if g.opening else "Unknown"
        openings[op] = openings.get(op, 0) + 1

    # Sort openings - break into steps for linting
    op_items = list(openings.items())
    op_items.sort(key=lambda x: x[1], reverse=True)
    top_5_ops = op_items[:5]
    top_openings_list = [{"name": name, "count": count} for name, count in top_5_ops]

    # Calculate win rate safely
    win_rate = 0.0
    if len(all_games) > 0:
        win_rate = round(float(wins) / len(all_games) * 100, 1)

    return {
        "master": coach_id,
        "total_games": len(all_games),
        "distribution": [
            {"name": "Victorias", "value": wins},
            {"name": "Derrotas", "value": losses},
            {"name": "Tablas", "value": draws}
        ],
        "win_rate": win_rate,
        "max_win_streak": max_streak,
        "top_openings": top_openings_list,
        "milestones": [
            f"Historial total de {len(all_games)} partidas procesadas.",
            f"Racha histórica de {max_streak} victorias consecutivas.",
            f"Apertura preferida: {top_openings_list[0]['name'] if top_openings_list else 'N/A'}"
        ]
    }

@app.post("/api/chat/history")
async def get_chat_history(request: HistoryRequest, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify that requested user_id matches authenticated user_id
    if request.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized access to history")
    messages = db.query(CoachMessage).filter(
        CoachMessage.user_id == request.user_id,
        CoachMessage.coach_id == request.coach_id
    ).order_by(CoachMessage.timestamp.asc()).all()
    
    return {"history": [{"role": m.role, "content": m.content} for m in messages]}

@app.post("/api/play/move")
async def play_move(request: PlayMoveRequest, user_id: str = Depends(get_current_user)):
    logger.info(f"DEBUG: play_move requested by {user_id} for persona {request.persona}")
    import analyzer
    try:
        res = await asyncio.to_thread(analyzer.get_persona_move_sync, request.fen, request.persona)
        logger.info(f"DEBUG: play_move result: {res}")
        return res
    except Exception as e:
        logger.error(f"DEBUG: play_move error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/game/evaluate")
async def evaluate_game(request: EvaluationRequest, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    # Force use of authenticated user_id
    if request.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized game submission")
    past_games = db.query(Game).filter(Game.user_id == request.user_id, Game.opponent_persona == request.opponent_id).order_by(Game.played_at.desc()).limit(5).all()
    history_context = "\n".join([f"- Partida {g.played_at}: Result {g.result}, Rating {g.master_rating}/10" for g in past_games])
    
    criteria = MASTER_CRITERIA.get(request.opponent_id, "Juego balanceado.")
    master_info = MASTER_BIO_DATA.get(request.opponent_id, {})
    bio = master_info.get("biography", "")
    books = ", ".join(master_info.get("books", []))
    pgn_headers = parse_pgn_headers(request.pgn)
    opening = pgn_headers.get("Opening")
    eco = pgn_headers.get("ECO")
    opening_family = derive_opening_family(opening, eco)
    
    eval_prompt = (
        f"Eres el maestro de ajedrez {request.opponent_id}. "
        f"Tu biografía: {bio}. Tus libros clave: {books}. "
        f"ESTA PARTIDA FUE CONTRA TI. TÚ eras el bando contrario al usuario. "
        f"Evalúa la partida PGN: {request.pgn}. "
        f"Resultado final: {request.result}. Tiempo de juego: {request.time_control} min. "
        f"Usa tus CRITERIOS PERSONALES: {criteria}. "
        f"Historial de duelos previos:\n{history_context}\n"
        f"REGLA CRÍTICA: Habla en PRIMERA PERSONA ('Yo cometí este error', 'Tú jugaste bien aquí'). No hables de 'ambos jugadores' como un tercero. Si el usuario perdió contra ti, dile por qué lo derrotaste usando tus teorías."
        f"PROPORCIONA UN REPORTE NEURO-CIENTÍFICO EN FORMATO JSON: "
        f"{{'rating': 1-10, 'review': 'texto corto con tu estilo personal y consejos de tus libros', "
        f"'neuro_metrics': {{'pressure': 'HIGH/MEDIUM/LOW', 'fatigue': 'HIGH/NOMINAL'}}}}"
    )
    
    async with httpx.AsyncClient() as client:
        try:
            # Reconstruct URL to ensure it uses the latest API key from env
            current_api_key = os.getenv("GEMINI_API_KEY")
            if not current_api_key:
                return {"rating": 5, "review": "Error: GEMINI_API_KEY no configurada."}
                
            api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key={current_api_key}"
            
            res = await client.post(api_url, json={"contents": [{"role": "user", "parts": [{"text": eval_prompt}]}]}, timeout=30.0)
            raw_reply = res.json()['candidates'][0]['content']['parts'][0]['text']
            match = re.search(r'\{.*\}', raw_reply, re.DOTALL)
            eval_data = json.loads(match.group()) if match else {"rating": 5, "review": raw_reply}
            
            new_game = Game(
                user_id=request.user_id, opponent_persona=request.opponent_id, pgn_string=request.pgn, result=request.result,
                played_at=datetime.datetime.utcnow(), master_rating=eval_data.get("rating", 5), master_review=eval_data.get("review", ""),
                neuro_metrics=json.dumps(eval_data.get("neuro_metrics", {})), time_control=request.time_control, user_played_as="white",
                session_token=request.session_token, opening=opening, eco=eco, opening_family=opening_family
            )
            db.add(new_game)
            db.commit()
            db.refresh(new_game)
            
            # LINK CHAT MESSAGES TO THIS GAME
            session_token = request.session_token
            if session_token:
                db.query(CoachMessage).filter(CoachMessage.session_token == session_token).update({"game_id": new_game.id})
                db.commit()
            
            user = db.query(DBUser).filter(DBUser.id == request.user_id).first()
            xp_gain = 0
            if user:
                xp_gain = int(eval_data.get("rating", 5)) * 20
                if request.result == "1-0": xp_gain += 100
                elif request.result == "1/2-1/2": xp_gain += 50
                user.xp += xp_gain; user.level = (user.xp // 1000) + 1
                db.commit()

            refresh_memory_profile_task(request.user_id, request.opponent_id)
            refresh_memory_profile_task(request.user_id, "general")
            
            return {**eval_data, "xp_earned": xp_gain, "new_level": user.level if user else 1}
        except Exception as e:
            return {"rating": 5, "review": f"Error: {e}", "xp_earned": 0}

@app.post("/api/game/log")
async def log_game(request: EvaluationRequest, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Logs a game (usually PvP) without mandatory AI evaluation for history/memory."""
    if request.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    new_game = Game(
        user_id=request.user_id,
        opponent_persona="PvP",
        pgn_string=request.pgn,
        result=request.result,
        played_at=datetime.datetime.utcnow(),
        time_control=request.time_control,
        user_played_as="white", # Default for now
        session_token=request.session_token,
        opening=parse_pgn_headers(request.pgn).get("Opening"),
        eco=parse_pgn_headers(request.pgn).get("ECO"),
        opening_family=derive_opening_family(parse_pgn_headers(request.pgn).get("Opening"), parse_pgn_headers(request.pgn).get("ECO"))
    )
    db.add(new_game)
    db.commit()
    db.refresh(new_game)

    # LINK CHAT MESSAGES
    session_token = request.session_token
    if session_token:
        db.query(CoachMessage).filter(CoachMessage.session_token == session_token).update({"game_id": new_game.id})
        db.commit()

    refresh_memory_profile_task(request.user_id, "general")
        
    return {"status": "Game logged successfully"}

@app.get("/api/user/progress")
async def get_user_progress(authenticated_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = authenticated_user_id
    logger.info(f"Fetching progress for user: {user_id}")
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user: return {"level": 1, "xp": 0, "next_level_xp": 1000, "achievement_points": 0}
    
    # Calculate some stats for the rank logic
    # (In a real system this would be more complex and cached)
    
    return {
        "level": user.level, 
        "xp": user.xp, 
        "next_level_xp": user.level * 1000, 
        "unlocked_assets": json.loads(user.unlocked_assets or "[]"),
        "achievement_points": user.achievement_points or 0,
        "streak": user.streak_count or 0,
        "achievements": json.loads(user.achievements_unlocked or "[]"),
        "missions": {
            "daily": json.loads(user.missions_daily or "[]"),
            "weekly": json.loads(user.missions_weekly or "[]")
        },
        "masteries": json.loads(user.masteries_json or "{}")
    }

@app.get("/api/gamification/summary")
async def get_gamification_summary(authenticated_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = authenticated_user_id
    logger.info(f"Fetching gamification summary for user: {user_id}")
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user: return {"level": 1, "xp": 0, "rank": "Principiante"}
    
    # Simplified rank logic based on the docs
    rank_names = [
        "Principiante", "Aprendiz", "Alumno", "Iniciado", "Jugador de Club",
        "Competidor", "Táctico", "Estratega", "Especialista", "Experto",
        "Veterano", "Analista", "Maestro de Club", "Candidato", "Maestro",
        "Maestro Élite", "Gran Maestro", "Gran Maestro Supremo", "Leyenda del Tablero", "Inmortal del Ajedrez"
    ]
    rank_idx = min(len(rank_names) - 1, (user.level - 1) // 2) if user.level <= 30 else 15 + min(4, (user.level - 31) // 5)
    
    return {
        "level": user.level,
        "xp": user.xp,
        "xp_to_next": user.level * 1000 - user.xp,
        "rank": rank_names[int(rank_idx)],
        "achievement_points": user.achievement_points,
        "streak": user.streak_count
    }

COACH_DISPLAY_NAMES = {
    "general": "Coach AI",
    "fischer": "Bobby Fischer",
    "tal": "Mikhail Tal",
    "capablanca": "José Raúl Capablanca",
    "kasparov": "Garry Kasparov",
    "carlsen": "Magnus Carlsen",
}

def get_coach_display_name(coach_id: Optional[str]) -> str:
    return COACH_DISPLAY_NAMES.get(normalize_persona(coach_id), "Coach AI")

def iso_datetime(value: Optional[datetime.datetime]) -> Optional[str]:
    return value.isoformat() if value else None

def build_history_session_summary(session_key: str, game_row: Optional[Game], messages: List[CoachMessage]) -> Dict[str, Any]:
    ordered_messages = sorted(messages, key=lambda row: row.timestamp or datetime.datetime.min)
    first_message = ordered_messages[0] if ordered_messages else None
    last_message = ordered_messages[-1] if ordered_messages else None
    coach_id = normalize_persona(
        game_row.opponent_persona if game_row and game_row.opponent_persona else (first_message.coach_id if first_message else "general")
    )
    anchor_time = (
        (game_row.played_at if game_row else None)
        or (last_message.timestamp if last_message else None)
        or (first_message.timestamp if first_message else None)
        or datetime.datetime.utcnow()
    )
    interaction_modes = sorted({
        normalize_interaction_mode(row.interaction_mode)
        for row in ordered_messages
        if row.interaction_mode
    })
    preview = ""
    for candidate in reversed(ordered_messages):
        if candidate.content:
            preview = candidate.content[:180]
            break

    entry_kind = "game" if game_row else "conversation"
    title = (
        f"Partida #{game_row.id} vs {get_coach_display_name(coach_id)}"
        if game_row
        else f"Consulta con {get_coach_display_name(coach_id)}"
    )

    return {
        "session_key": session_key,
        "session_token": game_row.session_token if game_row and game_row.session_token else (first_message.session_token if first_message else None),
        "kind": entry_kind,
        "title": title,
        "coach_id": coach_id,
        "coach_name": get_coach_display_name(coach_id),
        "game_id": game_row.id if game_row else None,
        "date": anchor_time.strftime("%Y-%m-%d"),
        "played_at": iso_datetime(anchor_time),
        "result": game_row.result if game_row else None,
        "opening": game_row.opening if game_row else None,
        "opening_family": game_row.opening_family if game_row else None,
        "time_control": game_row.time_control if game_row else None,
        "messages_count": len(ordered_messages),
        "interaction_modes": interaction_modes,
        "preview": preview,
        "has_messages": bool(ordered_messages),
        "sort_timestamp": anchor_time.timestamp(),
    }

@app.get("/api/history")
async def get_full_history(authenticated_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = authenticated_user_id
    logger.info(f"Fetching game history for user: {user_id}")
    games = db.query(Game).filter(Game.user_id == user_id).order_by(Game.played_at.desc()).all()
    return {"games": [
        {
            "id": g.id,
            "date": g.played_at.strftime("%Y-%m-%d") if g.played_at else "N/A",
            "played_at": iso_datetime(g.played_at),
            "opponent": g.opponent_persona,
            "result": g.result,
            "rating": g.master_rating,
            "opening": g.opening,
            "session_token": g.session_token,
            "pgn": g.pgn_string,
        }
        for g in games
    ]}

@app.get("/api/history/sessions")
async def get_history_sessions(authenticated_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = authenticated_user_id
    logger.info(f"Fetching session history for user: {user_id}")

    games = db.query(Game).filter(Game.user_id == user_id).order_by(Game.played_at.desc()).all()
    messages = db.query(CoachMessage).filter(
        CoachMessage.user_id == user_id,
        CoachMessage.session_token.isnot(None),
    ).order_by(CoachMessage.timestamp.asc()).all()

    grouped_messages: Dict[str, List[CoachMessage]] = defaultdict(list)
    for row in messages:
        if row.session_token:
            grouped_messages[row.session_token].append(row)

    games_by_session: Dict[str, Game] = {}
    standalone_games: List[Tuple[str, Game]] = []
    for game_row in games:
        if game_row.session_token:
            games_by_session[game_row.session_token] = game_row
        else:
            standalone_games.append((f"legacy-game-{game_row.id}", game_row))

    session_keys = set(grouped_messages.keys()) | set(games_by_session.keys())
    sessions: List[Dict[str, Any]] = []

    for session_key in session_keys:
        sessions.append(
            build_history_session_summary(
                session_key,
                games_by_session.get(session_key),
                grouped_messages.get(session_key, []),
            )
        )

    for legacy_key, legacy_game in standalone_games:
        legacy_messages = db.query(CoachMessage).filter(
            CoachMessage.user_id == user_id,
            CoachMessage.game_id == legacy_game.id,
        ).order_by(CoachMessage.timestamp.asc()).all()
        sessions.append(build_history_session_summary(legacy_key, legacy_game, legacy_messages))

    sessions.sort(key=lambda row: row["sort_timestamp"], reverse=True)
    for row in sessions:
        row.pop("sort_timestamp", None)

    return {"sessions": sessions}

@app.get("/api/history/sessions/{session_key}")
async def get_history_session_detail(session_key: str, authenticated_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = authenticated_user_id
    logger.info(f"Fetching session detail {session_key} for user: {user_id}")

    game_row: Optional[Game] = None
    messages: List[CoachMessage] = []

    if session_key.startswith("legacy-game-"):
        game_id = int(session_key.replace("legacy-game-", "", 1))
        game_row = db.query(Game).filter(Game.user_id == user_id, Game.id == game_id).first()
        if not game_row:
            raise HTTPException(status_code=404, detail="History entry not found")
        messages = db.query(CoachMessage).filter(
            CoachMessage.user_id == user_id,
            CoachMessage.game_id == game_id,
        ).order_by(CoachMessage.timestamp.asc()).all()
    else:
        messages = db.query(CoachMessage).filter(
            CoachMessage.user_id == user_id,
            CoachMessage.session_token == session_key,
        ).order_by(CoachMessage.timestamp.asc()).all()
        game_row = db.query(Game).filter(
            Game.user_id == user_id,
            Game.session_token == session_key,
        ).order_by(Game.played_at.desc()).first()
        if not messages and not game_row:
            raise HTTPException(status_code=404, detail="History entry not found")

    summary = build_history_session_summary(session_key, game_row, messages)
    summary["pgn"] = game_row.pgn_string if game_row else None
    summary["messages"] = [
        {
            "id": row.id,
            "role": "coach" if row.role == "model" else row.role,
            "text": row.content,
            "interaction_mode": row.interaction_mode,
            "timestamp": iso_datetime(row.timestamp),
            "move_count": row.move_count,
        }
        for row in messages
    ]
    return summary

# ─── AI Coach Endpoints ───

@app.get("/api/insights")
async def get_insights_for_user(authenticated_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = authenticated_user_id
    logger.info(f"Fetching insights for user: {user_id}")
    games = db.query(Game).filter(Game.user_id == user_id).all()
    if not games:
        return {"overview": {"avg_acpl": 0, "estimated_title": "Principiante", "verdict": "Aún no hay partidas analizadas."}, "openings": [], "tactics": {}, "endgame": {}}

    import analyzer
    # Compile all PGNs for batch analysis
    full_pgn = "\n\n".join([g.pgn_string for g in games if g.pgn_string])
    results = analyzer.analyze_games_batch(full_pgn, max_games=10)
    
    # Mock some psychological/tactical data based on results if real analysis is not enough
    tactics = {
        "center_pressure": "Estable" if results["aggregate"].get("avg_acpl", 100) < 50 else "Inconsistente",
        "discovered_attacks": "Bien detectados",
        "missed_double_attacks": results["aggregate"].get("total_tactical_misses", 0)
    }
    
    endgame = {
        "precision": 75 if results["aggregate"].get("avg_acpl", 100) < 40 else 50,
        "weakness": "Coordinación de piezas",
        "recommended_lesson": "Finales de Torres Básicos"
    }

    return {
        "overview": {
            "avg_acpl": results["aggregate"].get("avg_acpl", 0),
            "estimated_title": results["aggregate"].get("estimated_title", "Principiante"),
            "verdict": "Tu juego muestra un progreso sólido."
        },
        "openings": results["aggregate"].get("openings", []),
        "tactics": tactics,
        "endgame": endgame,
        "books_ingested": 20
    }

@app.post("/api/upload-pgn/{user_id}")
async def upload_pgn(user_id: str, file: UploadFile = File(...), authenticated_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    content = await file.read()
    pgn_text = content.decode("utf-8")
    
    from database import PGNImport
    import chess.pgn
    import io
    
    pgn_io = io.StringIO(pgn_text)
    games_added = 0
    
    # Create import record
    new_import = PGNImport(user_id=user_id, source="upload")
    db.add(new_import)
    db.commit()
    db.refresh(new_import)

    while True:
        game = chess.pgn.read_game(pgn_io)
        if not game: break
        
        db_game = Game(
            user_id=user_id,
            import_id=new_import.id,
            pgn_string=str(game),
            result=game.headers.get("Result", "*"),
            white_player=game.headers.get("White", "Unknown"),
            black_player=game.headers.get("Black", "Unknown"),
            date_played=game.headers.get("Date", "N/A"),
            opening=game.headers.get("Opening", "N/A"),
            eco=game.headers.get("ECO", "N/A")
        )
        db.add(db_game)
        games_added += 1
    
    new_import.game_count = games_added
    db.commit()
    
    return {"status": "success", "games_count": games_added}

@app.post("/api/analyze/{user_id}")
async def trigger_analysis(user_id: str, authenticated_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    games = db.query(Game).filter(Game.user_id == user_id, Game.acpl == None).limit(5).all()
    import analyzer
    for g in games:
        if g.pgn_string:
            import io
            import chess.pgn
            pgn_io = io.StringIO(g.pgn_string)
            chess_game = chess.pgn.read_game(pgn_io)
            if chess_game:
                analysis = analyzer.analyze_game(chess_game, depth=10)
                g.acpl = analysis.get("acpl_white") # Assuming user is white for now
                g.accuracy = 100 - (g.acpl / 2) if g.acpl else 0
                g.analysis_json = json.dumps(analysis)
    db.commit()
    return {"status": "Analysis complete for latest games"}

@app.get("/api/report/{user_id}")
async def get_report(user_id: str, authenticated_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    import insights_fetcher # Internal helper or use get_insights_for_user logic
    # Simplified: reuse insights logic
    insights_data = await get_insights_for_user(authenticated_user_id=authenticated_user_id, db=db)
    
    from pdf_report import generate_coach_report
    games_count = db.query(Game).filter(Game.user_id == user_id).count()
    filepath = generate_coach_report(user_id, insights_data, games_count)
    
    return FileResponse(filepath, filename=f"reporte_ajedrez_{user_id[:8]}.pdf")

# Default prompt if persona not found
DEFAULT_COACH_PROMPT = "Eres un instructor de ajedrez experto. Responde siempre en español."

def find_master_wisdom(fen: str, persona_id: str, db: Session):
    """Find if the current persona played this exact position in a historical game."""
    from database import MasterGame
    import json
    # Search for games where the persona was one of the players and the FEN is in the fen_list
    # In a real heavy-load system, this would use a FEN-indexed specialized table
    master_name_map = {
        "fischer": "Fischer", "tal": "Tal", "capablanca": "Capablanca", 
        "kasparov": "Kasparov", "carlsen": "Carlsen"
    }
    search_name = master_name_map.get(persona_id, "")
    if not search_name: return None
    
    # Simple substring search in fen_list for demo/initial phase
    # Optimization: Only search first 20 characters of FEN (piece placement) for speed
    fen_base = fen.split(" ")[0]
    
    matches = db.query(MasterGame).filter(
        (MasterGame.white.contains(search_name)) | (MasterGame.black.contains(search_name)),
        MasterGame.fen_list.contains(fen_base)
    ).limit(25).all() # Fetch top 25 and pick random
    
    if matches:
        match = random.choice(matches)
        player_color = "Blancas" if search_name in match.white else "Negras"
        opponent = match.black if player_color == "Blancas" else match.white
        return {
            "event": match.event if match.event else "Match Histórico",
            "date": match.date if match.date else "N/A",
            "opponent": opponent,
            "result": match.result,
            "color": player_color,
            "opening": match.opening,
            "source": "local_db"
        }
    return None

async def get_lichess_wisdom(fen: str):
    """Fallback: Get master wisdom from Lichess Opening Explorer for common positions."""
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"https://explorer.lichess.ovh/masters?fen={fen}", timeout=2.0)
            if res.status_code == 200:
                data = res.json()
                top_games = data.get("topGames", [])
                if top_games:
                    game = random.choice(top_games[:10]) # Pick from top 10 for variety
                    return {
                        "event": "Torneo de Maestros",
                        "date": str(game.get("year", "N/A")),
                        "opponent": f"{game.get('white')} vs {game.get('black')}",
                        "result": game.get("winner", "D"),
                        "source": "lichess_explorer"
                    }
    except Exception:
        pass
    return None

def safe_json_loads(raw_value: Any, default: Any):
    if raw_value in (None, ""):
        return default
    if isinstance(raw_value, (dict, list)):
        return raw_value
    try:
        return json.loads(raw_value)
    except Exception:
        return default

def normalize_persona(persona: Optional[str]) -> str:
    return str(persona) if persona in COACH_PERSONALITIES else "general"

def normalize_interaction_mode(mode: Optional[str]) -> str:
    return str(mode) if mode in VALID_INTERACTION_MODES else "legacy"

def normalize_message_kind(kind: Optional[str]) -> str:
    return str(kind) if kind in VALID_MESSAGE_KINDS else "user"

def extract_text_tokens(text: str, max_tokens: int = 12) -> List[str]:
    tokens = re.findall(r"[0-9A-Za-zÀ-ÿ']+", (text or "").lower())
    unique_tokens: List[str] = []
    for token in tokens:
        if len(token) <= 2 or token in STOPWORDS:
            continue
        if token not in unique_tokens:
            unique_tokens.append(token)
        if len(unique_tokens) >= max_tokens:
            break
    return unique_tokens

def detect_small_talk_message(text: str) -> bool:
    normalized = " ".join(re.findall(r"[0-9A-Za-zÀ-ÿ']+", (text or "").lower())).strip()
    if not normalized:
        return True
    if normalized in GENERIC_SMALL_TALK:
        return True
    tokens = normalized.split()
    return len(tokens) <= 2 and normalized in GENERIC_SMALL_TALK

def derive_move_count(fen: Optional[str], explicit_move_count: Optional[int]) -> int:
    if explicit_move_count is not None:
        return max(0, int(explicit_move_count))
    if not fen:
        return 0
    try:
        board = chess.Board(fen)
        return max(0, ((board.fullmove_number - 1) * 2) + (0 if board.turn == chess.WHITE else 1))
    except Exception:
        return 0

def parse_pgn_headers(pgn_text: Optional[str]) -> Dict[str, str]:
    headers: Dict[str, str] = {}
    if not pgn_text:
        return headers
    for key, value in re.findall(r'\[(\w+)\s+"([^"]*)"\]', pgn_text):
        headers[key] = value
    return headers

def derive_opening_family(opening: Optional[str], eco: Optional[str]) -> Optional[str]:
    if eco:
        return eco[:1]
    if opening:
        return " ".join(opening.split()[:2])
    return None

def build_default_memory_profile(coach_id: str) -> Dict[str, Any]:
    return {
        "coach_id": coach_id,
        "relationship_summary": "",
        "strengths": [],
        "weaknesses": [],
        "recurrent_openings": [],
        "patterns": [],
        "conversation_style": "",
        "recent_topics": [],
        "advice_that_helped": [],
        "repeated_errors": [],
        "last_results": [],
        "updated_at": None,
    }

def get_or_create_memory_profile(db: Session, user_id: str, coach_id: str) -> Tuple[CoachMemoryProfile, Dict[str, Any]]:
    profile_row = db.query(CoachMemoryProfile).filter(
        CoachMemoryProfile.user_id == user_id,
        CoachMemoryProfile.coach_id == coach_id,
    ).first()
    if not profile_row:
        profile_row = CoachMemoryProfile(
            user_id=user_id,
            coach_id=coach_id,
            summary_json=json.dumps(build_default_memory_profile(coach_id)),
        )
        db.add(profile_row)
        db.commit()
        db.refresh(profile_row)
    profile_json = safe_json_loads(profile_row.summary_json, build_default_memory_profile(coach_id))
    return profile_row, profile_json

def build_request_context(request: ChatRequest) -> Dict[str, Any]:
    persona = normalize_persona(request.persona)
    interaction_mode = normalize_interaction_mode(request.interaction_mode)
    message_kind = normalize_message_kind(request.message_kind)
    message = (request.message or "").strip()
    fen = (request.fen or "").strip() or None
    board = None
    if fen:
        try:
            board = chess.Board(fen)
        except Exception:
            board = None
            fen = None
    move_count = derive_move_count(fen, request.move_count)
    board_is_initial = board is None or board.board_fen() == chess.Board().board_fen()
    has_live_position = board is not None and not board_is_initial and move_count > 0
    user_is_white = str(request.user_color or "white").lower() in {"white", "w", "blanco", "blancas"}
    headers = parse_pgn_headers(request.pgn)
    opening = headers.get("Opening")
    eco = headers.get("ECO")
    return {
        "persona": persona,
        "scope": "global" if persona == "general" else "individual",
        "message": message,
        "interaction_mode": interaction_mode,
        "message_kind": message_kind,
        "session_token": request.session_token,
        "game_id": request.game_id,
        "fen": fen,
        "board": board,
        "move_count": move_count,
        "pgn": request.pgn,
        "opening": opening,
        "eco": eco,
        "opening_family": derive_opening_family(opening, eco),
        "has_live_position": has_live_position,
        "board_is_initial": board_is_initial,
        "user_color_label": "blancas" if user_is_white else "negras",
        "master_color": "negras" if user_is_white else "blancas",
        "turn_label": "blancas" if str(request.turn or "w").lower() == "w" else "negras",
        "is_small_talk": detect_small_talk_message(message),
        "topic_tags": extract_text_tokens(message),
        "silent": request.silent,
    }

def build_scope_queries(db: Session, user_id: str, persona: str):
    message_query = db.query(CoachMessage).filter(CoachMessage.user_id == user_id)
    game_query = db.query(Game).filter(Game.user_id == user_id)
    if persona != "general":
        message_query = message_query.filter(CoachMessage.coach_id == persona)
        game_query = game_query.filter(Game.opponent_persona == persona)
    return message_query, game_query

def load_session_context(db: Session, user_id: str, ctx: Dict[str, Any]) -> List[CoachMessage]:
    message_query, _ = build_scope_queries(db, user_id, ctx["persona"])
    if ctx["session_token"]:
        message_query = message_query.filter(CoachMessage.session_token == ctx["session_token"])
    else:
        message_query = message_query.filter(CoachMessage.interaction_mode == ctx["interaction_mode"])
    return message_query.order_by(CoachMessage.timestamp.asc()).all()

def score_message_memory(message_row: CoachMessage, ctx: Dict[str, Any], token_set: set[str]) -> float:
    if ctx["session_token"] and message_row.session_token == ctx["session_token"]:
        return -999.0
    score = 0.0
    if message_row.interaction_mode == ctx["interaction_mode"]:
        score += 2.0
    if message_row.interaction_mode == "legacy":
        score -= 1.0
    if ctx["fen"] and message_row.fen_snapshot and message_row.fen_snapshot.split(" ")[0] == ctx["fen"].split(" ")[0]:
        score += 8.0
    message_tags = safe_json_loads(message_row.topic_tags_json, [])
    if not message_tags:
        message_tags = extract_text_tokens(message_row.content, max_tokens=8)
    overlap = token_set.intersection({tag.lower() for tag in message_tags})
    score += float(len(overlap)) * 2.5
    lower_content = (message_row.content or "").lower()
    for token in token_set:
        if token in lower_content:
            score += 0.75
    if message_row.timestamp:
        age_days = max(0, (datetime.datetime.utcnow() - message_row.timestamp).days)
        score += max(0.0, 2.5 - min(2.5, age_days / 45.0))
    if message_row.role == "model":
        score += 0.25
    return score

def score_game_memory(game_row: Game, ctx: Dict[str, Any], token_set: set[str]) -> float:
    score = 0.0
    if ctx["opening_family"] and game_row.opening_family == ctx["opening_family"]:
        score += 5.0
    if ctx["opening"] and game_row.opening and ctx["opening"].lower() == game_row.opening.lower():
        score += 3.0
    if ctx["eco"] and game_row.eco and ctx["eco"] == game_row.eco:
        score += 4.0
    searchable = " ".join([
        game_row.opening or "",
        game_row.eco or "",
        game_row.master_review or "",
        game_row.result or "",
    ]).lower()
    for token in token_set:
        if token in searchable:
            score += 0.75
    if game_row.played_at:
        age_days = max(0, (datetime.datetime.utcnow() - game_row.played_at).days)
        score += max(0.0, 2.0 - min(2.0, age_days / 90.0))
    if ctx["persona"] != "general" and game_row.opponent_persona == ctx["persona"]:
        score += 1.0
    return score

def retrieve_relevant_memories(db: Session, user_id: str, ctx: Dict[str, Any]) -> Dict[str, List[Any]]:
    if ctx["is_small_talk"] and not ctx["has_live_position"]:
        return {"messages": [], "games": []}
    message_query, game_query = build_scope_queries(db, user_id, ctx["persona"])
    all_messages = message_query.order_by(CoachMessage.timestamp.desc()).all()
    all_games = game_query.order_by(Game.played_at.desc()).all()
    token_set: set[str] = set(ctx["topic_tags"])
    scored_messages = []
    for row in all_messages:
        score = score_message_memory(row, ctx, token_set)
        if score > 1.5:
            scored_messages.append((score, row))
    scored_games = []
    for row in all_games:
        score = score_game_memory(row, ctx, token_set)
        if score > 1.0:
            scored_games.append((score, row))
    scored_messages.sort(key=lambda item: (item[0], item[1].timestamp or datetime.datetime.min), reverse=True)
    scored_games.sort(key=lambda item: (item[0], item[1].played_at or datetime.datetime.min), reverse=True)
    return {
        "messages": [row for _, row in scored_messages[:6]],
        "games": [row for _, row in scored_games[:4]],
    }

def format_memory_profile_block(profile_data: Dict[str, Any]) -> str:
    lines = []
    summary = (profile_data.get("relationship_summary") or "").strip()
    if summary:
        lines.append(f"- Resumen del vinculo: {summary}")
    if profile_data.get("strengths"):
        lines.append(f"- Fortalezas observadas: {', '.join(profile_data['strengths'][:4])}")
    if profile_data.get("weaknesses"):
        lines.append(f"- Debilidades observadas: {', '.join(profile_data['weaknesses'][:4])}")
    if profile_data.get("recurrent_openings"):
        lines.append(f"- Aperturas recurrentes: {', '.join(profile_data['recurrent_openings'][:4])}")
    if profile_data.get("patterns"):
        lines.append(f"- Patrones de juego: {', '.join(profile_data['patterns'][:4])}")
    if profile_data.get("recent_topics"):
        lines.append(f"- Temas recientes: {', '.join(profile_data['recent_topics'][:5])}")
    if profile_data.get("advice_that_helped"):
        lines.append(f"- Consejos utiles recordados: {', '.join(profile_data['advice_that_helped'][:3])}")
    if profile_data.get("repeated_errors"):
        lines.append(f"- Errores repetidos: {', '.join(profile_data['repeated_errors'][:3])}")
    return "\n".join(lines) if lines else "- Aun no hay memoria resumida suficiente."

def to_local_app_time(value: Optional[datetime.datetime]) -> Optional[datetime.datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=datetime.timezone.utc)
    return value.astimezone(APP_TIMEZONE)

def format_natural_past_time(value: Optional[datetime.datetime]) -> str:
    local_value = to_local_app_time(value)
    if local_value is None:
        return "sin fecha"
    now_local = datetime.datetime.now(APP_TIMEZONE)
    day_diff = (now_local.date() - local_value.date()).days
    if day_diff == 0:
        return f"hoy a las {local_value.strftime('%H:%M')}"
    if day_diff == 1:
        return "ayer"
    if day_diff > 1:
        return f"hace {day_diff} dias"
    return local_value.strftime("el %d/%m/%Y a las %H:%M")

def format_memory_message(message_row: CoachMessage) -> str:
    role_label = "Usuario" if message_row.role == "user" else "Maestro"
    stamp = format_natural_past_time(message_row.timestamp)
    return f"- Recuerdo conversacional ({stamp}, {message_row.interaction_mode}): {role_label}: {message_row.content}"

def format_memory_game(game_row: Game) -> str:
    stamp = format_natural_past_time(game_row.played_at)
    opening_bits = []
    if game_row.opening:
        opening_bits.append(game_row.opening)
    if game_row.eco:
        opening_bits.append(game_row.eco)
    opening_text = f" | Apertura: {' / '.join(opening_bits)}" if opening_bits else ""
    rating_text = f" | Valoracion: {game_row.master_rating}/10" if game_row.master_rating is not None else ""
    return f"- Partida previa ({stamp}) vs {game_row.opponent_persona or 'oponente'} | Resultado: {game_row.result}{opening_text}{rating_text}"

def build_reference_key(reference: Dict[str, Any]) -> str:
    return "|".join([
        str(reference.get("source") or "unknown"),
        str(reference.get("event") or ""),
        str(reference.get("date") or ""),
        str(reference.get("opponent") or ""),
        str(reference.get("opening") or ""),
    ])

def get_recent_reference_keys(db: Session, user_id: str, coach_id: str, session_token: Optional[str]) -> set[str]:
    query = db.query(CoachReferenceLog).filter(
        CoachReferenceLog.user_id == user_id,
        CoachReferenceLog.coach_id == coach_id,
    )
    if session_token:
        query = query.filter(CoachReferenceLog.session_token == session_token)
    rows = query.order_by(CoachReferenceLog.cited_at.desc()).limit(20).all()
    return {row.source_key for row in rows}

async def retrieve_verified_historical_reference(db: Session, user_id: str, ctx: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if ctx["persona"] == "general":
        return None
    if ctx["is_small_talk"] and not ctx["has_live_position"]:
        return None
    if not ctx["fen"] or not ctx["has_live_position"]:
        return None
    recent_keys = get_recent_reference_keys(db, user_id, ctx["persona"], ctx["session_token"])
    local_reference = find_master_wisdom(ctx["fen"], ctx["persona"], db)
    if local_reference:
        local_reference["verified"] = True
        local_reference["source_type"] = "historical_game"
        local_reference["source_key"] = build_reference_key(local_reference)
        if local_reference["source_key"] not in recent_keys:
            return local_reference
    if ctx["move_count"] <= OPENING_PHASE_MAX_PLY:
        lichess_reference = await get_lichess_wisdom(ctx["fen"])
        if lichess_reference:
            lichess_reference["verified"] = True
            lichess_reference["source_type"] = "opening_reference"
            lichess_reference["source_key"] = build_reference_key(lichess_reference)
            if lichess_reference["source_key"] not in recent_keys:
                return lichess_reference
    return None

def build_reality_block(ctx: Dict[str, Any]) -> str:
    if ctx["has_live_position"] and ctx["fen"]:
        tactical = get_tactical_context(ctx["fen"])
        if tactical:
            legal_moves = tactical["legal_moves"]
            if len(legal_moves) > 240:
                legal_moves = legal_moves[:240] + "..."
            return (
                f"CONTEXTO ACTUAL:\n"
                f"- Fase: {ctx['interaction_mode']}\n"
                f"- El usuario juega con {ctx['user_color_label']} y el maestro con {ctx['master_color']}.\n"
                f"- Le toca mover a {ctx['turn_label']}.\n"
                f"- Numero de medias jugadas: {ctx['move_count']}\n"
                f"- Jaque actual: {tactical['is_check']}\n"
                f"- Tablero observado:\n{tactical['board_description']}\n"
                f"- Movimientos legales visibles para el bando al turno: {legal_moves}\n"
            )
    return (
        f"CONTEXTO ACTUAL:\n"
        f"- Fase: {ctx['interaction_mode']}\n"
        f"- Aun no existe una posicion tactica viva que permita hablar de amenazas concretas.\n"
        f"- Puedes saludar, orientar, preparar el enfoque estrategico o conectar con recuerdos del pasado, "
        f"pero siempre marcandolos como pasado.\n"
    )

def build_session_turns(session_messages: List[CoachMessage]) -> List[Dict[str, Any]]:
    merged: List[Dict[str, Any]] = []
    last_role: Optional[str] = None
    for row in session_messages[-8:]:
        role = "model" if row.role in {"model", "assistant", "coach"} else "user"
        if merged and role == last_role:
            merged[-1]["parts"][0]["text"] += f"\n\n{row.content}"
            continue
        merged.append({"role": role, "parts": [{"text": row.content}]})
        last_role = role
    if merged and merged[0]["role"] == "model":
        merged = merged[1:]
    return merged

def assemble_prompt(
    ctx: Dict[str, Any],
    profile_data: Dict[str, Any],
    relevant_memories: Dict[str, List[Any]],
    historical_reference: Optional[Dict[str, Any]],
) -> str:
    master_info = MASTER_BIO_DATA.get(ctx["persona"], {})
    books = ", ".join(master_info.get("books", []))
    biography = ctx.get("wikimedia_biography") or master_info.get("biography", "")
    criteria = MASTER_CRITERIA.get(ctx["persona"], "Juega con criterio sano y precision.")
    scope_instructions = (
        "Tienes acceso al historial completo del usuario y puedes sintetizarlo globalmente."
        if ctx["scope"] == "global"
        else "Solo puedes usar la memoria de este usuario contigo, mas tus fuentes historicas reales."
    )
    memories_block = "\n".join(format_memory_message(row) for row in relevant_memories["messages"]) or "- No hay recuerdos conversacionales relevantes para este turno."
    games_block = "\n".join(format_memory_game(row) for row in relevant_memories["games"]) or "- No hay partidas previas especialmente relevantes para este turno."
    historical_block = "- No cites ninguna partida historica si no encaja claramente."
    if historical_reference:
        opening_text = f" | Apertura: {historical_reference.get('opening')}" if historical_reference.get("opening") else ""
        historical_block = (
            f"- Referencia historica verificada disponible: {historical_reference.get('opponent')} "
            f"({historical_reference.get('date')}, {historical_reference.get('event')}){opening_text}. "
            "Si la usas, debes dejar claro que es un recuerdo del pasado y primero comentar la realidad actual."
        )
    return (
        f"IDENTIDAD:\n{COACH_PERSONALITIES.get(ctx['persona'], DEFAULT_COACH_PROMPT)}\n\n"
        f"BIOGRAFIA REAL:\n- {biography}\n- Criterio tecnico: {criteria}\n- Libros/fuentes base: {books or 'No disponibles'}\n\n"
        f"ALCANCE DE MEMORIA:\n- {scope_instructions}\n- La memoria completa existe, pero solo debes usar en la respuesta lo que ayude de verdad.\n\n"
        f"{build_reality_block(ctx)}\n"
        "REGLAS DE CONVERSACION:\n"
        "- Habla siempre en espanol natural.\n"
        "- No repitas saludos ni parrafos ya usados recientemente.\n"
        "- No uses emojis ni teatralidad innecesaria.\n"
        "- Nunca describas amenazas, piezas colgando o calculos actuales si la partida aun no ha empezado.\n"
        "- Si citas memoria pasada, marcala como pasado.\n"
        "- Cuando recuerdes algo del usuario, usa referencias temporales humanas: 'hoy a las 17:40', 'ayer' o 'hace 2 dias'; evita fechas de calendario frias si una expresion natural suena mejor.\n"
        "- Si no hay dato real verificable para una referencia historica, no la inventes.\n"
        "- Responde como un ser humano experto, coherente y concreto.\n\n"
        f"MEMORIA RESUMIDA PERSISTENTE:\n{format_memory_profile_block(profile_data)}\n\n"
        f"RECUERDOS CONVERSACIONALES RELEVANTES:\n{memories_block}\n\n"
        f"PARTIDAS PREVIAS RELEVANTES:\n{games_block}\n\n"
        f"REFERENCIA HISTORICA:\n{historical_block}\n"
    )

async def generate_reply_with_memory(
    prompt: str,
    session_turns: List[Dict[str, Any]],
    ctx: Dict[str, Any],
    recent_model_replies: List[str],
) -> str:
    current_api_key = os.getenv("GEMINI_API_KEY")
    if not current_api_key:
        return "El sistema de IA no esta configurado (falta API Key)."
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key={current_api_key}"
    current_turn = (
        f"Mensaje actual del usuario: {ctx['message']}\n"
        f"Modo de interaccion: {ctx['interaction_mode']}\n"
        f"Tipo de mensaje: {ctx['message_kind']}\n"
        f"Posicion FEN: {ctx['fen'] or 'sin posicion tactica actual'}\n"
        f"PGN disponible: {ctx['pgn'] or 'sin PGN'}\n"
        "Responde priorizando la realidad actual, luego memoria, y por ultimo referencias historicas verificadas."
    )
    contents: List[Dict[str, Any]] = [
        {"role": "user", "parts": [{"text": prompt}]},
        {"role": "model", "parts": [{"text": "Entendido. Mantendre memoria completa, coherencia temporal y datos reales."}]},
    ] + session_turns + [{"role": "user", "parts": [{"text": current_turn}]}]
    generation_config = {
        "temperature": 0.45,
        "topP": 0.85,
        "topK": 24,
    }
    async with httpx.AsyncClient() as client:
        for attempt in range(2):
            response = await client.post(
                api_url,
                json={"contents": contents, "generationConfig": generation_config},
                timeout=30.0,
            )
            data = response.json()
            if "candidates" not in data:
                logger.error(f"Gemini API Error: {json.dumps(data)}")
                if "error" in data:
                    return f"Error de IA: {data['error'].get('message', 'Desconocido')}"
                return "El maestro no puede responder en este momento."
            reply = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            is_repetitive = False
            for prev in recent_model_replies[:5]:
                similarity = difflib.SequenceMatcher(None, reply.lower(), prev.lower()).ratio()
                if similarity > 0.72:
                    is_repetitive = True
                    break
            if not is_repetitive or attempt == 1:
                return reply
            contents.extend([
                {"role": "model", "parts": [{"text": reply}]},
                {
                    "role": "user",
                    "parts": [{"text": "Reformula sin repetir estructura, saludo ni anecdota. Se mas concreto y cambia el enfoque."}],
                },
            ])
    return "El maestro no puede responder en este momento."

def log_reference_usage(db: Session, user_id: str, coach_id: str, ctx: Dict[str, Any], historical_reference: Optional[Dict[str, Any]]):
    if not historical_reference:
        return
    db.add(
        CoachReferenceLog(
            user_id=user_id,
            coach_id=coach_id,
            source_type=historical_reference.get("source_type", "historical_game"),
            source_key=historical_reference.get("source_key", build_reference_key(historical_reference)),
            session_token=ctx["session_token"],
            game_id=ctx["game_id"],
        )
    )

def persist_interaction(db: Session, user_id: str, ctx: Dict[str, Any], request: ChatRequest, reply: str):
    if ctx["message_kind"] == "user" and not request.silent:
        db.add(
            CoachMessage(
                user_id=user_id,
                coach_id=ctx["persona"],
                game_id=ctx["game_id"],
                session_token=ctx["session_token"],
                interaction_mode=ctx["interaction_mode"],
                fen_snapshot=ctx["fen"],
                move_count=ctx["move_count"],
                topic_tags_json=json.dumps(ctx["topic_tags"]),
                role="user",
                content=ctx["message"],
            )
        )
    db.add(
        CoachMessage(
            user_id=user_id,
            coach_id=ctx["persona"],
            game_id=ctx["game_id"],
            session_token=ctx["session_token"],
            interaction_mode=ctx["interaction_mode"],
            fen_snapshot=ctx["fen"],
            move_count=ctx["move_count"],
            topic_tags_json=json.dumps(ctx["topic_tags"]),
            role="model",
            content=reply,
        )
    )

def build_scope_records(db: Session, user_id: str, coach_id: str) -> Tuple[List[CoachMessage], List[Game]]:
    message_query, game_query = build_scope_queries(db, user_id, coach_id)
    messages = message_query.order_by(CoachMessage.timestamp.desc()).all()
    games = game_query.order_by(Game.played_at.desc()).all()
    return messages, games

def synthesize_profile_payload(coach_id: str, messages: List[CoachMessage], games: List[Game]) -> Dict[str, Any]:
    tag_counter: Counter[str] = Counter()
    for row in messages:
        for tag in safe_json_loads(row.topic_tags_json, []):
            tag_counter[tag] += 1
    opening_counter: Counter[str] = Counter()
    for row in games:
        if row.opening:
            opening_counter[row.opening] += 1
        elif row.eco:
            opening_counter[row.eco] += 1
    strengths: List[str] = []
    weaknesses: List[str] = []
    if games:
        strong_reviews = [row.master_review for row in games if row.master_review and row.master_rating and row.master_rating >= 7]
        weak_reviews = [row.master_review for row in games if row.master_review and row.master_rating and row.master_rating <= 4]
        strengths = extract_text_tokens(" ".join(strong_reviews), max_tokens=4)
        weaknesses = extract_text_tokens(" ".join(weak_reviews), max_tokens=4)
    recent_user_messages = [row.content for row in messages if row.role == "user"][:8]
    conversation_style = "directo y conciso"
    if any(len((msg or "").split()) > 20 for msg in recent_user_messages):
        conversation_style = "detallado y reflexivo"
    summary_text = (
        "Aun se esta construyendo la relacion."
        if not messages and not games
        else f"Relacion acumulada con {len(messages)} mensajes y {len(games)} partidas registradas."
    )
    return {
        "coach_id": coach_id,
        "relationship_summary": summary_text,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "recurrent_openings": [name for name, _ in opening_counter.most_common(4)],
        "patterns": [name for name, _ in tag_counter.most_common(5)],
        "conversation_style": conversation_style,
        "recent_topics": [name for name, _ in tag_counter.most_common(6)],
        "advice_that_helped": [],
        "repeated_errors": weaknesses[:3],
        "last_results": [row.result for row in games[:6] if row.result],
        "updated_at": datetime.datetime.utcnow().isoformat(),
    }

def maybe_refine_profile_with_llm(coach_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    current_api_key = os.getenv("GEMINI_API_KEY")
    if not current_api_key:
        return payload
    prompt = (
        "Devuelve solo JSON valido. Resume el perfil de memoria de un usuario de ajedrez. "
        "No inventes datos, solo reorganiza y sintetiza.\n"
        f"Coach: {coach_id}\n"
        f"Payload base: {json.dumps(payload, ensure_ascii=False)}"
    )
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key={current_api_key}"
    try:
        with httpx.Client() as client:
            response = client.post(
                api_url,
                json={
                    "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.2, "topP": 0.8, "topK": 20},
                },
                timeout=20.0,
            )
        data = response.json()
        if "candidates" not in data:
            return payload
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
        match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if not match:
            return payload
        refined = json.loads(match.group(0))
        if not isinstance(refined, dict):
            return payload
        merged = payload.copy()
        merged.update({k: v for k, v in refined.items() if v not in (None, "", [], {})})
        merged["updated_at"] = datetime.datetime.utcnow().isoformat()
        return merged
    except Exception:
        return payload

def sync_relationship_projection(db: Session, user_id: str, coach_id: str, payload: Dict[str, Any]):
    if coach_id == "general":
        return
    relationship = db.query(CoachRelationship).filter(
        CoachRelationship.user_id == user_id,
        CoachRelationship.coach_id == coach_id,
    ).first()
    if not relationship:
        relationship = CoachRelationship(user_id=user_id, coach_id=coach_id)
        db.add(relationship)
    relationship.strengths_json = json.dumps(payload.get("strengths", []))
    relationship.weaknesses_json = json.dumps(payload.get("weaknesses", []))
    relationship.last_topic = (payload.get("recent_topics") or [None])[0]
    relationship.notes = payload.get("relationship_summary") or None

def refresh_memory_profile_task(user_id: str, coach_id: str):
    db = SessionLocal()
    try:
        profile_row, _ = get_or_create_memory_profile(db, user_id, coach_id)
        messages, games = build_scope_records(db, user_id, coach_id)
        payload = synthesize_profile_payload(coach_id, messages, games)
        payload = maybe_refine_profile_with_llm(coach_id, payload)
        profile_row.summary_json = json.dumps(payload, ensure_ascii=False)
        profile_row.updated_at = datetime.datetime.utcnow()
        sync_relationship_projection(db, user_id, coach_id, payload)
        db.commit()
    except Exception as exc:
        logger.warning(f"Memory profile refresh failed for {user_id}/{coach_id}: {exc}")
        db.rollback()
    finally:
        db.close()

@app.get("/api/chat/history/{persona}")
async def get_chat_history(
    persona: str,
    game_id: Optional[int] = None,
    session_token: Optional[str] = Query(default=None),
    interaction_mode: Optional[str] = Query(default=None),
    include_legacy: bool = Query(default=False),
    authenticated_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(CoachMessage).filter(
        CoachMessage.user_id == authenticated_user_id,
        CoachMessage.coach_id == normalize_persona(persona),
    )
    if game_id is not None:
        query = query.filter(CoachMessage.game_id == game_id)
    if session_token:
        query = query.filter(CoachMessage.session_token == session_token)
    if interaction_mode:
        query = query.filter(CoachMessage.interaction_mode == normalize_interaction_mode(interaction_mode))
    if not include_legacy:
        query = query.filter(CoachMessage.interaction_mode != "legacy")
    history = query.order_by(CoachMessage.timestamp.asc()).all()
    return [
        {
            "role": "coach" if row.role == "model" else row.role,
            "text": row.content,
            "interaction_mode": row.interaction_mode,
            "session_token": row.session_token,
            "game_id": row.game_id,
        }
        for row in history
    ]

@app.post("/api/chat")
async def chat_with_coach(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    authenticated_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = authenticated_user_id
    ctx = build_request_context(request)
    if ctx["persona"] != "general":
        wiki_profile = await get_or_fetch_wiki_profile(db, ctx["persona"], lang="es")
        if wiki_profile and wiki_profile.get("wikipedia_summary"):
            ctx["wikimedia_biography"] = wiki_profile["wikipedia_summary"]
    _, profile_data = get_or_create_memory_profile(db, user_id, ctx["persona"])
    session_context = load_session_context(db, user_id, ctx)
    relevant_memories = retrieve_relevant_memories(db, user_id, ctx)
    historical_reference = await retrieve_verified_historical_reference(db, user_id, ctx)
    prompt = assemble_prompt(ctx, profile_data, relevant_memories, historical_reference)
    session_turns = build_session_turns(session_context)
    recent_model_replies = [row.content for row in reversed(session_context) if row.role == "model"]
    reply = await generate_reply_with_memory(prompt, session_turns, ctx, recent_model_replies)

    try:
        persist_interaction(db, user_id, ctx, request, reply)
        log_reference_usage(db, user_id, ctx["persona"], ctx, historical_reference)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error(f"Failed to persist chat interaction: {exc}")
        return {"reply": "Error guardando la memoria de esta conversacion."}

    background_tasks.add_task(refresh_memory_profile_task, user_id, ctx["persona"])
    if ctx["persona"] != "general":
        background_tasks.add_task(refresh_memory_profile_task, user_id, "general")

    citations = []
    if historical_reference:
        citations.append(
            {
                "type": historical_reference.get("source_type", "historical_game"),
                "label": historical_reference.get("event") or historical_reference.get("opponent"),
                "source": historical_reference.get("source"),
                "verified": True,
            }
        )

    return {
        "reply": reply,
        "citations": citations,
        "memory_scope": ctx["scope"],
        "memory_hits": {
            "messages": len(relevant_memories["messages"]),
            "games": len(relevant_memories["games"]),
            "profile": bool(profile_data),
        },
    }

    persona = request.get("persona", "general")
    user_id = authenticated_user_id # Always trust the JWT from get_current_user

    # Extraer datos básicos e identidad
    original_message = request.get("message", "")
    message = original_message
    fen = request.get("fen")
    prompt = COACH_PERSONALITIES.get(persona, DEFAULT_COACH_PROMPT)
    
    # Identidad base (calculada una sola vez)
    user_is_white = str(request.get("user_color", "white")).lower() in ["white", "w", "blanco", "blancas"]
    master_color = "NEGRAS" if user_is_white else "BLANCAS"
    opp_color = "BLANCAS" if user_is_white else "NEGRAS"
    turn_str = "BLANCAS" if str(request.get("turn", "w")).lower() == "w" else "NEGRAS"

    # Reality snapshot (to be injected at the LATEST turn)
    reality_anchor = ""
    if fen:
        td = get_tactical_context(fen)
        if td:
            reality_anchor = (
                f"\n\n--- ANCLA DE REALIDAD (CONTEXTO INMEDIATO) ---\n"
                f"TU LADO: {master_color} | LADO DEL USUARIO: {opp_color}\n"
                f"TURNO DE: {turn_str}\n"
                f"TABLERO ACTUAL:\n{td['board_description']}\n"
                f"TUS MOVIMIENTOS LEGALES: {td['legal_moves']}\n"
                f"INSTRUCCIÓN: Comenta como {persona.upper()}. Si el usuario te pregunta por 'mi jugada' o 'mi posición', "
                f"recuerda que TÚ eres las {master_color}. No te confundas de bando."
            )

    is_internal = message.startswith("_INTERNAL_")
    
    # If it's an internal trigger, we don't use the message as the user message
    # but as a hint for the master's "thought"
    display_message = message if not is_internal else ""
    
    # Inject Master Bio and Books if available
    master_info = MASTER_BIO_DATA.get(persona)
    if master_info:
        bio = master_info.get("biography", "")
        books = ", ".join(master_info.get("books", []))
        prompt += f"\nContexto histórico: {bio}\nTu bibliografía fundamental: {books}. Usa este conocimiento para dar consejos técnicos. IMPORTANTE: Expresa tus emociones y reacciones usando emojis variados."
    
    # PERSISTENT HISTORY: Load history (Infinite Recall)
    if persona == "general":
        # Central Brain: Access ALL conversations of this user
        db_history = db.query(CoachMessage).filter(CoachMessage.user_id == user_id).order_by(CoachMessage.timestamp.desc()).all()
        # Enriquecer con historial de PARTIDAS reales para memoria profunda
        recent_games = db.query(Game).filter(Game.user_id == user_id).order_by(Game.played_at.desc()).limit(5).all()
        game_summary = "\n".join([f"- Partida {g.played_at}: vs {g.opponent_persona}, Resultado {g.result}" for g in recent_games])
        
        prompt += f"\n\n--- MEMORIA DE PARTIDAS RECIENTES ---\n{game_summary}\n"
        prompt += "\nINSTRUCCIÓN DE CEREBRO CENTRAL: Eres el núcleo de conocimiento. Se te ha proveído el historial de TODAS las partidas y conversaciones. Úsalo para dar una visión coherente y unificada sobre el progreso del usuario."
    else:
        # Individual Masters: Only their own history
        db_history = db.query(CoachMessage).filter(CoachMessage.user_id == user_id, CoachMessage.coach_id == persona).order_by(CoachMessage.timestamp.desc()).all()
    
    db_history.reverse()
    formatted_history = []
    last_role = None
    
    for m in db_history:
        content = m.content
        # SCRUBBING: Clean legacy prompts or internal thoughts
        if "_INTERNAL_THOUGHT_" in content or "Comenta la posición de forma creativa" in content:
            continue
            
        # Standardize roles for Gemini
        role = "model" if m.role in ["model", "assistant", "coach"] else "user"
        
        # Merge consecutive messages of the same role
        if role == last_role and formatted_history:
            formatted_history[-1]["parts"][0]["text"] += f"\n\n{content}"
            continue

        if persona == "general" and m.coach_id != "general":
            role_label = "MAESTRO" if role == "model" else "USUARIO"
            content = f"[{role_label} @ {m.coach_id.upper()}]: {content}"
            
        formatted_history.append({"role": role, "parts": [{"text": content}]})
        last_role = role

    # --- HARD DEDUPLICATION FILTER ---
    # Extract recently mentioned opponents or dates from history to avoid loops
    last_mentions = []
    for m in formatted_history:
        text = m.get("parts", [{}])[0].get("text", "").lower()
        # Look for names or dates that were recently cited
        for name in ["matthai", "anderson", "warner", "spassky", "1956", "1972", "1955"]:
            if name in text:
                last_mentions.append(name)
    
    # Check for historical wisdom
    wisdom: Optional[Dict[str, Any]] = None
    if fen and persona != "general":
        # Attempt to find wisdom up to 3 times with different random samples if we hit a dupe
        for _ in range(3):
            wisdom = find_master_wisdom(fen, persona, db)
            if not wisdom:
                wisdom_res = await get_lichess_wisdom(fen)
                wisdom = wisdom_res
            
            if wisdom:
                opp = wisdom.get("opponent", "").lower()
                date = str(wisdom.get("date", "")).lower()
                # If this game was mentioned in the last 10 messages, skip it
                if any(m in opp or m in date for m in last_mentions[-10:]):
                    wisdom = None # Reset and try again or fallback
                    continue
                break
        
    if wisdom:
        # Instruction for human-centric immersion
        source_note = ""
        opening_info = f" ({wisdom.get('opening', 'Desconocida')})" if wisdom.get('opening') else ""
        if wisdom.get("source") == "local_db":
            intros = [
                "Esto me recuerda ligeramente a ", 
                "Tu posición tiene ecos de mi duelo con ", 
                "El aire aquí se siente como cuando enfrenté a ", 
                "¿Sabes? Hace años, contra ", 
                "Hay una verdad oculta aquí que ya vi frente a "
            ]
            intro = random.choice(intros)
            game_ref = f"{wisdom['opponent']} ({wisdom['date']})"
            source_note = f"CONTEXTO VIVO: {intro} {game_ref}{opening_info}."
            prompt += f"\n\n{source_note}\nINSTRUCCIÓN: No cites el dato como un robot. Eres un maestro y un amigo. Comenta la partida actual PRIMERO, y menciona este recuerdo SOLO si ayuda al usuario a entender la posición. ¡PROHIBIDO repetir frases de turnos anteriores!"
        else:
            source_note = f"PEDIGRÍ TEÓRICO: Algo similar ocurrió en el duelo {wisdom['opponent']} ({wisdom['date']}){opening_info}."
            prompt += f"\n\n{source_note}\nINSTRUCCIÓN: Háblale al usuario de tú a tú. Comenta SU jugada real."

    # Diversity Engine: Narrative Rotation (Refined for Human Dialogue)
    narrative_focuses = [
        "AMISTAD Y MAESTRÍA: Habla como un mentor que quiere lo mejor para su pupilo. Menciona algo que el usuario haya hecho bien antes.",
        "ANÁLISIS DE COMBATE: Enfócate en la tensión inmediata. ¿Quién tiene más ganas de ganar aquí?",
        "FILOSOFÍA DEL TABLERO: Reflexiona sobre la belleza o la tragedia de la posición actual.",
        "CONSEJO DE VETERANO: Da un consejo práctico, corto y útil para este momento exacto.",
        "OBSERVACIÓN PSICOLÓGICA: Comenta el 'ritmo' o la 'energía' que proyecta el usuario en sus jugadas."
    ]
    current_focus = random.choice(narrative_focuses)
    prompt += f"\nENFOQUE DE CONVERSACIÓN (HUMANO): {current_focus}"

    # Aggressive Realism & Anti-Cliché Logic (Hardened)
    prompt += (
        "\nREGLA DE ORO (CRÍTICA): Eres un SER HUMANO real. Los seres humanos no repiten párrafos enteros."
        "\n1. BREVEDAD: Mantén tu comentario espontáneo por debajo de 250 caracteres. Sé directo."
        "\n2. DIÁLOGO REAL: Si el usuario dijo algo antes, recuérdalo como un amigo. 'Como dijimos antes/Como hiciste recién...'"
        "\n3. CERO ALUCINACIONES: Tienes el FEN real. El tablero ESTÁ AHÍ. No digas que no lo ves. Si no ves piezas, simplemente comenta la filosofía del inicio de partida."
        "\n4. CERO MATTHAI: Si ya hablaste de Matthai, Anderson o Warner recientemente, ¡CÁLLATE sobre ellos! Habla del presente."
    )
    # Aggressive Repetition & Cliché Blocking
    if persona == "fischer":
        # We don't cite the exact phrase to avoid reinforcement, 
        # instead we use categorical constraints.
        prompt += (
            "\nREGLA DE ORO DE REALISMO: ¡PROHIBIDO usar frases hechas o muletillas técnicas repetitivas! "
            "Si sientes la tentación de decir que una jugada 'rompe el rigor' o 'es un error por no buscar la verdad', DETENTE. "
            "En su lugar, inventa una nueva forma brutal y original de insultar o halagar la posición. "
            "Fischer nunca se repite; su genio es siempre fresco y sorprendente."
        )

    # Inject Relationship & Mentorship Context
    rel = db.query(CoachRelationship).filter(CoachRelationship.user_id == user_id, CoachRelationship.coach_id == persona).first()
    if not rel:
        rel = CoachRelationship(user_id=user_id, coach_id=persona)
        db.add(rel)
        db.commit()
        db.refresh(rel)
    
    relationship_context = f"\nTU RELACIÓN CON ESTE USUARIO (Nivel de mentoría: {rel.mentorship_level}):\n"
    relationship_context += f"- Debilidades percibidas: {rel.weaknesses_json}\n"
    relationship_context += f"- Fortalezas: {rel.strengths_json}\n"
    if rel.notes: relationship_context += f"- Notas de mentoría: {rel.notes}\n"
    
    prompt += relationship_context
    prompt += "\nINSTRUCCIÓN: Adapta tus consejos basándote en lo que ya sabes de este usuario. Si es la primera vez, felicítalo por iniciar su camino. Si ya lo conoces, sé más exigente o alentador según el nivel."

    # Inject Memory of past games with user
    if user_id:
        if persona == "general":
            # Central Brain sees ALL games
            past = db.query(Game).filter(Game.user_id == user_id).order_by(Game.played_at.desc()).all()
        else:
            # Individual masters remember ALL their games
            past = db.query(Game).filter(Game.user_id == user_id, Game.opponent_persona == persona).order_by(Game.played_at.desc()).all()
            
        if past:
            if persona == "general":
                prompt += "\nMEMORIA GLOBAL DE PARTIDAS: " + "; ".join([f"Contra {g.opponent_persona} (Res: {g.result}, Cal: {g.master_rating}/10)" for g in past])
            else:
                prompt += "\nTu memoria de duelos históricos con este usuario: " + "; ".join([f"Resultado {g.result}, Calificación {g.master_rating}/10" for g in past])

    # Memory logic already moved up

    async with httpx.AsyncClient() as client:
        try:
            # IDENTIFY LAST MODEL RESPONSE FOR DEDUPLICATION
            last_model_reply = ""
            for turn in reversed(formatted_history):
                if turn["role"] == "model":
                    last_model_reply = turn["parts"][0]["text"]
                    break

            # PREPARE CONTENTS FOR GEMINI
            # Ensure we don't start with a 'model' role
            if formatted_history and formatted_history[0]["role"] == "model":
                formatted_history = formatted_history[1:]

            variety_instruction = "\n\nCRÍTICO: No repitas frases, saludos o anécdotas que ya hayas usado. Si ya te has presentado, ve directo al grano. Sé creativo y variable."
            
            # Initial persona turns to set the stage
            base_turns = [
                {"role": "user", "parts": [{"text": f"INSTRUCCIÓN DE PERSONA: {prompt}{variety_instruction}"}]},
                {"role": "model", "parts": [{"text": "Entendido. Sigo en el personaje con total frescura y variedad histórica."}]}
            ]

            if is_internal:
                thought_context = (
                    f"Mira fijamente el tablero. Esta es la posición: {fen}\n"
                    "REFLEXIÓN ESPONTÁNEA: Comparte un pensamiento breve, humano e inmersivo sobre lo que ves. "
                    "No digas 'hola' ni te presentes de nuevo. Habla del tablero actual."
                    f"{reality_anchor}"
                )
                # Ensure alternation: if last history is user, we merge. If model, we append user.
                if formatted_history and formatted_history[-1]["role"] == "user":
                    formatted_history[-1]["parts"][0]["text"] += f"\n\n[REFLEXIÓN]: {thought_context}"
                    contents = base_turns + formatted_history
                else:
                    contents = base_turns + formatted_history + [{"role": "user", "parts": [{"text": thought_context}]}]
            else:
                user_msg_final = f"Mensaje del usuario: {message}\nPosición FEN: {fen}{reality_anchor}"
                user_turn = {"role": "user", "parts": [{"text": user_msg_final}]}
                if formatted_history and formatted_history[-1]["role"] == "user":
                    formatted_history[-1]["parts"][0]["text"] += f"\n\n[MENSAJE]: {user_msg_final}"
                    contents = base_turns + formatted_history
                else:
                    contents = base_turns + formatted_history + [user_turn]
            
            # Reconstruct URL to ensure it uses the latest API key from env
            current_api_key = os.getenv("GEMINI_API_KEY")
            if not current_api_key:
                return {"reply": "El sistema de IA no está configurado (falta API Key)."}
                
            api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key={current_api_key}"
            
            # Use moderate temperature for technical precision but keep some flair
            generation_config = {
                "temperature": 0.5,
                "topP": 0.9,
                "topK": 30
            }
            
            res = await client.post(api_url, json={"contents": contents, "generationConfig": generation_config}, timeout=30.0)
            data = res.json()
            
            if 'candidates' not in data:
                logger.error(f"Gemini API Error: {json.dumps(data)}")
                if 'error' in data:
                    return {"reply": f"Error de IA: {data['error'].get('message', 'Desconocido')}"}
                return {"reply": "El maestro está meditando profundamente..."}
                
            reply = data['candidates'][0]['content']['parts'][0]['text'].strip()
            
            # VARIETY GUARD 3.0: Check fuzzy similarity against the last 5 model replies
            recent_responses = [m.content for m in db_history if m.role == "model"][:5]
            is_repetitive = False
            for prev in recent_responses:
                # Use SequenceMatcher for fuzzy comparison (Levenshtein-like)
                similarity = difflib.SequenceMatcher(None, reply.lower(), prev.lower()).ratio()
                if similarity > 0.65: # 65% similarity threshold
                    logger.warning(f"STRICT REPETITION DETECTED (Similarity: {similarity:.2f}). Forcing re-roll.")
                    is_repetitive = True
                    break
            
            if is_repetitive:
                contents.append({"role": "model", "parts": [{"text": reply}]})
                contents.append({"role": "user", "parts": [{"text": "ESTÁS REPITIENDO IDEAS O ESTRUCTURAS. Dame una respuesta TOTALMENTE DIFERENTE, usa otros adjetivos y conceptos. No te repitas ni un poco."}]})
                res = await client.post(api_url, json={"contents": contents, "generationConfig": generation_config}, timeout=30.0)
                reply = res.json()['candidates'][0]['content']['parts'][0]['text'].strip()

            # Save User Message to DB (Skip if silent/internal)
            game_id = request.get("game_id")
            session_token = request.get("session_token")
            if not request.get("silent") and not is_internal:
                db.add(CoachMessage(user_id=user_id, coach_id=persona, game_id=game_id, session_token=session_token, role="user", content=original_message))
            
            # Save Assistant Reply to DB (ONLY if not silent)
            if not request.get("silent"):
                db.add(CoachMessage(user_id=user_id, coach_id=persona, game_id=game_id, session_token=session_token, role="model", content=reply))
                db.commit()
            
            return {"reply": reply}
        except Exception as e:
            return {"reply": f"Error: {e}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
