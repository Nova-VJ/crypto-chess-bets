import traceback
from sqlalchemy import func, case
from database import SessionLocal, Game

try:
    db = SessionLocal()
    opening_stats = db.query(
        Game.opening,
        func.count(Game.id).label("total"),
        func.sum(case((Game.result == "1-0", 1), else_=0)).label("white_wins"),
        func.sum(case((Game.result == "0-1", 1), else_=0)).label("black_wins")
    ).filter(
        Game.user_id == "test",
        Game.opening != None
    ).group_by(Game.opening).order_by(func.count(Game.id).desc()).limit(3).all()
    print("SUCCESS")
except Exception:
    traceback.print_exc()
