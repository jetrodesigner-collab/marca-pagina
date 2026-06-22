-- ============================================================
-- marca·página — Clubes v14: corrigir RLS de leitura de club_moods
-- Problema: a policy SELECT original usa get_my_club_ids(), que só
--   verifica club_members.user_id = auth.uid() — não cobre o criador
--   do clube caso ele não esteja na tabela club_members (edge case).
-- Solução: trocar para is_club_member() (definida em clubs-v11-rls-fix.sql)
--   que cobre tanto club_members quanto clubs.criador_id.
-- Execute no SQL Editor do Supabase (tudo de uma vez)
-- ============================================================

DROP POLICY IF EXISTS "club_moods: select" ON public.club_moods;

CREATE POLICY "club_moods: select"
  ON public.club_moods FOR SELECT TO authenticated
  USING (is_club_member(club_id));
