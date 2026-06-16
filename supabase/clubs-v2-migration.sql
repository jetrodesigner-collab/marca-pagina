-- ============================================================
-- marca·página — Clubes v2: capítulos nas metas + tabela de humor
-- Execute no SQL Editor do Supabase (tudo de uma vez)
-- ============================================================

-- 1. Adicionar capítulos à tabela club_metas
-- ============================================================
ALTER TABLE public.club_metas
  ADD COLUMN IF NOT EXISTS cap_inicio integer,
  ADD COLUMN IF NOT EXISTS cap_fim integer;

-- 2. Criar tabela de humor do grupo (um humor por usuário por clube)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.club_moods (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id    uuid REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  meta_id    uuid REFERENCES public.club_metas(id) ON DELETE SET NULL,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mood       text NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(club_id, user_id)
);

ALTER TABLE public.club_moods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "club_moods: select"
  ON public.club_moods FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.get_my_club_ids()));

CREATE POLICY "club_moods: insert"
  ON public.club_moods FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "club_moods: update"
  ON public.club_moods FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "club_moods: delete"
  ON public.club_moods FOR DELETE TO authenticated
  USING (user_id = auth.uid());
