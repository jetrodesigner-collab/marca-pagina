-- ============================================================
-- marca·página — Clubes v5: garantir RLS completo para posts,
-- trechos (club_posts tipo='trecho') e progresso (club_members)
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

-- 2. club_members: garantir RLS e policies de update
-- ============================================================
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'club_members' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.club_members', pol.policyname);
  END LOOP;
END$$;

CREATE POLICY "club_members: select"
  ON public.club_members FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.get_my_club_ids()));

CREATE POLICY "club_members: insert"
  ON public.club_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE inclui WITH CHECK para garantir que o user_id não mude
CREATE POLICY "club_members: update"
  ON public.club_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "club_members: delete"
  ON public.club_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 3. club_posts: garantir RLS e policies de insert/select
-- (cobre posts de comentário, progresso E trechos — todos são club_posts)
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

-- 4. club_post_likes: garantir RLS e policies
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

-- 5. club_badges: garantir RLS e policies
-- ============================================================
ALTER TABLE public.club_badges ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'club_badges' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.club_badges', pol.policyname);
  END LOOP;
END$$;

CREATE POLICY "club_badges: select"
  ON public.club_badges FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.get_my_club_ids()));

CREATE POLICY "club_badges: insert"
  ON public.club_badges FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND club_id IN (SELECT public.get_my_club_ids())
  );

CREATE POLICY "club_badges: delete"
  ON public.club_badges FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 6. club_moods: garantir RLS (caso v2 não tenha sido executado)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'club_moods') THEN
    ALTER TABLE public.club_moods ENABLE ROW LEVEL SECURITY;
  END IF;
END$$;
