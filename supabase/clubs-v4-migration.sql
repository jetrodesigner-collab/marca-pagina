-- ============================================================
-- marca·página — Clubes v4: fix RLS club_posts, club_post_likes, club_badges
-- Execute manualmente no SQL Editor do Supabase (tudo de uma vez)
-- ============================================================

-- ============================================================
-- 1. club_posts — recriar policies
-- ============================================================
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

ALTER TABLE public.club_posts ENABLE ROW LEVEL SECURITY;

-- Membros do clube podem ver os posts
CREATE POLICY "club_posts: select"
  ON public.club_posts FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.get_my_club_ids()));

-- Membros podem publicar com seu próprio user_id
CREATE POLICY "club_posts: insert"
  ON public.club_posts FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND club_id IN (SELECT public.get_my_club_ids())
  );

-- Autor pode editar o próprio post
CREATE POLICY "club_posts: update"
  ON public.club_posts FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Autor pode apagar o próprio post; admin pode apagar qualquer post do clube
CREATE POLICY "club_posts: delete"
  ON public.club_posts FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR club_id IN (
      SELECT club_id FROM public.club_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'ativo'
    )
  );

-- ============================================================
-- 2. club_post_likes — recriar policies
-- ============================================================
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

ALTER TABLE public.club_post_likes ENABLE ROW LEVEL SECURITY;

-- Membros podem ver curtidas em posts dos seus clubes
CREATE POLICY "club_post_likes: select"
  ON public.club_post_likes FOR SELECT TO authenticated
  USING (
    post_id IN (
      SELECT id FROM public.club_posts
      WHERE club_id IN (SELECT public.get_my_club_ids())
    )
  );

-- Membros podem curtir posts dos seus clubes
CREATE POLICY "club_post_likes: insert"
  ON public.club_post_likes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND post_id IN (
      SELECT id FROM public.club_posts
      WHERE club_id IN (SELECT public.get_my_club_ids())
    )
  );

-- Usuário pode remover a própria curtida
CREATE POLICY "club_post_likes: delete"
  ON public.club_post_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 3. club_badges — recriar policies
-- ============================================================
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

ALTER TABLE public.club_badges ENABLE ROW LEVEL SECURITY;

-- Membros podem ver badges de todos os membros do clube
CREATE POLICY "club_badges: select"
  ON public.club_badges FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.get_my_club_ids()));

-- Membros podem ganhar badges no clube (inserção feita pelo próprio usuário via app)
CREATE POLICY "club_badges: insert"
  ON public.club_badges FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND club_id IN (SELECT public.get_my_club_ids())
  );

-- Usuário pode remover o próprio badge (ex.: reset)
CREATE POLICY "club_badges: delete"
  ON public.club_badges FOR DELETE TO authenticated
  USING (user_id = auth.uid());
