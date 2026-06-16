-- ============================================================
-- marca·página — Clubes: corrigir RLS + adicionar foto_url
-- Cole e execute no SQL Editor do Supabase (tudo de uma vez)
-- ============================================================

-- 1. Adicionar coluna foto_url na tabela clubs
-- ============================================================
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS foto_url text;

-- 2. Função auxiliar SECURITY DEFINER para evitar recursão no RLS
--    Esta função consulta club_members sem acionar as policies da tabela,
--    quebrando o ciclo de recursão infinita.
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

-- 3. Remover TODAS as policies existentes em club_members
--    (evita conflito com as novas)
-- ============================================================
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'club_members' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.club_members', pol.policyname);
  END LOOP;
END$$;

-- 4. Recriar policies sem recursão
-- ============================================================

-- SELECT: usa a função SECURITY DEFINER para evitar loop
CREATE POLICY "club_members: select"
  ON public.club_members FOR SELECT
  TO authenticated
  USING (club_id IN (SELECT public.get_my_club_ids()));

-- INSERT: usuário só pode inserir com seu próprio user_id
CREATE POLICY "club_members: insert"
  ON public.club_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: usuário só pode atualizar seu próprio registro
CREATE POLICY "club_members: update"
  ON public.club_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- DELETE: usuário pode sair do clube (admin pode remover via service key)
CREATE POLICY "club_members: delete"
  ON public.club_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 5. Verificar e corrigir policies da tabela clubs (se houver referência circular)
-- ============================================================
-- Se a tabela clubs tiver alguma policy que consulta club_members, ela também
-- pode causar recursão. Descomente e ajuste conforme necessário:
--
-- DROP POLICY IF EXISTS "nome_da_policy_problematica" ON public.clubs;
--
-- Política segura para leitura pública de clubes:
-- CREATE POLICY "clubs: select autenticado"
--   ON public.clubs FOR SELECT
--   TO authenticated
--   USING (privacidade = 'publico' OR criador_id = auth.uid() OR id IN (SELECT public.get_my_club_ids()));

-- 6. Confirmar RLS ativo em club_members
-- ============================================================
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
