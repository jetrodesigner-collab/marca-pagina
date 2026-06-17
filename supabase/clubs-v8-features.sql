-- ============================================================
-- marca·página — Clubes v8: Palpites Secretos + Apostas de Páginas
-- Execute no SQL Editor do Supabase (tudo de uma vez)
-- ============================================================

-- 1. Tabela club_predictions (Palpites Secretos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.club_predictions (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id    uuid        REFERENCES public.clubs(id)      ON DELETE CASCADE NOT NULL,
  meta_id    uuid        REFERENCES public.club_metas(id) ON DELETE SET NULL,
  user_id    uuid        REFERENCES auth.users(id)        ON DELETE CASCADE NOT NULL,
  content    text        NOT NULL,
  revealed   boolean     NOT NULL DEFAULT false,
  correct    boolean,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.club_predictions ENABLE ROW LEVEL SECURITY;

-- Membros do clube podem ver os palpites
CREATE POLICY "predictions: select"
  ON public.club_predictions FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.get_my_club_ids()));

-- Membros inserem apenas seu próprio palpite
CREATE POLICY "predictions: insert"
  ON public.club_predictions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND club_id IN (SELECT public.get_my_club_ids())
  );

-- Dono pode editar o próprio; admin pode revelar/marcar correto
CREATE POLICY "predictions: update"
  ON public.club_predictions FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR club_id IN (
      SELECT club_id FROM public.club_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'ativo'
    )
  );

-- Dono pode apagar o próprio palpite
CREATE POLICY "predictions: delete"
  ON public.club_predictions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 2. Tabela club_page_bets (Apostas de Páginas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.club_page_bets (
  id            uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id       uuid    REFERENCES public.clubs(id)      ON DELETE CASCADE NOT NULL,
  meta_id       uuid    REFERENCES public.club_metas(id) ON DELETE SET NULL,
  user_id       uuid    REFERENCES auth.users(id)        ON DELETE CASCADE NOT NULL,
  bet_pages     integer NOT NULL,          -- página que o membro se compromete a atingir
  fulfilled     boolean,                   -- preenchido quando a meta encerra
  created_at    timestamptz DEFAULT now() NOT NULL,
  UNIQUE(club_id, meta_id, user_id)
);

ALTER TABLE public.club_page_bets ENABLE ROW LEVEL SECURITY;

-- Membros do clube podem ver as apostas
CREATE POLICY "page_bets: select"
  ON public.club_page_bets FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.get_my_club_ids()));

-- Membros inserem apenas a própria aposta
CREATE POLICY "page_bets: insert"
  ON public.club_page_bets FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND club_id IN (SELECT public.get_my_club_ids())
  );

-- Dono pode atualizar (e admin pode marcar fulfilled)
CREATE POLICY "page_bets: update"
  ON public.club_page_bets FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR club_id IN (
      SELECT club_id FROM public.club_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'ativo'
    )
  );

-- Dono pode apagar a própria aposta
CREATE POLICY "page_bets: delete"
  ON public.club_page_bets FOR DELETE TO authenticated
  USING (user_id = auth.uid());
