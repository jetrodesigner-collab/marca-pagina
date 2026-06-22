-- ============================================================
-- marca·página — Clubes v16: Palpites e Apostas por Ciclo
-- Execute no SQL Editor do Supabase (tudo de uma vez)
-- Seguro para rodar mesmo que clubs-v8-features.sql já tenha sido executado.
-- ============================================================

-- 1. Garante que meta_id existe em club_predictions
-- (já criado no v8 com CREATE TABLE; este ADD COLUMN é no-op se a coluna já existir)
ALTER TABLE public.club_predictions
  ADD COLUMN IF NOT EXISTS meta_id uuid REFERENCES public.club_metas(id) ON DELETE SET NULL;

-- 2. Garante que meta_id existe em club_page_bets
ALTER TABLE public.club_page_bets
  ADD COLUMN IF NOT EXISTS meta_id uuid REFERENCES public.club_metas(id) ON DELETE SET NULL;

-- 3. Adiciona final_pages em club_page_bets para guardar as páginas reais no encerramento do ciclo
ALTER TABLE public.club_page_bets
  ADD COLUMN IF NOT EXISTS final_pages integer;

-- 4. Constraint de unicidade: 1 palpite por membro por ciclo
-- Usa bloco DO para ser idempotente (não falha se já existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'club_predictions_unique_per_meta'
  ) THEN
    ALTER TABLE public.club_predictions
      ADD CONSTRAINT club_predictions_unique_per_meta
      UNIQUE (club_id, meta_id, user_id);
  END IF;
END $$;
