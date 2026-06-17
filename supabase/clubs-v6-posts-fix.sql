-- ============================================================
-- marca·página — Clubes v6: fix definitivo para club_posts
-- Execute manualmente no SQL Editor do Supabase (tudo de uma vez)
-- ============================================================

-- 1. Garantir função get_my_club_ids() (idempotente)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_club_ids()
  RETURNS SETOF uuid
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$
  SELECT club_id FROM public.club_members WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_club_ids() TO authenticated;

-- 2. Garantir coluna criado_em em club_posts (caso a tabela use outro nome)
-- ============================================================
ALTER TABLE public.club_posts
  ADD COLUMN IF NOT EXISTS criado_em timestamptz DEFAULT now() NOT NULL;

-- 3. club_posts: recriar RLS do zero
-- ============================================================
ALTER TABLE public.club_posts ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'club_posts' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.club_posts', pol.policyname);
  END LOOP;
END$$;

CREATE POLICY "club_posts: select"
  ON public.club_posts FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.get_my_club_ids()));

CREATE POLICY "club_posts: insert"
  ON public.club_posts FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND club_id IN (SELECT public.get_my_club_ids())
  );

CREATE POLICY "club_posts: update"
  ON public.club_posts FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "club_posts: delete"
  ON public.club_posts FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR club_id IN (
      SELECT club_id FROM public.club_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'ativo'
    )
  );

-- 4. club_post_likes: recriar RLS do zero
-- ============================================================
ALTER TABLE public.club_post_likes ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'club_post_likes' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.club_post_likes', pol.policyname);
  END LOOP;
END$$;

CREATE POLICY "club_post_likes: select"
  ON public.club_post_likes FOR SELECT TO authenticated
  USING (
    post_id IN (
      SELECT id FROM public.club_posts
      WHERE club_id IN (SELECT public.get_my_club_ids())
    )
  );

CREATE POLICY "club_post_likes: insert"
  ON public.club_post_likes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND post_id IN (
      SELECT id FROM public.club_posts
      WHERE club_id IN (SELECT public.get_my_club_ids())
    )
  );

CREATE POLICY "club_post_likes: delete"
  ON public.club_post_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 5. Habilitar Realtime para club_posts (necessário para atualizações ao vivo)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'club_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.club_posts;
  END IF;
END$$;

-- 6. Verificação diagnóstica: confirmar que tudo está correto
-- ============================================================
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'club_posts'
ORDER BY cmd;
