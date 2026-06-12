-- ============================================================
-- marca·página — Fase 9: tabela comments (comentários públicos) + RLS
-- Cole e execute no SQL Editor do Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS public.comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id    UUID        REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode ler
DROP POLICY IF EXISTS "read_all_comments" ON public.comments;
CREATE POLICY "read_all_comments" ON public.comments
  FOR SELECT TO authenticated USING (true);

-- Só o autor pode inserir
DROP POLICY IF EXISTS "insert_own_comment" ON public.comments;
CREATE POLICY "insert_own_comment" ON public.comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Só o autor pode deletar o próprio comentário
DROP POLICY IF EXISTS "delete_own_comment" ON public.comments;
CREATE POLICY "delete_own_comment" ON public.comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
