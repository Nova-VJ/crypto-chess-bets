import os
import httpx
import zipfile
import io
import chess.pgn
import json
import logging
import asyncio
from sqlalchemy.orm import Session
from database import SessionLocal, MasterGame, engine, Base

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure tables exist
Base.metadata.create_all(bind=engine)

MASTERS_PGN_URLS = {
    "fischer": "https://www.pgnmentor.com/players/Fischer.zip",
    "tal": "https://www.pgnmentor.com/players/Tal.zip",
    "capablanca": "https://www.pgnmentor.com/players/Capablanca.zip",
    "kasparov": "https://www.pgnmentor.com/players/Kasparov.zip",
    "carlsen": "https://www.pgnmentor.com/players/Carlsen.zip"
}

async def ingest_master(name, url, client):
    logger.info(f"Ingesting {name} from {url}...")
    try:
        response = await client.get(url, timeout=60.0)
        response.raise_for_status()
        
        with zipfile.ZipFile(io.BytesIO(response.content)) as z:
            # Find the .pgn file in the zip
            pgn_filename = [f for f in z.namelist() if f.endswith('.pgn')][0]
            logger.info(f"Found PGN file: {pgn_filename}")
            
            with z.open(pgn_filename) as pgn_file:
                pgn_text = pgn_file.read().decode('utf-8', errors='ignore')
                pgn_io = io.StringIO(pgn_text)
                
                db = SessionLocal()
                count = 0
                while True:
                    game = chess.pgn.read_game(pgn_io)
                    if game is None:
                        break
                    
                    headers = dict(game.headers)
                    
                    # Generate FEN list for indexing (first 40 moves)
                    board = game.board()
                    fens = []
                    move_count = 0
                    for move in game.mainline_moves():
                        board.push(move)
                        fens.append(board.fen())
                        move_count += 1
                        if move_count >= 100: break # index first 50 full moves
                    
                    master_game = MasterGame(
                        white=headers.get("White", "Unknown"),
                        black=headers.get("Black", "Unknown"),
                        result=headers.get("Result", "*"),
                        elo_white=int(headers.get("WhiteElo", 0)) if headers.get("WhiteElo", "0").isdigit() else 0,
                        elo_black=int(headers.get("BlackElo", 0)) if headers.get("BlackElo", "0").isdigit() else 0,
                        site=headers.get("Site", ""),
                        date=headers.get("Date", ""),
                        event=headers.get("Event", ""),
                        round=headers.get("Round", ""),
                        pgn=str(game),
                        eco=headers.get("ECO", ""),
                        opening=headers.get("Opening", ""),
                        fen_list=json.dumps(fens)
                    )
                    db.add(master_game)
                    count += 1
                    
                    if count % 100 == 0:
                        db.commit()
                        logger.info(f"Imported {count} games for {name}...")
                
                db.commit()
                db.close()
                logger.info(f"Finished ingesting {name}. Total: {count} games.")
                
    except Exception as e:
        logger.error(f"Error ingesting {name}: {e}")

async def main():
    # Bypass SSL verification and add User-Agent because PGNMentor certificates are expired
    # and they block default bot headers (465 error)
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    transport = httpx.AsyncHTTPTransport(verify=False)
    async with httpx.AsyncClient(transport=transport, headers=headers, follow_redirects=True) as client:
        # Ingest missing masters
        tasks = [
            ingest_master("fischer", MASTERS_PGN_URLS["fischer"], client),
            ingest_master("tal", MASTERS_PGN_URLS["tal"], client),
            ingest_master("capablanca", MASTERS_PGN_URLS["capablanca"], client),
            ingest_master("kasparov", MASTERS_PGN_URLS["kasparov"], client),
            ingest_master("carlsen", MASTERS_PGN_URLS["carlsen"], client)
        ]
        await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(main())
