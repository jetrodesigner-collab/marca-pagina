-- ============================================================
-- marca·página — Clubes v15: RLS completo para club_metas + Realtime
--
-- Corrige bug em que o admin salva a meta mas o UI mostra
-- o valor antigo (UPDATE bloqueado silenciosamente por RLS).
--
-- Também habilita Realtime para club_metas e club_members
-- (supersede clubs-v13-metas-realtime.sql — pode ignorar aquele).
--
-- Execute manualmente no SQL Editor do Supabase.
-- ============================================================

-- 1. Garantir que RLS está ativo em club_metas
ALTER TABLE public.club_metas ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas anteriores (caso existam — idempotente)
DROP POLICY IF EXISTS "club_metas: select membros"  ON public.club_metas;
DROP POLICY IF EXISTS "club_metas: insert admins"   ON public.club_metas;
DROP POLICY IF EXISTS "club_metas: update admins"   ON public.club_metas;
DROP POLICY IF EXISTS "club_metas: delete admins"   ON public.club_metas;

-- 3. SELECT: membros ativos e criador do clube podem ler as metas
CREATE POLICY "club_metas: select membros"
  ON public.club_metas FOR SELECT TO authenticated
  USING (is_club_member(club_id));

-- 4. INSERT: apenas admin do clube pode criar uma meta
CREATE POLICY "club_metas: insert admins"
  ON public.club_metas FOR INSERT TO authenticated
  WITH CHECK (is_club_admin(club_id));

-- 5. UPDATE: apenas admin do clube pode editar a meta
CREATE POLICY "club_metas: update admins"
  ON public.club_metas FOR UPDATE TO authenticated
  USING  (is_club_admin(club_id))
  WITH CHECK (is_club_admin(club_id));

-- 6. DELETE: apenas admin do clube pode excluir a meta
CREATE POLICY "club_metas: delete admins"
  ON public.club_metas FOR DELETE TO authenticated
  USING (is_club_admin(club_id));

-- 7. Habilitar Realtime para club_metas (eventos de UPDATE chegam a todos os clientes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'club_metas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.club_metas;
  END IF;
END$$;

-- 8. Habilitar Realtime para club_members (ranking ao vivo)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'club_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.club_members;
  END IF;
END$$;

-- Verificação: confirmar políticas e publicações criadas
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'club_metas' ORDER BY cmd;
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('club_metas', 'club_members', 'club_posts')
ORDER BY tablename;
