from database import SessionLocal, KnowledgeSource
import database

# The 20 Canonical Books requested by the user
CANONICAL_BOOKS = [
    {"title": "My System", "author": "Aron Nimzowitsch"},
    {"title": "Chess Fundamentals", "author": "José Raúl Capablanca"},
    {"title": "Zurich International Chess Tournament, 1953", "author": "David Bronstein"},
    {"title": "My 60 Memorable Games", "author": "Bobby Fischer"},
    {"title": "Bobby Fischer Teaches Chess", "author": "Fischer / Margulies / Mosenfelder"},
    {"title": "How to Reassess Your Chess", "author": "Jeremy Silman"},
    {"title": "The Amateur’s Mind", "author": "Jeremy Silman"},
    {"title": "Understanding Chess Move by Move", "author": "John Nunn"},
    {"title": "Think Like a Grandmaster", "author": "Alexander Kotov"},
    {"title": "Pawn Structure Chess", "author": "Andrew Soltis"},
    {"title": "Dvoretsky’s Endgame Manual", "author": "Mark Dvoretsky"},
    {"title": "Silman’s Complete Endgame Course", "author": "Jeremy Silman"},
    {"title": "100 Endgames You Must Know", "author": "Jesús de la Villa"},
    {"title": "Fundamental Chess Endings", "author": "Müller / Lamprecht"},
    {"title": "Practical Chess Exercises", "author": "Ray Cheng"},
    {"title": "The Life and Games of Mikhail Tal", "author": "Mikhail Tal"},
    {"title": "Tal-Botvinnik 1960", "author": "Mikhail Tal"},
    {"title": "My Great Predecessors", "author": "Garry Kasparov"},
    {"title": "Soviet Chess Primer", "author": "Ilya Maizelis"},
    {"title": "The Seven Deadly Chess Sins", "author": "Jonathan Rowson"},
]

def seed_database():
    db = SessionLocal()
    try:
        existing_count = db.query(KnowledgeSource).count()
        if existing_count == 0:
            print("Seeding 20 canonical books into KnowledgeBase...")
            for book in CANONICAL_BOOKS:
                source = KnowledgeSource(
                    title=book["title"],
                    author=book["author"],
                    license_type="standard_reference" 
                )
                db.add(source)
            db.commit()
            print("Successfully seeded 20 books.")
        else:
            print(f"Database already contains {existing_count} sources. Skipping seed.")
    except Exception as e:
        print(f"Error seeding DB: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
