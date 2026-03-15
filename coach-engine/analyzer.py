"""
Stockfish Analysis Engine — IA Coach Pro
Analyzes chess games using the local Stockfish binary.
Calculates ACPL, tactical oversights, opening drift, and endgame precision.
"""
import os
import chess
import chess.pgn
import chess.engine
import io
from typing import List, Dict, Any, Optional
from deploy_config import resolve_stockfish_path

STOCKFISH_PATH = resolve_stockfish_path()

ANALYSIS_DEPTH = 18  # Good balance between speed and accuracy
QUICK_DEPTH = 12     # For bulk analysis


def get_engine():
    """Get a Stockfish engine instance with optimized settings."""
    if not os.path.exists(STOCKFISH_PATH):
        raise FileNotFoundError(f"Stockfish not found at {STOCKFISH_PATH}")
    
    engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
    # Optimize for modern CPUs: 4 threads and 1GB Hash by default
    engine.configure({"Threads": 4, "Hash": 1024})
    return engine


async def get_persona_engine(persona_id: str):
    """Get a Stockfish engine configured to simulate a historical persona (Async)."""
    if not os.path.exists(STOCKFISH_PATH):
        raise FileNotFoundError(f"Stockfish not found at {STOCKFISH_PATH}")
    
    # DEBUG: Check running loop
    import asyncio
    loop = asyncio.get_running_loop()
    print(f"DEBUG: Current running loop type: {type(loop).__name__}")
    
    # CRITICAL FIX FOR WINDOWS: Ensure Proactor loop is used for subprocesses
    import sys
    if sys.platform == "win32":
        if type(loop).__name__ != 'ProactorEventLoop':
            print("WARNING: Loop is NOT ProactorEventLoop. Subprocess will likely fail.")
            # We can't easily change the running loop here, it must be done at startup.

    transport, engine = await chess.engine.popen_uci(STOCKFISH_PATH)
    await engine.configure({"Threads": 2, "Hash": 256}) # Lighter for real-time play
    
    # Configure parameters based on personas
    await engine.configure({"UCI_LimitStrength": True})
    if persona_id == 'fischer':
        await engine.configure({"UCI_Elo": 2800})
    elif persona_id == 'tal':
        await engine.configure({"UCI_Elo": 2100})
    elif persona_id == 'capablanca':
        await engine.configure({"UCI_Elo": 2600})
    elif persona_id == 'kasparov':
        await engine.configure({"UCI_Elo": 2800})
    elif persona_id == 'carlsen':
        await engine.configure({"UCI_Elo": 2850})
    else:
        await engine.configure({"UCI_Elo": 1500})
        
    return engine, transport


async def get_persona_move(fen: str, persona_id: str) -> Dict[str, Any]:
    """Get the move for a specific persona by analyzing the board position with Stockfish."""
    board = chess.Board(fen)
    engine, transport = await get_persona_engine(persona_id)
    
    try:
        # Determine depth based on persona for consistent performance
        # Using depth instead of time for more predictable response times in back-to-back calls
        analysis_depth = 14
        if persona_id == 'carlsen': analysis_depth = 16
        elif persona_id == 'tal': analysis_depth = 12 # Tal is more intuitive/fast
        
        # Single analysis call is much more efficient than play + analyse
        # It provides both the best move (first move in PV) and the evaluation
        info = await engine.analyse(board, chess.engine.Limit(depth=analysis_depth))
        
        if not info.get("pv"):
            raise ValueError("Engine returned no moves for the current position.")
            
        best_move = info["pv"][0]
        score = info["score"].white()
        
        return {
            "move": best_move.uci(),
            "san": board.san(best_move),
            "eval": score.score() if not score.is_mate() else f"M{score.mate()}",
            "best_move": best_move.uci(),
            "depth": analysis_depth
        }
    except Exception as e:
        print(f"ERROR in get_persona_move: {e}")
        raise
    finally:
        try:
            await engine.quit()
        except:
            pass
        transport.close()


def get_persona_move_sync(fen: str, persona_id: str) -> Dict[str, Any]:
    """Windows-safe synchronous persona move helper for FastAPI threadpool usage."""
    board = chess.Board(fen)
    engine = get_engine()

    try:
        engine.configure({"Threads": 2, "Hash": 256, "UCI_LimitStrength": True})
        if persona_id == 'fischer':
            engine.configure({"UCI_Elo": 2800})
        elif persona_id == 'tal':
            engine.configure({"UCI_Elo": 2100})
        elif persona_id == 'capablanca':
            engine.configure({"UCI_Elo": 2600})
        elif persona_id == 'kasparov':
            engine.configure({"UCI_Elo": 2800})
        elif persona_id == 'carlsen':
            engine.configure({"UCI_Elo": 2850})
        else:
            engine.configure({"UCI_Elo": 1500})

        analysis_depth = 14
        if persona_id == 'carlsen':
            analysis_depth = 16
        elif persona_id == 'tal':
            analysis_depth = 12

        info = engine.analyse(board, chess.engine.Limit(depth=analysis_depth))
        best_move = info.get("pv", [None])[0]
        if best_move is None:
            raise ValueError("Engine returned no moves for the current position.")

        score = info["score"].white()
        return {
            "move": best_move.uci(),
            "san": board.san(best_move),
            "eval": score.score() if not score.is_mate() else f"M{score.mate()}",
            "best_move": best_move.uci(),
            "depth": analysis_depth
        }
    finally:
        engine.quit()


def parse_pgn_string(pgn_text: str) -> List[chess.pgn.Game]:
    """Parse a PGN string and return a list of chess.pgn.Game objects."""
    games = []
    pgn_io = io.StringIO(pgn_text)
    while True:
        game = chess.pgn.read_game(pgn_io)
        if game is None:
            break
        games.append(game)
    return games


def classify_time_control(headers: dict) -> str:
    """Classify a game's time control into a bucket."""
    tc = headers.get("TimeControl", "")
    if not tc or tc == "-":
        return "classical"
    
    try:
        parts = tc.split("+")
        base = int(parts[0])
        increment = int(parts[1]) if len(parts) > 1 else 0
        total_expected = base + 40 * increment  # Rough estimate
        
        if total_expected < 180:
            return "bullet"
        elif total_expected < 600:
            return "blitz"
        elif total_expected < 1800:
            return "rapid"
        else:
            return "classical"
    except (ValueError, IndexError):
        return "blitz"


def analyze_game(pgn_game: chess.pgn.Game, depth: int = ANALYSIS_DEPTH) -> Dict[str, Any]:
    """
    Analyze a complete chess game using Stockfish.
    Returns comprehensive analysis data including:
    - ACPL (Average Centipawn Loss)
    - Move-by-move evaluations
    - Tactical oversights (missed forks, pins, discoveries)
    - Opening drift move (when player leaves theory)
    - Endgame precision
    """
    engine = get_engine()
    
    try:
        board = pgn_game.board()
        moves = list(pgn_game.mainline_moves())
        
        if len(moves) < 4:
            return {"error": "Game too short", "moves": len(moves)}
        
        evaluations = []
        centipawn_losses_white = []
        centipawn_losses_black = []
        tactical_misses = []
        blunders = []
        
        prev_score = None
        
        for move_num, move in enumerate(moves):
            # Analyze position BEFORE the move
            info_before = engine.analyse(board, chess.engine.Limit(depth=depth))
            score_before = info_before["score"].white()
            best_move = info_before.get("pv", [None])[0]
            
            # Make the move
            board.push(move)
            
            # Analyze position AFTER the move
            info_after = engine.analyse(board, chess.engine.Limit(depth=depth))
            score_after = info_after["score"].white()
            
            # Calculate centipawn loss
            cp_before = _score_to_cp(score_before)
            cp_after = _score_to_cp(score_after)
            
            is_white_move = (move_num % 2 == 0)
            
            if is_white_move:
                cp_loss = max(0, cp_before - (-cp_after))  # Negate because score flips
            else:
                cp_loss = max(0, (-cp_before) - cp_after)
            
            eval_entry = {
                "move_number": move_num // 2 + 1,
                "half_move": move_num,
                "move": move.uci(),
                "san": board.peek().uci() if board.move_stack else move.uci(),
                "eval_before": cp_before,
                "eval_after": cp_after,
                "cp_loss": cp_loss,
                "best_move": best_move.uci() if best_move else None,
                "is_best": move == best_move,
                "fen": board.fen(),
                "phase": _classify_phase(move_num, len(moves))
            }
            evaluations.append(eval_entry)
            
            # Track centipawn losses by color
            if is_white_move:
                centipawn_losses_white.append(cp_loss)
            else:
                centipawn_losses_black.append(cp_loss)
            
            # Detect tactical misses (cp_loss > 100 = missed tactic)
            if cp_loss > 100 and best_move and move != best_move:
                tactical_misses.append({
                    "move_number": move_num // 2 + 1,
                    "played": move.uci(),
                    "best": best_move.uci(),
                    "cp_loss": cp_loss,
                    "fen_before": evaluations[-1]["fen"],
                    "phase": eval_entry["phase"]
                })
            
            # Detect blunders (cp_loss > 200)
            if cp_loss > 200:
                blunders.append({
                    "move_number": move_num // 2 + 1,
                    "played": move.uci(),
                    "cp_loss": cp_loss,
                    "phase": eval_entry["phase"]
                })
            
            prev_score = score_after
        
        # Calculate ACPL
        acpl_white = sum(centipawn_losses_white) / max(len(centipawn_losses_white), 1)
        acpl_black = sum(centipawn_losses_black) / max(len(centipawn_losses_black), 1)
        
        # Detect opening drift (first move with cp_loss > 50 in opening phase)
        opening_drift = None
        for ev in evaluations:
            if ev["phase"] == "opening" and ev["cp_loss"] > 50:
                opening_drift = ev["move_number"]
                break
        
        # Endgame precision
        endgame_moves = [e for e in evaluations if e["phase"] == "endgame"]
        endgame_precision = 100
        if endgame_moves:
            endgame_losses = [e["cp_loss"] for e in endgame_moves]
            avg_endgame_loss = sum(endgame_losses) / len(endgame_losses)
            endgame_precision = max(0, min(100, 100 - avg_endgame_loss / 2))
        
        # Extract headers
        headers = dict(pgn_game.headers)
        
        return {
            "headers": headers,
            "time_bucket": classify_time_control(headers),
            "total_moves": len(moves),
            "acpl_white": round(acpl_white, 1),
            "acpl_black": round(acpl_black, 1),
            "tactical_misses": tactical_misses,
            "blunders": blunders,
            "opening_drift_move": opening_drift,
            "endgame_precision": round(endgame_precision, 1),
            "evaluations": evaluations,
            "result": headers.get("Result", "*")
        }
    
    finally:
        engine.quit()


def analyze_games_batch(pgn_text: str, max_games: int = 50) -> Dict[str, Any]:
    """
    Analyze multiple games from a PGN string.
    Returns aggregate statistics plus individual game analyses.
    """
    games = parse_pgn_string(pgn_text)[:max_games]
    
    results = {
        "total_games": len(games),
        "games": [],
        "aggregate": {}
    }
    
    all_acpl = []
    all_tactical_misses = 0
    all_blunders = 0
    opening_names = {}
    time_buckets = {}
    
    for game in games:
        try:
            analysis = analyze_game(game, depth=QUICK_DEPTH)
            results["games"].append(analysis)
            
            # Aggregate stats
            player_color = _detect_player_color(game)
            acpl = analysis["acpl_white"] if player_color == "white" else analysis["acpl_black"]
            all_acpl.append(acpl)
            all_tactical_misses += len(analysis["tactical_misses"])
            all_blunders += len(analysis["blunders"])
            
            # Track openings
            eco = game.headers.get("ECO", "Unknown")
            opening = game.headers.get("Opening", eco)
            result = game.headers.get("Result", "*")
            if opening not in opening_names:
                opening_names[opening] = {"count": 0, "wins": 0, "losses": 0, "draws": 0}
            opening_names[opening]["count"] += 1
            if (player_color == "white" and result == "1-0") or (player_color == "black" and result == "0-1"):
                opening_names[opening]["wins"] += 1
            elif result == "1/2-1/2":
                opening_names[opening]["draws"] += 1
            else:
                opening_names[opening]["losses"] += 1
            
            # Track time controls
            tb = analysis["time_bucket"]
            time_buckets[tb] = time_buckets.get(tb, 0) + 1
            
        except Exception as e:
            results["games"].append({"error": str(e), "headers": dict(game.headers)})
    
    # Build aggregate
    if all_acpl:
        results["aggregate"] = {
            "avg_acpl": round(sum(all_acpl) / len(all_acpl), 1),
            "total_tactical_misses": all_tactical_misses,
            "total_blunders": all_blunders,
            "openings": _build_opening_stats(opening_names),
            "time_buckets": time_buckets,
            "estimated_title": _estimate_title(sum(all_acpl) / len(all_acpl)),
            "games_analyzed": len([g for g in results["games"] if "error" not in g])
        }
    
    return results


def _score_to_cp(score) -> int:
    """Convert a chess.engine score to centipawns."""
    if score.is_mate():
        mate_moves = score.mate()
        return 10000 if mate_moves > 0 else -10000
    return score.score()


def _classify_phase(move_num: int, total_moves: int) -> str:
    """Classify the phase of the game based on move number."""
    if move_num < 20:  # First 10 full moves
        return "opening"
    elif move_num > total_moves * 0.65:
        return "endgame"
    else:
        return "middlegame"


def _detect_player_color(game: chess.pgn.Game) -> str:
    """Detect which color the analyzed player was playing."""
    white = game.headers.get("White", "")
    black = game.headers.get("Black", "")
    # Default to white; can be enhanced with user profiles
    return "white"


def _estimate_title(avg_acpl: float) -> str:
    """Estimate a playing title based on ACPL."""
    if avg_acpl < 15:
        return "GM"
    elif avg_acpl < 25:
        return "IM"
    elif avg_acpl < 35:
        return "FM"
    elif avg_acpl < 50:
        return "CM / Candidato"
    elif avg_acpl < 70:
        return "Avanzado"
    elif avg_acpl < 100:
        return "Intermedio"
    else:
        return "Principiante"


def _build_opening_stats(opening_names: dict) -> list:
    """Build sorted opening statistics."""
    stats = []
    for name, data in opening_names.items():
        total = data["count"]
        win_rate = round(data["wins"] / total * 100) if total > 0 else 0
        
        # Determine color class based on win rate
        if win_rate >= 60:
            color = "text-success"
            bg = "bg-success/20"
        elif win_rate >= 45:
            color = "text-yellow-500"
            bg = "bg-yellow-500/20"
        else:
            color = "text-destructive"
            bg = "bg-destructive/20"
        
        stats.append({
            "name": name,
            "winRate": f"{win_rate}%",
            "games": total,
            "color": color,
            "bg": bg,
            "bar": f"w-[{win_rate}%]"
        })
    
    # Sort by number of games played
    stats.sort(key=lambda x: x["games"], reverse=True)
    return stats[:5]  # Top 5 openings
