-- ============================================================
-- marca·página — Clubes v7: RLS da tabela clubs + CASCADE nas filhas
-- Execute manualmente no SQL Editor do Supabase (tudo de uma vez)
-- ============================================================

-- 1. Ativar RLS na tabela clubs e recriar todas as policies
-- ============================================================
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'clubs' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.clubs', pol.policyname);
  END LOOP;
END$$;

-- SELECT: clubes públicos, ou clubes em que o usuário é membro, ou que criou
CREATE POLICY "clubs: select"
  ON public.clubs FOR SELECT TO authenticated
  USING (
    privacidade = 'publico'
    OR criador_id = auth.uid()
    OR id IN (SELECT public.get_my_club_ids())
  );

-- INSERT: somente o próprio usuário pode criar com seu criador_id
CREATE POLICY "clubs: insert"
  ON public.clubs FOR INSERT TO authenticated
  WITH CHECK (criador_id = auth.uid());

-- UPDATE: somente o criador pode editar
CREATE POLICY "clubs: update"
  ON public.clubs FOR UPDATE TO authenticated
  USING (criador_id = auth.uid());

-- DELETE: somente o criador pode excluir
CREATE POLICY "clubs: delete"
  ON public.clubs FOR DELETE TO authenticated
  USING (criador_id = auth.uid());

-- 2. Corrigir FKs das tabelas filhas para ON DELETE CASCADE
--    Permite excluir um clube sem erro de constraint de FK.
-- ============================================================

-- Passo 2a: dropa todas as FKs de club_id nas tabelas filhas
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT tc.table_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name
      AND kcu.table_schema   = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema    = 'public'
      AND kcu.column_name    = 'club_id'
      AND tc.table_name IN (
        'club_members', 'club_posts', 'club_metas',
        'club_badges',  'club_moods'
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I',
      r.table_name, r.constraint_name
    );
  END LOOP;
END$$;

-- Passo 2b: recria as FKs com ON DELETE CASCADE
ALTER TABLE public.club_members
  ADD CONSTRAINT club_members_club_id_fkey
  FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;

ALTER TABLE public.club_posts
  ADD CONSTRAINT club_posts_club_id_fkey
  FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;

ALTER TABLE public.club_metas
  ADD CONSTRAINT club_metas_club_id_fkey
  FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;

ALTER TABLE public.club_badges
  ADD CONSTRAINT club_badges_club_id_fkey
  FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;

-- club_moods: só adiciona FK se a tabela existir (criada em v2)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'club_moods'
  ) THEN
    ALTER TABLE public.club_moods
      ADD CONSTRAINT club_moods_club_id_fkey
      FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;
  END IF;
END$$;

-- 3. Verificação: confirmar policies criadas na tabela clubs
-- ============================================================
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'clubs'
ORDER BY cmd;
