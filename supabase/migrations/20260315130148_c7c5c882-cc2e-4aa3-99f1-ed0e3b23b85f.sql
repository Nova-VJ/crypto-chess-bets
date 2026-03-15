-- 1. Create lobby_games table
CREATE TABLE public.lobby_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joiner_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open',
  time_control_minutes integer NOT NULL DEFAULT 10,
  increment_seconds integer NOT NULL DEFAULT 0,
  mode text NOT NULL DEFAULT 'ranked',
  wager_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BNB',
  contract_game_id text,
  payment_method text NOT NULL DEFAULT 'internal',
  accept_creator boolean NOT NULL DEFAULT false,
  accept_joiner boolean NOT NULL DEFAULT false,
  accept_deadline_at timestamp with time zone,
  creator_rating_snapshot integer,
  creator_games_played_snapshot integer,
  joiner_rating_snapshot integer,
  joiner_games_played_snapshot integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lobby_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lobby games" ON public.lobby_games FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create lobby games" ON public.lobby_games FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_user_id);
CREATE POLICY "Participants can update lobby games" ON public.lobby_games FOR UPDATE USING (auth.uid() = creator_user_id OR auth.uid() = joiner_user_id);
CREATE POLICY "Creator can delete lobby games" ON public.lobby_games FOR DELETE USING (auth.uid() = creator_user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_games;

-- 2. Create game_messages table
CREATE TABLE public.game_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.game_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game participants can view messages" ON public.game_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can send messages" ON public.game_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.game_messages;

-- 3. Alter games table to add missing columns
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS lobby_id uuid REFERENCES public.lobby_games(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fen text DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  ADD COLUMN IF NOT EXISTS white_user_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS black_user_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS white_time_ms integer DEFAULT 600000,
  ADD COLUMN IF NOT EXISTS black_time_ms integer DEFAULT 600000,
  ADD COLUMN IF NOT EXISTS time_control_minutes integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS increment_seconds integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_move_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS pgn text,
  ADD COLUMN IF NOT EXISTS result text,
  ADD COLUMN IF NOT EXISTS winner_user_id uuid REFERENCES public.profiles(id);