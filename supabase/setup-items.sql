-- ============================================================
-- marca·página — Fase 6: tabelas items + user_items
-- Cole e execute no SQL Editor do Supabase
-- ============================================================

-- 1. Tabela items (catálogo compartilhado de livros e filmes)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT        NOT NULL CHECK (type IN ('book', 'movie')),
  api_id      TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  author      TEXT,
  director    TEXT,
  year        INT,
  cover_url   TEXT,
  api_source  TEXT        NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(type, api_id)
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ler o catálogo
CREATE POLICY "items: leitura autenticada"
  ON public.items FOR SELECT
  TO authenticated
  USING (true);

-- Qualquer usuário autenticado pode inserir itens (via busca)
CREATE POLICY "items: inserção autenticada"
  ON public.items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 2. Tabela user_items (biblioteca pessoal de cada usuário)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id     UUID        NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  status      TEXT        NOT NULL CHECK (status IN (
    'reading', 'read', 'want_to_read',
    'watching', 'watched', 'want_to_watch'
  )),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_items: leitura própria"
  ON public.user_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_items: inserção própria"
  ON public.user_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_items: edição própria"
  ON public.user_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_items: deleção própria"
  ON public.user_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
