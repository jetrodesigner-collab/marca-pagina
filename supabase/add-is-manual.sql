-- marca·página — adiciona coluna is_manual à tabela items
-- Cole e execute no SQL Editor do Supabase

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT false;
