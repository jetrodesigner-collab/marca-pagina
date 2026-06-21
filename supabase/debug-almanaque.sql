-- debug-almanaque.sql
-- Rode este script NO SQL EDITOR do Supabase (qzyntdtnwmwsqhnruton).
-- ANTES DE RODAR: substitua <MEU_USER_ID> e <CLUB_ID> pelos valores reais.
--   • Seu user_id: Authentication > Users no painel Supabase
--   • club_id: URL do clube no app ou SELECT id FROM clubs LIMIT 5;
-- Execute cada bloco separadamente (selecione o bloco e clique em "Run").

-- ════════════════════════════════════════════════════════════════════════════════
-- BLOCO 1 — Políticas existentes em club_almanaque_content
-- Objetivo: ver se há duplicatas ou sobras de versões anteriores (v10/v11)
-- ════════════════════════════════════════════════════════════════════════════════

SELECT
  policyname,
  cmd,
  roles,
  LEFT(qual, 200)       AS usando,
  LEFT(with_check, 200) AS com_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename  = 'club_almanaque_content'
ORDER BY cmd, policyname;


-- ════════════════════════════════════════════════════════════════════════════════
-- BLOCO 2 — Estrutura real da tabela
-- Objetivo: confirmar nomes exatos das colunas e tipos
-- ════════════════════════════════════════════════════════════════════════════════

SELECT
  ordinal_position,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'club_almanaque_content'
ORDER BY ordinal_position;

-- Constraints (PRIMARY KEY e UNIQUE — onConflict: 'club_id' precisa de UNIQUE)
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND kcu.table_schema   = 'public'
WHERE tc.table_schema = 'public'
  AND tc.table_name   = 'club_almanaque_content'
ORDER BY tc.constraint_type, kcu.column_name;


-- ════════════════════════════════════════════════════════════════════════════════
-- BLOCO 3 — Verificar membros e criador no clube de teste
-- Objetivo: confirmar que você está registrado como admin/criador nos dados reais
-- SUBSTITUIR <MEU_USER_ID> e <CLUB_ID> antes de rodar
-- ════════════════════════════════════════════════════════════════════════════════

-- Suas entradas em club_members (todos os clubes):
SELECT id, club_id, role, status
FROM club_members
WHERE user_id = '<MEU_USER_ID>'::uuid;

-- O clube de teste (você aparece como criador_id?):
SELECT id, nome, criador_id
FROM clubs
WHERE id = '<CLUB_ID>'::uuid;

-- Dado atual na tabela (se já existe alguma linha):
SELECT * FROM club_almanaque_content
WHERE club_id = '<CLUB_ID>'::uuid;


-- ════════════════════════════════════════════════════════════════════════════════
-- BLOCO 4 — Testar is_club_admin e is_club_member simulando seu usuário
-- Objetivo: confirmar se a função retorna true para você no clube de teste
--
-- IMPORTANTE: no SQL Editor do Supabase, auth.uid() retorna NULL por padrão
-- porque você está rodando como postgres (superuser), não como usuário autenticado.
-- O bloco abaixo simula o JWT do seu usuário dentro de uma transação.
-- SUBSTITUIR <MEU_USER_ID> e <CLUB_ID> antes de rodar.
-- O ROLLBACK garante que nada é commitado.
-- ════════════════════════════════════════════════════════════════════════════════

BEGIN;
  -- Simula ser o usuário autenticado
  SET LOCAL ROLE authenticated;
  SELECT set_config(
    'request.jwt.claims',
    json_build_object('sub', '<MEU_USER_ID>', 'role', 'authenticated')::text,
    true
  );

  -- Confirma que auth.uid() resolveu corretamente
  SELECT auth.uid() AS uid_simulado;

  -- Testa as funções helper
  SELECT
    is_club_admin('<CLUB_ID>'::uuid)  AS sou_admin,
    is_club_member('<CLUB_ID>'::uuid) AS sou_membro;

ROLLBACK;


-- ════════════════════════════════════════════════════════════════════════════════
-- BLOCO 5 — Verificar a definição das funções helper (search_path)
-- Objetivo: confirmar se is_club_admin tem SET search_path = public, auth
-- (sem isso, auth.uid() pode não funcionar dentro da função SECURITY DEFINER)
-- ════════════════════════════════════════════════════════════════════════════════

SELECT
  proname        AS funcao,
  prosecdef      AS security_definer,
  proconfig      AS configuracoes,  -- deve conter search_path=public, auth
  LEFT(prosrc, 400) AS corpo
FROM pg_proc
WHERE proname IN ('is_club_admin', 'is_club_member')
  AND pronamespace = 'public'::regnamespace;
