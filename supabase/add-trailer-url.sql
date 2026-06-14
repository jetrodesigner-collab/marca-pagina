-- ============================================================
-- marca·página — Trailer manual para filmes/séries cadastrados pelo usuário
-- Cole e execute no SQL Editor do Supabase
-- ============================================================

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS trailer_url TEXT;
