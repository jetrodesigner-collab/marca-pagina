-- ============================================================
-- marca·página — Clubes v17: Remoção da tabela club_page_bets
-- Execute no SQL Editor do Supabase (tudo de uma vez)
-- A funcionalidade "Apostas de Página" foi removida da UI.
-- Esta migração remove a tabela e todos os dados associados.
-- ============================================================

DROP TABLE IF EXISTS public.club_page_bets CASCADE;
