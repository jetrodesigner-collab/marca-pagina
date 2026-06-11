-- ============================================================
-- marca·página — S2 Livros: tabelas collections + collection_items + RLS
-- Cole e execute no SQL Editor do Supabase
-- ============================================================

-- 1. Coleções (sub-caixas dentro de cada categoria)
CREATE TABLE IF NOT EXISTS public.collections (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL DEFAULT 'Minha coleção',
  category    TEXT        NOT NULL CHECK (category IN ('reading','want_to_read','read')),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Livros dentro de cada coleção
CREATE TABLE IF NOT EXISTS public.collection_items (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id   UUID        NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  user_item_id    UUID        NOT NULL REFERENCES public.user_items(id) ON DELETE CASCADE,
  added_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (collection_id, user_item_id)
);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collections: dono gerencia" ON public.collections;
CREATE POLICY "collections: dono gerencia"
  ON public.collections FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collection_items: dono gerencia" ON public.collection_items;
CREATE POLICY "collection_items: dono gerencia"
  ON public.collection_items FOR ALL
  TO authenticated
  USING (
    auth.uid() = (SELECT user_id FROM public.collections WHERE id = collection_items.collection_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.collections WHERE id = collection_items.collection_id)
  );
