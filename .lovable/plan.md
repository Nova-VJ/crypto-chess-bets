

# Plan: Insights Page + Master Games Seeding + Edge Function Verification + Synergy Improvements

## 1. Create Insights Page (`src/pages/Insights.tsx`)

New page at `/insights` showing:
- **Win/Loss/Draw pie chart** (using recharts, already in dependencies)
- **Rating progression line chart** over time
- **Top openings distribution** bar chart
- **Per-coach stats breakdown** (games, win rate per master)
- **Memory profiles** summary (strengths/weaknesses detected by coaches)

Data source: `invokeCoachInsights({ user_id })` from `coachApi.ts` (already wired).

Add route in `App.tsx`: `<Route path="/insights" element={<Insights />} />`

## 2. Add Foreign Keys to `games` Table

The `Play.tsx` query joins `profiles` via `games_white_user_id_fkey` and `games_black_user_id_fkey`, but the `games` table has **no foreign keys** to `profiles`. This causes the profile data (avatars, names, ratings) to silently fail to load.

**Migration**: Add foreign keys:
```sql
ALTER TABLE games ADD CONSTRAINT games_white_user_id_fkey FOREIGN KEY (white_user_id) REFERENCES profiles(id);
ALTER TABLE games ADD CONSTRAINT games_black_user_id_fkey FOREIGN KEY (black_user_id) REFERENCES profiles(id);
ALTER TABLE games ADD CONSTRAINT games_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES profiles(id);
ALTER TABLE games ADD CONSTRAINT games_opponent_id_fkey FOREIGN KEY (opponent_id) REFERENCES profiles(id);
```

This fixes the profile join in `Play.tsx` so avatars, names, and ratings display correctly for both players.

## 3. Seed `master_games` with Real Historical Games

Create an edge function `seed-master-games` that populates the `master_games` table with curated sample games from each master (10-15 games each from famous tournaments). The function will insert structured PGN data with openings, ECO codes, and FEN lists. This enriches coach references when `chess-chat` looks for historical examples.

Alternative: Use a migration INSERT to seed ~50 iconic games directly (more reliable, no runtime dependency).

**Approach chosen**: SQL migration with INSERT statements for ~50 curated master games (10 per master) with real PGN, ECO, and opening data.

## 4. Integrate Agent Skills into Edge Functions

The `.agents/skills/` directory has three skills that define behavior:
- `deep-memory-retrieval`: Cross-reference past errors in current coaching
- `historical-persona-chat`: Persona voice authenticity
- `match-play-execution`: Style-based move selection

**Current status**: `chess-chat` already implements `historical-persona-chat` (full persona prompts with book references) and `deep-memory-retrieval` (fetches full conversation + game history). `chess-move` implements `match-play-execution` (persona-based move style selection).

**Gap**: `chess-chat` doesn't query `coach_memory_profiles` for structured strengths/weaknesses, and doesn't query `master_games` for position-relevant historical references. The `chess-evaluate` function doesn't update `coach_memory_profiles` after analysis.

**Fix**:
- Enhance `chess-chat` to fetch from `coach_memory_profiles` (strengths/weaknesses) and include in system prompt
- Enhance `chess-evaluate` to upsert `coach_memory_profiles` after evaluation (update strengths/weaknesses based on analysis)

## 5. Fix Rankings Page

Currently hardcoded with fake data. Wire it to query `profiles` table ordered by rating, showing real players.

## 6. Fix `game_messages` Realtime

`game_messages` table is not in the realtime publication. Add it so the chat channel subscription in `Play.tsx` actually works.

**Migration**: `ALTER PUBLICATION supabase_realtime ADD TABLE public.game_messages;`

Also ensure `games` is in realtime publication for move sync.

## Files to Create/Modify

**Create:**
- `src/pages/Insights.tsx` — Full insights dashboard with charts
- 1 SQL migration — FK constraints, realtime, master games seed data

**Modify:**
- `src/App.tsx` — Add `/insights` route
- `supabase/functions/chess-chat/index.ts` — Add `coach_memory_profiles` fetch to enrich context
- `supabase/functions/chess-evaluate/index.ts` — Upsert `coach_memory_profiles` after evaluation
- `src/pages/Rankings.tsx` — Wire to real profile data
- `src/components/BottomNav.tsx` or navigation — Add insights link

## Summary of What Already Works

- `AcceptanceModal` correctly copies `contract_game_id`, `payment_method`, `currency`
- `Play.tsx` has full settlement logic (web3 + internal)
- Chat in `Play.tsx` is implemented with realtime subscription, emojis, and message display
- Move persistence with `moves` jsonb array works
- `settleGameOnChain` is fully implemented in `contract.ts`
- `chess-chat` has rich persona prompts with book references and full memory
- `chess-move` has persona-styled move generation
- All 4 edge functions exist (`coach-health`, `coach-history`, `coach-insights`, `coach-master-profile`)

## What This Plan Fixes

1. Missing FK constraints → avatars/names don't load in Play
2. No insights page → users can't see their stats
3. Empty `master_games` table → coach can't reference real games
4. Agent skills not fully connected → memory profiles not used in chat
5. Rankings page is fake → shows hardcoded data
6. Realtime not enabled for `game_messages` → chat may not sync

