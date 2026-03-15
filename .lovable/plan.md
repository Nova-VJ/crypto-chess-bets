

## Plan: Persistent Conversation & Game History System

### What This Does

Create two new database tables to persist all coach conversations and historical game results. Wire them into the edge functions and frontend so that:
1. Every message sent/received in HistoricalPlay and AICoach is saved to the database
2. Every game played against a master is saved with result, PGN, rating, etc.
3. The Profile page loads history from the database instead of the dead Python API
4. The Coach AI (`chess-chat`) receives full conversation history + past game summaries as context
5. Filters in Profile work for each master individually and for "Coach AI" (general)

---

### Step 1: DB Migration — Two New Tables

**`coach_conversations`** — stores every chat message:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | references profiles(id) |
| coach_id | text | fischer, tal, general, etc. |
| session_token | text | groups messages in a session |
| role | text | 'user' or 'coach' |
| content | text | message text |
| interaction_mode | text | in_game, coach_room, auto_commentary |
| fen_snapshot | text | nullable, board state |
| move_count | integer | nullable |
| game_session_id | uuid | nullable, links to coach_game_history |
| created_at | timestamptz | |

RLS: Users can SELECT/INSERT their own rows.

**`coach_game_history`** — stores games played against masters:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | references profiles(id) |
| coach_id | text | fischer, tal, etc. |
| session_token | text | |
| result | text | 1-0, 0-1, 1/2-1/2 |
| user_color | text | w or b |
| pgn | text | full PGN |
| opening | text | nullable |
| time_control | integer | |
| rating | integer | nullable, evaluation score |
| review | text | nullable, AI review |
| created_at | timestamptz | |

RLS: Users can SELECT/INSERT their own rows.

Enable realtime on `coach_conversations` for live chat persistence.

### Step 2: Update `chess-chat` Edge Function

- Accept optional `user_id` param
- When `user_id` is provided, query last 20 messages from `coach_conversations` for this user+coach pair and include them as conversation history in the AI request (instead of sending only the current message)
- Query `coach_game_history` for last 10 games summary (result, opening, date) and append as context so the coach "remembers" past games
- Save both the user message and coach reply to `coach_conversations` after generating the response
- For the `general` coach: query ALL coach conversations and ALL game history across all coaches to give it full context

### Step 3: Update `HistoricalPlay.tsx`

- On game start: create a `coach_game_history` row with status pending
- On each chat message: save to `coach_conversations` via the edge function (it handles persistence)
- On game end: update `coach_game_history` with result, PGN, opening
- Pass `user_id` to `invokeChessChat` so the edge function can load history

### Step 4: Update `AICoach.tsx`

- On mount: load past conversation history from `coach_conversations` for the selected coach
- On coach switch: load that coach's conversation history
- Pass `user_id` to chat calls
- For `general` coach: load recent conversations from all coaches as context

### Step 5: Update `Profile.tsx`

- Replace the dead Python API calls (`/api/history`, `/api/history/sessions`) with direct database queries to `coach_game_history` and `coach_conversations`
- `loadHistory`: query both tables, group conversations by session_token, merge with game results
- `openHistorySession`: load messages from `coach_conversations` filtered by session_token
- Filters work by querying `coach_id` column
- Remove the `API_URL` / `coachApiUrl` dependency entirely

### Step 6: Update `coachApi.ts`

- Add `user_id` as optional param to `invokeChessChat`

---

### Files Changed

| # | What | File |
|---|------|------|
| 1 | Create tables + RLS | DB migration |
| 2 | Load history context + persist messages | `supabase/functions/chess-chat/index.ts` |
| 3 | Save games + pass user_id | `src/pages/HistoricalPlay.tsx` |
| 4 | Load history on mount + pass user_id | `src/components/AICoach.tsx` |
| 5 | Query DB instead of Python API | `src/pages/Profile.tsx` |
| 6 | Add user_id param | `src/lib/coachApi.ts` |

