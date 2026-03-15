-- Fix lobby join flow RLS so an authenticated user can claim a waiting game
-- while still keeping updates restricted to the creator/joiner after claiming.

DROP POLICY IF EXISTS "Participants can update lobby games" ON public.lobby_games;

CREATE POLICY "Authenticated users can join waiting lobby games"
ON public.lobby_games
FOR UPDATE
TO authenticated
USING (
  status = 'waiting'
  AND joiner_user_id IS NULL
  AND auth.uid() IS NOT NULL
  AND auth.uid() <> creator_user_id
)
WITH CHECK (
  joiner_user_id = auth.uid()
  AND creator_user_id <> auth.uid()
);

CREATE POLICY "Participants can update claimed lobby games"
ON public.lobby_games
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    auth.uid() = creator_user_id
    OR auth.uid() = joiner_user_id
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    auth.uid() = creator_user_id
    OR auth.uid() = joiner_user_id
  )
);