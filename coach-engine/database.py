import os
import sqlite3
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, Text, DateTime, UniqueConstraint
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./coach.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class DBUser(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    username = Column(String, index=True)
    default_rating = Column(Integer, default=1200)
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    unlocked_assets = Column(Text, default="[]") # JSON list of IDs
    current_board = Column(String, default="default")
    current_pieces = Column(String, default="default")
    
    # Gamification Fields
    achievement_points = Column(Integer, default=0)
    achievements_unlocked = Column(Text, default="[]") # JSON list of achievement IDs
    missions_daily = Column(Text, default="[]") # JSON list of daily mission objects
    missions_weekly = Column(Text, default="[]") # JSON list of weekly mission objects
    streak_count = Column(Integer, default=0)
    last_activity_date = Column(DateTime, default=datetime.datetime.utcnow)
    masteries_json = Column(Text, default="{}") # JSON map of mastery levels
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class PGNImport(Base):
    __tablename__ = "pgn_imports"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    import_date = Column(DateTime, default=datetime.datetime.utcnow)
    source = Column(String) # 'local', 'lichess', 'chess.com'
    game_count = Column(Integer, default=0)

class Game(Base):
    __tablename__ = "games"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    import_id = Column(Integer, ForeignKey("pgn_imports.id", ondelete="SET NULL"), nullable=True)
    time_bucket = Column(String) # 'blitz', 'rapid', etc.
    played_at = Column(DateTime, default=datetime.datetime.utcnow)
    result = Column(String)
    pgn_string = Column(Text)
    white_player = Column(String)
    black_player = Column(String)
    user_played_as = Column(String) # 'white' or 'black'
    acpl = Column(Float, nullable=True)
    accuracy = Column(Float, nullable=True)
    analysis_json = Column(Text, nullable=True)  # JSON blob with detailed analysis
    date_played = Column(String, nullable=True)
    opening = Column(String, nullable=True)
    eco = Column(String, nullable=True)
    opponent_persona = Column(String, nullable=True) # ID of the historical coach played against
    master_rating = Column(Integer, nullable=True) # 1-10
    master_review = Column(Text, nullable=True) # Feedback string
    neuro_metrics = Column(Text, nullable=True) # JSON blob (fatigue, pressure)
    time_control = Column(Integer, nullable=True) # Minutes
    session_token = Column(String, index=True, nullable=True)
    opening_family = Column(String, nullable=True)

class PositionAnalysis(Base):
    __tablename__ = "positions"
    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id", ondelete="CASCADE"))
    fen = Column(String)
    move_number = Column(Integer)
    played_move = Column(String)
    eval_centipawns = Column(Float)
    best_move = Column(String)
    is_blunder = Column(Integer, default=0) # 0/1 boolean in sqlite
    tactical_oversight = Column(String, nullable=True) # e.g. 'fork', 'pin' (if missed)

class KnowledgeSource(Base):
    __tablename__ = "knowledge_sources"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    author = Column(String)
    license_type = Column(String)

class KnowledgeUnit(Base):
    __tablename__ = "knowledge_units"
    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("knowledge_sources.id"))
    concept_name = Column(String)
    phase = Column(String)
    explanation = Column(Text)
    triggers = Column(Text) # JSON string
    anti_patterns = Column(Text) # JSON string
    example_fen = Column(String)
    recommended_drill = Column(String)

class MasterGame(Base):
    __tablename__ = "master_games"
    id = Column(Integer, primary_key=True, index=True)
    white = Column(String, index=True)
    black = Column(String, index=True)
    result = Column(String)
    elo_white = Column(Integer, nullable=True)
    elo_black = Column(Integer, nullable=True)
    site = Column(String, nullable=True)
    date = Column(String, nullable=True)
    event = Column(String, nullable=True)
    round = Column(String, nullable=True)
    pgn = Column(Text)
    eco = Column(String, index=True)
    opening = Column(String, nullable=True)
    fen_list = Column(Text) # JSON list of FENs for indexing positions

class CoachMessage(Base):
    __tablename__ = "coach_messages"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    coach_id = Column(String, index=True)
    game_id = Column(Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=True)
    session_token = Column(String, index=True, nullable=True)
    interaction_mode = Column(String, index=True, default="legacy")
    fen_snapshot = Column(String, nullable=True)
    move_count = Column(Integer, nullable=True)
    topic_tags_json = Column(Text, default="[]")
    role = Column(String) # 'user' or 'coach'
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class CoachRelationship(Base):
    __tablename__ = "coach_relationships"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    coach_id = Column(String, index=True)
    perceived_skill = Column(String, nullable=True) # e.g. "tactical", "positional"
    weaknesses_json = Column(Text, default="[]") # JSON list
    strengths_json = Column(Text, default="[]") # JSON list
    last_topic = Column(String, nullable=True)
    mentorship_level = Column(Integer, default=1)
    notes = Column(Text, nullable=True)

class CoachMemoryProfile(Base):
    __tablename__ = "coach_memory_profiles"
    __table_args__ = (UniqueConstraint("user_id", "coach_id", name="uq_coach_memory_profile"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    coach_id = Column(String, index=True)
    summary_json = Column(Text, default="{}")
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class CoachReferenceLog(Base):
    __tablename__ = "coach_reference_log"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    coach_id = Column(String, index=True)
    source_type = Column(String, index=True)
    source_key = Column(String, index=True)
    session_token = Column(String, index=True, nullable=True)
    game_id = Column(Integer, ForeignKey("games.id", ondelete="SET NULL"), nullable=True)
    cited_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

class WikiEntityCache(Base):
    __tablename__ = "wiki_entity_cache"
    __table_args__ = (UniqueConstraint("coach_id", "lang", name="uq_wiki_entity_cache"),)

    id = Column(Integer, primary_key=True, index=True)
    coach_id = Column(String, index=True)
    lang = Column(String, index=True, default="es")
    qid = Column(String, index=True, nullable=True)
    label = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    wikipedia_title = Column(String, nullable=True)
    wikipedia_summary = Column(Text, nullable=True)
    birth_date = Column(String, nullable=True)
    death_date = Column(String, nullable=True)
    image = Column(String, nullable=True)
    wikidata_json = Column(Text, nullable=True)
    extra_json = Column(Text, nullable=True)
    fetched_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    def as_dict(self):
        import json
        def safe_load(value, default):
            if not value:
                return default
            try:
                return json.loads(value)
            except Exception:
                return default
        return {
            "coach_id": self.coach_id,
            "lang": self.lang,
            "qid": self.qid,
            "label": self.label,
            "description": self.description,
            "wikipedia_title": self.wikipedia_title,
            "wikipedia_summary": self.wikipedia_summary,
            "birth_date": self.birth_date,
            "death_date": self.death_date,
            "image": self.image,
            "extra_json": safe_load(self.extra_json, {}),
            "fetched_at": self.fetched_at.isoformat() if self.fetched_at else None,
        }

def ensure_sqlite_columns():
    if not SQLALCHEMY_DATABASE_URL.startswith("sqlite:///"):
        return

    db_path = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "", 1)
    if not os.path.exists(db_path):
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    required_columns = {
        "coach_messages": {
            "game_id": "INTEGER",
            "session_token": "TEXT",
            "interaction_mode": "TEXT DEFAULT 'legacy'",
            "fen_snapshot": "TEXT",
            "move_count": "INTEGER",
            "topic_tags_json": "TEXT DEFAULT '[]'"
        },
        "games": {
            "session_token": "TEXT",
            "opening_family": "TEXT"
        }
    }

    for table_name, columns in required_columns.items():
        cursor.execute(f"PRAGMA table_info({table_name})")
        existing_columns = {row[1] for row in cursor.fetchall()}

        for column_name, column_type in columns.items():
            if column_name in existing_columns:
                continue
            cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")

    conn.commit()
    conn.close()

# Run migrations
Base.metadata.create_all(bind=engine)
ensure_sqlite_columns()
