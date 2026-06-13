-- ============================================================
-- marca·página — Corrige FK items.created_by para não bloquear
-- a exclusão de conta (delete_my_account) quando o usuário tiver
-- cadastrado itens manualmente (S9/S10).
-- Cole e execute no SQL Editor do Supabase
-- ============================================================

ALTER TABLE public.items
  DROP CONSTRAINT items_created_by_fkey,
  ADD CONSTRAINT items_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
