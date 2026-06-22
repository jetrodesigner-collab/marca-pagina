-- ============================================================
-- marca·página — Clubes v13: Realtime para club_metas
-- Corrige bug em que edição de meta pelo admin não propagava
-- para os outros membros do clube em tempo real.
-- Execute manualmente no SQL Editor do Supabase.
-- ============================================================

-- 1. Habilitar Realtime para club_metas
-- (necessário para que a subscription postgres_changes notifique TODOS os clientes)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'club_metas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.club_metas;
  END IF;
END$$;

-- 2. Garantir que membros ativos do clube podem ler club_metas
-- (necessário para que o Realtime entregue os eventos via RLS)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'club_metas' AND policyname = 'club_metas: select membros'
  ) THEN
    CREATE POLICY "club_metas: select membros"
      ON public.club_metas FOR SELECT TO authenticated
      USING (
        club_id IN (SELECT public.get_my_club_ids())
      );
  END IF;
END$$;

-- 3. Habilitar Realtime para club_members também (garante ranking ao vivo)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'club_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.club_members;
  END IF;
END$$;

-- 4. Verificação: confirmar tabelas na publicação
-- ============================================================
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('club_posts', 'club_metas', 'club_members')
ORDER BY tablename;
