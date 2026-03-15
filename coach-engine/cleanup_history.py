
from sqlalchemy.orm import Session
from database import SessionLocal, CoachMessage

def cleanup_history():
    db = SessionLocal()
    try:
        # Delete technical prompts that leak into the UI
        print("Cleaning up technical prompts from chat history...")
        deleted = db.query(CoachMessage).filter(
            (CoachMessage.content.like("Analiza la posición (FEN:%")) |
            (CoachMessage.content.like("Error%")) |
            (CoachMessage.content.like("%'candidates'%"))
        ).delete(synchronize_session=False)
        db.commit()
        print(f"Cleanup complete. Deleted {deleted} messages.")
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_history()
