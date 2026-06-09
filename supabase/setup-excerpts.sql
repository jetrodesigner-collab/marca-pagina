-- ============================================================
-- marca·página — Fase 8: tabela excerpts (trechos) + RLS
-- Cole e execute no SQL Editor do Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS public.excerpts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id     UUID        NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  page_number INT,
  is_public   BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.excerpts ENABLE ROW LEVEL SECURITY;

-- Leitura: dono vê todos os seus; outros só veem os públicos
DROP POLICY IF EXISTS "excerpts: leitura autenticada" ON public.excerpts;
CREATE POLICY "excerpts: leitura autenticada"
  ON public.excerpts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_public = true);

DROP POLICY IF EXISTS "excerpts: inserção própria" ON public.excerpts;
CREATE POLICY "excerpts: inserção própria"
  ON public.excerpts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "excerpts: edição própria" ON public.excerpts;
CREATE POLICY "excerpts: edição própria"
  ON public.excerpts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "excerpts: deleção própria" ON public.excerpts;
CREATE POLICY "excerpts: deleção própria"
  ON public.excerpts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
