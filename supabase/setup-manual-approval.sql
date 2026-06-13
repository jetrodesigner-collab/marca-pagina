-- ============================================================
-- marca·página — Aprovação de livros manuais + painel admin
-- Cole e execute no SQL Editor do Supabase
-- ============================================================
--
-- NOTA (correções em relação ao rascunho original):
-- - A tabela items usa a coluna `created_by` (não `user_id`) para
--   identificar quem subiu um item manual. Itens normais (Open
--   Library / Google Books / TMDB) têm created_by = NULL e
--   is_manual = false.
-- - As policies antigas "items: leitura autenticada" (USING true) e
--   "items: inserção autenticada" (WITH CHECK true) precisam ser
--   removidas, senão elas continuam liberando tudo em paralelo às
--   novas regras (policies permissivas são combinadas com OR).
-- - Foram adicionadas duas policies extras (items_select_admin e
--   items_delete_admin), sem as quais o painel admin não conseguiria
--   ver nem apagar itens pending/rejected/approved de outros usuários.
-- ============================================================

-- 1. Coluna status em items
--    'approved' = padrão (livros normais + manuais já aprovados)
--    'pending'  = livro manual recém enviado, aguardando aprovação
--    'rejected' = admin rejeitou
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('approved', 'pending', 'rejected'));

-- Itens manuais já existentes voltam para 'pending' (revisão retroativa)
UPDATE public.items SET status = 'pending' WHERE is_manual = true AND status = 'approved';

-- 2. Tabela admins (apenas o user_id do Jetro)
CREATE TABLE IF NOT EXISTS public.admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_select" ON public.admins;
CREATE POLICY "admins_select" ON public.admins
  FOR SELECT TO authenticated USING (true);

-- 3. RLS em items
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Remove as policies antigas, mais permissivas
DROP POLICY IF EXISTS "items: leitura autenticada" ON public.items;
DROP POLICY IF EXISTS "items: inserção autenticada" ON public.items;

-- SELECT: dono vê seus próprios itens (qualquer status) + itens aprovados de qualquer um
DROP POLICY IF EXISTS "items_select" ON public.items;
CREATE POLICY "items_select" ON public.items
  FOR SELECT TO authenticated USING (
    created_by = auth.uid() OR status = 'approved'
  );

-- SELECT (admin): vê todos os itens, inclusive pending/rejected de outros usuários
DROP POLICY IF EXISTS "items_select_admin" ON public.items;
CREATE POLICY "items_select_admin" ON public.items
  FOR SELECT TO authenticated USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- INSERT: itens normais do catálogo (created_by IS NULL, is_manual = false,
-- vindos das APIs) OU itens manuais com created_by = auth.uid()
DROP POLICY IF EXISTS "items_insert" ON public.items;
CREATE POLICY "items_insert" ON public.items
  FOR INSERT TO authenticated WITH CHECK (
    created_by = auth.uid()
    OR (created_by IS NULL AND is_manual = false)
  );

-- DELETE: usuário deleta apenas seus próprios itens manuais
DROP POLICY IF EXISTS "items_delete" ON public.items;
CREATE POLICY "items_delete" ON public.items
  FOR DELETE TO authenticated USING (
    created_by = auth.uid() AND is_manual = true
  );

-- DELETE (admin): apaga qualquer item manual (aprovado ou rejeitado)
DROP POLICY IF EXISTS "items_delete_admin" ON public.items;
CREATE POLICY "items_delete_admin" ON public.items
  FOR DELETE TO authenticated USING (
    is_manual = true AND auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- UPDATE (admin): aprovar/rejeitar qualquer item
DROP POLICY IF EXISTS "items_update_admin" ON public.items;
CREATE POLICY "items_update_admin" ON public.items
  FOR UPDATE TO authenticated USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );

-- ============================================================
-- Depois de executar tudo acima, descubra seu user_id em:
-- Supabase → Authentication → Users → jetrodesigner@gmail.com
-- e rode (substituindo o UUID abaixo):
--
-- INSERT INTO public.admins (user_id) VALUES ('<SEU_USER_ID>');
-- ============================================================
