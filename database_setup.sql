-- Tabla de perfiles con balance interno
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  balance DECIMAL(18, 8) NOT NULL DEFAULT 0,
  total_deposited DECIMAL(18, 8) NOT NULL DEFAULT 0,
  total_withdrawn DECIMAL(18, 8) NOT NULL DEFAULT 0,
  wallet_address TEXT,
  preferred_wallet TEXT,
  games_played INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0,
  rating INTEGER NOT NULL DEFAULT 1200,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Tabla de transacciones (depósitos/retiros)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'game_stake', 'game_win', 'game_refund')),
  amount DECIMAL(18, 8) NOT NULL,
  tx_hash TEXT,
  wallet_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
ON public.transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
ON public.transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Tabla de partidas
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id),
  opponent_id UUID REFERENCES public.profiles(id),
  stake_amount DECIMAL(18, 8) NOT NULL,
  time_control INTEGER NOT NULL DEFAULT 600,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'pending_payments', 'active', 'completed', 'cancelled')),
  creator_paid BOOLEAN NOT NULL DEFAULT false,
  opponent_paid BOOLEAN NOT NULL DEFAULT false,
  winner_id UUID REFERENCES public.profiles(id),
  is_smart_contract BOOLEAN NOT NULL DEFAULT false,
  contract_game_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view games"
ON public.games FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create games"
ON public.games FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Game participants can update"
ON public.games FOR UPDATE
USING (auth.uid() = creator_id OR auth.uid() = opponent_id);

-- Trigger para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime para matchmaking
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
-- Create matchmaking queue table
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stake_amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'BNB',
  time_control integer NOT NULL DEFAULT 600,
  rating integer NOT NULL DEFAULT 1200,
  status text NOT NULL DEFAULT 'searching',
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  matched_at timestamp with time zone,
  game_id uuid REFERENCES public.games(id),
  UNIQUE(user_id, status)
);

ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view queue" ON public.matchmaking_queue
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can join queue" ON public.matchmaking_queue
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queue entry" ON public.matchmaking_queue
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can leave queue" ON public.matchmaking_queue
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add total_won columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_won numeric NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_won_usdt numeric NOT NULL DEFAULT 0;

-- Create friendships table
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- RLS for friendships
CREATE POLICY "Users can view own friendships" ON public.friendships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can send friend requests" ON public.friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update received requests" ON public.friendships FOR UPDATE USING (auth.uid() = friend_id);
CREATE POLICY "Users can delete own friendships" ON public.friendships FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Create game_invites table
CREATE TABLE public.game_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
  stake_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BNB',
  time_control INTEGER NOT NULL DEFAULT 600,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.game_invites ENABLE ROW LEVEL SECURITY;

-- RLS for game_invites
CREATE POLICY "Users can view own invites" ON public.game_invites FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "Users can send invites" ON public.game_invites FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Users can update received invites" ON public.game_invites FOR UPDATE USING (auth.uid() = to_user_id);
CREATE POLICY "Users can delete own invites" ON public.game_invites FOR DELETE USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_invites;
