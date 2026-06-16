-- clubs-v3-migration.sql
-- Adiciona club_id e message na tabela notifications
-- Cria tabela club_pokes para controle de cutucar diário

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS message text;

CREATE TABLE IF NOT EXISTS public.club_pokes (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id    uuid        REFERENCES public.clubs(id)   ON DELETE CASCADE NOT NULL,
  poker_id   uuid        REFERENCES auth.users(id)     ON DELETE CASCADE NOT NULL,
  poked_id   uuid        REFERENCES auth.users(id)     ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()                                    NOT NULL
);

ALTER TABLE public.club_pokes ENABLE ROW LEVEL SECURITY;

-- Membros podem registrar cutucar
CREATE POLICY "Members can insert pokes"
  ON public.club_pokes FOR INSERT
  TO authenticated
  WITH CHECK (
    poker_id = auth.uid()
    AND club_id IN (SELECT get_my_club_ids())
  );

-- Membros só veem os próprios cutucos que enviaram
CREATE POLICY "Members can read own pokes"
  ON public.club_pokes FOR SELECT
  TO authenticated
  USING (poker_id = auth.uid());
