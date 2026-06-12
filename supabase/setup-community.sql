-- ============================================================
-- marca·página — Fase 10: S5 Comunidade + S6 Perfil Público
-- Cole e execute no SQL Editor do Supabase
-- ============================================================

-- 1. Permitir leitura de user_items de qualquer usuário autenticado
-- ------------------------------------------------------------
-- Hoje só o dono pode ler suas linhas em user_items. A tela de
-- Comunidade (contagem de livros/filmes e "Lidos recentemente"
-- de outros usuários) e o Perfil Público precisam ler essa tabela
-- para qualquer usuário. Segue o mesmo padrão já usado em
-- "profiles" e "items" ("leitura autenticada" = true).
CREATE POLICY "user_items: leitura autenticada"
  ON public.user_items FOR SELECT
  TO authenticated
  USING (true);

-- 2. Índices para a Comunidade
-- ------------------------------------------------------------
-- Ordenação "Ativos recentemente" (profiles.last_seen DESC)
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen
  ON public.profiles (last_seen DESC);

-- Busca dos itens mais recentes de cada usuário (mini-capas)
CREATE INDEX IF NOT EXISTS idx_user_items_user_created
  ON public.user_items (user_id, created_at DESC);
