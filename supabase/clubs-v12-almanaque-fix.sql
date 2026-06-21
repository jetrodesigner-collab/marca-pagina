-- Fix: club_almanaque_content — admin não consegue salvar Contexto Histórico / Curiosidades
--
-- Diagnóstico realizado:
-- A causa mais provável é que as policies de INSERT/UPDATE ainda referenciam a definição
-- antiga (clubs-v10) que exige club_members.role = 'admin', e o criador do clube pode não
-- ter esse role em club_members — ou as policies do v11 não foram aplicadas corretamente
-- por colisão de nomes.
--
-- Esta migration:
-- 1. Recria is_club_admin e is_club_member com SET search_path explícito (garante que
--    auth.uid() funciona corretamente dentro de SECURITY DEFINER)
-- 2. Remove TODAS as policies existentes em club_almanaque_content via loop dinâmico
--    (evita sobras de versões anteriores)
-- 3. Recria as policies limpas usando is_club_admin / is_club_member
--
-- Para testar antes de aplicar (substitua pelo seu club_id real):
--   SELECT is_club_admin('<club_id>'::uuid);
--   SELECT is_club_member('<club_id>'::uuid);
-- Se retornar false para o admin, o problema confirmado é a função.

-- ── Funções helper ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_club_admin(p_club_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = p_club_id
      AND cm.user_id = auth.uid()
      AND cm.role    = 'admin'
      AND cm.status  = 'ativo'
  )
  OR EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id         = p_club_id
      AND c.criador_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_club_member(p_club_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = p_club_id
      AND cm.user_id = auth.uid()
      AND cm.status  = 'ativo'
  )
  OR EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id         = p_club_id
      AND c.criador_id = auth.uid()
  );
$$;

-- ── Remove TODAS as policies existentes em club_almanaque_content ─────────────
-- (cobre nomes do v10, v11 e quaisquer outros)

DO $$
DECLARE
  pol_name text;
BEGIN
  FOR pol_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'club_almanaque_content'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.club_almanaque_content', pol_name);
  END LOOP;
END $$;

-- ── Recria policies limpas ────────────────────────────────────────────────────

CREATE POLICY "alma_content_select"
  ON public.club_almanaque_content FOR SELECT
  USING (is_club_member(club_id));

CREATE POLICY "alma_content_insert"
  ON public.club_almanaque_content FOR INSERT
  WITH CHECK (is_club_admin(club_id));

CREATE POLICY "alma_content_update"
  ON public.club_almanaque_content FOR UPDATE
  USING  (is_club_admin(club_id))
  WITH CHECK (is_club_admin(club_id));
