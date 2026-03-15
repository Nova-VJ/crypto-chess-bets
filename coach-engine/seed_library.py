import sqlite3
import json
import os

db_path = os.path.join(os.path.dirname(__file__), 'coach.db')

BOOKS_DATA = [
    # Aron Nimzowitsch
    {
        "title": "My System",
        "author": "Aron Nimzowitsch",
        "license_type": "Fair Use / Concepts",
        "units": [
            {"concept_name": "Prophylaxis", "phase": "Middlegame", "explanation": "Anticipating and preventing the opponent's tactical and strategic threats before they can execute them.", "triggers": ["opponent_initiative", "solidifying_position"], "anti_patterns": ["ignoring_opponent_plans", "reckless_attack"]},
            {"concept_name": "Overprotection", "phase": "Middlegame", "explanation": "Defending a strategically important point (like a central square) more times than it is attacked, giving freedom to the defending pieces.", "triggers": ["central_control", "static_advantage"], "anti_patterns": ["weak_center"]}
        ]
    },
    # José Raúl Capablanca
    {
        "title": "Chess Fundamentals",
        "author": "José Raúl Capablanca",
        "license_type": "Public Domain / Concepts",
        "units": [
            {"concept_name": "Simplification", "phase": "Endgame", "explanation": "When ahead in material, simplify the position by trading pieces (not pawns) to reach a clear winning endgame.", "triggers": ["material_advantage"], "anti_patterns": ["complicating_won_positions"]},
            {"concept_name": "Pawn Structure Integrity", "phase": "Middlegame", "explanation": "Avoid creating unnecessary weaknesses in your pawn structure (doubled, isolated, backward pawns) as they become targets in the endgame.", "triggers": ["pawn_moves", "exchanges"], "anti_patterns": ["creating_weaknesses"]}
        ]
    },
    # Bobby Fischer
    {
        "title": "My 60 Memorable Games",
        "author": "Bobby Fischer",
        "license_type": "Fair Use / Concepts",
        "units": [
            {"concept_name": "The Initiative", "phase": "Opening/Middlegame", "explanation": "Seizing the initiative is more important than small material gains. Attack relentlessly and force the opponent to react.", "triggers": ["dynamic_positions", "sacrifices"], "anti_patterns": ["passive_defense"]},
            {"concept_name": "Bishop Pair", "phase": "Middlegame", "explanation": "The two bishops are a powerful long-term advantage in open positions. Preserve them and open the center.", "triggers": ["open_positions", "bishop_pair"], "anti_patterns": ["trading_bishop_for_knight_unnecessarily"]}
        ]
    },
    # Jeremy Silman
    {
        "title": "How to Reassess Your Chess",
        "author": "Jeremy Silman",
        "license_type": "Fair Use / Concepts",
        "units": [
            {"concept_name": "Imbalances", "phase": "Middlegame", "explanation": "Evaluate the position based on imbalances (minor pieces, pawn structure, space, material, initiative) and create a plan based on them.", "triggers": ["position_evaluation", "planning"], "anti_patterns": ["playing_without_a_plan"]},
            {"concept_name": "Improving the Worst Piece", "phase": "Middlegame", "explanation": "Identify your worst placed piece and find a way to improve its position and activity.", "triggers": ["maneuvering", "closed_positions"], "anti_patterns": ["ignoring_passive_pieces"]}
        ]
    },
    {
        "title": "The Amateur's Mind",
        "author": "Jeremy Silman",
        "license_type": "Fair Use / Concepts",
        "units": [
            {"concept_name": "Psychological Weaknesses", "phase": "All", "explanation": "Recognizing common amateur mistakes like 'hope chess' (playing a move hoping the opponent misses the threat) or material greed.", "triggers": ["blunders", "missed_tactics"], "anti_patterns": ["hope_chess", "materialism"]}
        ]
    },
    # Garry Kasparov
    {
        "title": "My Great Predecessors",
        "author": "Garry Kasparov",
        "license_type": "Fair Use / Concepts",
        "units": [
            {"concept_name": "Dynamic Play", "phase": "Middlegame", "explanation": "Creating constant problems for the opponent through active piece play, sacrifices, and deep calculation.", "triggers": ["complex_positions", "attacking_opportunities"], "anti_patterns": ["playing_too_safely"]},
            {"concept_name": "Opening Preparation", "phase": "Opening", "explanation": "Deep theoretical knowledge and finding new ideas (novelties) to gain an advantage from the very beginning.", "triggers": ["opening_phase"], "anti_patterns": ["playing_openings_superficially"]}
        ]
    },
    # Mikhail Tal
    {
        "title": "The Life and Games of Mikhail Tal",
        "author": "Mikhail Tal",
        "license_type": "Fair Use / Concepts",
        "units": [
            {"concept_name": "Intuitive Sacrifices", "phase": "Middlegame", "explanation": "Sacrificing material not for an immediate forced mate, but to create chaos, initiative, and practical problems for the opponent.", "triggers": ["attacking_the_king", "complex_positions"], "anti_patterns": ["calculating_everything_to_mate"]},
            {"concept_name": "Complicating the Position", "phase": "Middlegame", "explanation": "Steering the game into highly irrational and complex positions where intuition and attacking flair prevail over cold logic.", "triggers": ["even_positions", "worse_positions"], "anti_patterns": ["simplifying_when_behind"]}
        ]
    },
    # Magnus Carlsen (Books about him/his style)
    {
        "title": "Endgame Virtuoso Magnus Carlsen",
        "author": "Tibor Karolyi",
        "license_type": "Fair Use / Concepts",
        "units": [
            {"concept_name": "Squeezing Water from a Stone", "phase": "Endgame", "explanation": "Playing on in equal or slightly better endgames, creating constant micro-problems and waiting for the opponent to crack under pressure.", "triggers": ["equal_endgames", "slight_advantage"], "anti_patterns": ["agreeing_to_early_draws"]},
            {"concept_name": "Prophylactic Endgame Play", "phase": "Endgame", "explanation": "Restricting the opponent's counterplay perfectly before executing the winning plan.", "triggers": ["endgame_advantage"], "anti_patterns": ["allowing_unnecessary_counterplay"]}
        ]
    },
    # Alexander Kotov
    {
        "title": "Think Like a Grandmaster",
        "author": "Alexander Kotov",
        "license_type": "Fair Use / Concepts",
        "units": [
            {"concept_name": "Candidate Moves", "phase": "All", "explanation": "Listing all reasonable candidate moves before calculating any variations deeply to avoid missing strong options.", "triggers": ["critical_positions", "tactical_opportunities"], "anti_patterns": ["playing_the_first_move_that_looks_good"]}
        ]
    },
    # Jonathan Rowson
    {
        "title": "The Seven Deadly Chess Sins",
        "author": "Jonathan Rowson",
        "license_type": "Fair Use / Concepts",
        "units": [
            {"concept_name": "Blinking (Missing Threats)", "phase": "All", "explanation": "Failing to see the opponent's ideas due to focusing entirely on one's own plans.", "triggers": ["blunders", "tactical_oversight"], "anti_patterns": ["tunnel_vision"]}
        ]
    }
    # More books will be added here to reach 20+ coverage
]

def seed_database():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("Seeding The Grand Library...")

    for book in BOOKS_DATA:
        # Check if book exists
        cursor.execute("SELECT id FROM knowledge_sources WHERE title = ?", (book["title"],))
        result = cursor.fetchone()
        
        if result:
            source_id = result[0]
            print(f"Book '{book['title']}' already exists. Skipping insertion.")
        else:
            cursor.execute(
                "INSERT INTO knowledge_sources (title, author, license_type) VALUES (?, ?, ?)",
                (book["title"], book["author"], book["license_type"])
            )
            source_id = cursor.lastrowid
            print(f"Inserted book: {book['title']}")

            # Insert units
            for unit in book["units"]:
                cursor.execute(
                    '''INSERT INTO knowledge_units 
                       (source_id, concept_name, phase, explanation, triggers, anti_patterns, example_fen, recommended_drill) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                    (
                        source_id,
                        unit["concept_name"],
                        unit["phase"],
                        unit["explanation"],
                        json.dumps(unit["triggers"]),
                        json.dumps(unit["anti_patterns"]),
                        unit.get("example_fen", ""),
                        unit.get("recommended_drill", "")
                    )
                )

    conn.commit()
    conn.close()
    print("Database seeding completed.")

if __name__ == "__main__":
    seed_database()
