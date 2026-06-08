-- ============================================================
-- marca·página — Fase 3: tabela profiles + bucket avatars
-- Cole e execute no SQL Editor do Supabase
-- ============================================================

-- 1. Tabela profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT        UNIQUE NOT NULL,
  full_name   TEXT,
  bio         TEXT,
  link_1      TEXT,
  link_2      TEXT,
  avatar_url  TEXT,
  last_seen   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. RLS — habilitar e criar políticas
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ler qualquer perfil
CREATE POLICY "profiles: leitura autenticada"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Apenas o dono pode inserir o próprio perfil
CREATE POLICY "profiles: inserção própria"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Apenas o dono pode atualizar o próprio perfil
CREATE POLICY "profiles: edição própria"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Apenas o dono pode deletar o próprio perfil
CREATE POLICY "profiles: deleção própria"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- 3. Storage bucket "avatars" (público)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Upload: apenas na própria pasta (user_id/)
CREATE POLICY "avatars: upload próprio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Leitura pública (para exibir avatares)
CREATE POLICY "avatars: leitura pública"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Substituição do próprio avatar
CREATE POLICY "avatars: atualização própria"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Deletar o próprio avatar
CREATE POLICY "avatars: deleção própria"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
