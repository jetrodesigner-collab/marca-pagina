-- ============================================================
-- marca·página — Pré-Fase 9: tabela reading_progress + RLS
-- Cole e execute no SQL Editor do Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reading_progress (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id      UUID        REFERENCES public.items(id) ON DELETE CASCADE,
  total_pages  INTEGER,
  current_page INTEGER,
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, item_id)
);

ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_all_progress" ON public.reading_progress;
CREATE POLICY "owner_all_progress"
  ON public.reading_progress FOR ALL
  USING (auth.uid() = user_id);
