-- ============================================================
-- marca·página — Fase 11: Comunidade (posts, follows, curtidas, comentários unificados)
-- Cole e execute no SQL Editor do Supabase
-- ============================================================

-- 1. Tabela follows (seguir usuários)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows: leitura autenticada"
  ON public.follows FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "follows: inserir próprio"
  ON public.follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "follows: remover próprio"
  ON public.follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows (following_id);

-- 2. Tabela posts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.posts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT,
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts: leitura autenticada"
  ON public.posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "posts: inserir próprio"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts: atualizar próprio"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "posts: remover próprio"
  ON public.posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_posts_user_created ON public.posts (user_id, created_at DESC);

-- 3. Tabela post_likes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id    UUID        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_likes: leitura autenticada"
  ON public.post_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "post_likes: inserir próprio"
  ON public.post_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "post_likes: remover próprio"
  ON public.post_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Extensão da tabela comments (threads unificadas + respostas)
-- ============================================================
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS post_id   UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE;

ALTER TABLE public.comments
  ALTER COLUMN item_id DROP NOT NULL;

ALTER TABLE public.comments
  ADD CONSTRAINT comments_target_check CHECK (num_nonnulls(item_id, post_id, review_id) = 1);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments (post_id);
CREATE INDEX IF NOT EXISTS idx_comments_review_id ON public.comments (review_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments (parent_id);

-- 5. Tabela comment_likes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.comment_likes (
  comment_id UUID        NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comment_likes: leitura autenticada"
  ON public.comment_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "comment_likes: inserir próprio"
  ON public.comment_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comment_likes: remover próprio"
  ON public.comment_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 6. Tabela review_likes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.review_likes (
  review_id  UUID        NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (review_id, user_id)
);

ALTER TABLE public.review_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_likes: leitura autenticada"
  ON public.review_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "review_likes: inserir próprio"
  ON public.review_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "review_likes: remover próprio"
  ON public.review_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
