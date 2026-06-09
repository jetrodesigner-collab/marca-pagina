-- ============================================================
-- marca·página — Fase 7: rating em user_items + tabela reviews
-- Cole e execute no SQL Editor do Supabase
-- ============================================================

-- 1. Coluna rating em user_items (1–5 estrelas, opcional)
-- ============================================================
ALTER TABLE public.user_items
  ADD COLUMN IF NOT EXISTS rating INT CHECK (rating BETWEEN 1 AND 5);

-- 2. Tabela reviews (resenha pessoal por item)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id     UUID        NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  body        TEXT,
  is_public   BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Leitura: dono vê tudo; outros só veem públicas
CREATE POLICY "reviews: leitura autenticada"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "reviews: inserção própria"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews: edição própria"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews: deleção própria"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
