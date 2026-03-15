

## Plan: Migrate Chess Engine & Coach Chat to Lovable Cloud Edge Functions

### What You Asked

1. **Will configurations be lost?** No. All persona definitions (Fischer, Tal, Capablanca, Carlsen, Kasparov), their histories, books, styles, and personality prompts are hardcoded in the frontend (`HistoricalPlay.tsx` lines 33-93 and `AICoach.tsx` lines 29-36). The SKILL.md files and seed data are reference material only -- the actual app config lives in the React code and will not change.

2. **Can we reconnect the Python/Stockfish motor?** The external Python server (`coach-engine`) running on Render is down and cannot be hosted within Lovable. However, we can fully replace it with Lovable Cloud backend functions powered by Lovable AI (Gemini). The AI will generate chess moves in each master's style AND handle the coach chat. No data or personality will be lost.

---

### Technical Plan

#### Step 1: Enable Lovable AI Gateway
The `LOVABLE_API_KEY` secret is not yet configured. We need to add it so edge functions can call the AI gateway.

#### Step 2: Create Edge Function `chess-move`
- Receives `{ fen, persona, time_control }`
- System prompt instructs the AI to act as a chess engine playing in the style of the given persona
- Uses tool calling to extract a structured `{ move: "e7e5", san: "e5" }` response
- Validates the move format before returning
- Replaces `POST /api/play/move`

#### Step 3: Create Edge Function `chess-chat`  
- Receives `{ message, persona, fen, pgn, session_token, interaction_mode }`
- System prompt uses the persona's `personality` field from the COACHES array
- Returns `{ reply }` in the master's voice
- Replaces `POST /api/chat`

#### Step 4: Create Edge Function `chess-evaluate`
- Receives `{ pgn, result, opponent_id }`
- AI analyzes the game and returns a post-game review with metrics
- Replaces `POST /api/game/evaluate`

#### Step 5: Update `coachApi.ts`
- Replace `fetchCoachApi` to route through `supabase.functions.invoke()` for the three new edge functions
- Remove wake/retry logic (edge functions are always available)
- Keep the same function signatures so `HistoricalPlay.tsx` and `AICoach.tsx` need minimal changes

#### Step 6: Update `HistoricalPlay.tsx` and `AICoach.tsx`
- Replace `fetchCoachApi('/api/play/move', ...)` with the new edge function call
- Replace chat API calls similarly
- Remove "Motor desconectado" state since edge functions are always online
- For `/api/history` and `/api/insights`: return empty arrays for now (historical data was on the Python server's SQLite DB, not recoverable)

#### Step 7: Update `supabase/config.toml`
- Add `[functions.chess-move]`, `[functions.chess-chat]`, `[functions.chess-evaluate]` with `verify_jwt = false`

---

### What stays the same
- All 5 master personas with their personalities, books, styles, and histories
- The SKILL.md files (deep-memory-retrieval, historical-persona-chat, match-play-execution)
- The seed_library.py and seed_knowledge.py reference data
- The chessboard UI, time controls, game flow
- Authentication and profile system

### What changes
- Chess moves come from Lovable AI instead of Stockfish (AI will play convincing chess in each master's style)
- Coach chat goes through edge functions instead of the Python server
- No more "Motor desconectado" errors

### Estimated effort: 4-6 messages

