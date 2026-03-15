
from sqlalchemy.orm import Session
from database import SessionLocal, CoachMessage

def dump_history():
    db = SessionLocal()
    try:
        messages = db.query(CoachMessage).order_by(CoachMessage.timestamp.desc()).limit(20).all()
        print("--- Last 20 messages in DB ---")
        for m in messages:
            print(f"ID: {m.id} | Role: {m.role} | Content: {m.content[:100]}...")
    finally:
        db.close()

if __name__ == "__main__":
    dump_history()
