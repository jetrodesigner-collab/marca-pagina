-- ============================================================
-- marca·página — Fase 11: cadastro manual (S9/S10) + bucket covers
-- Cole e execute no SQL Editor do Supabase
-- ============================================================

-- 1. Novas colunas em items (cadastro manual)
-- ============================================================
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS duration_minutes INT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 2. Storage bucket "covers" (público)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

-- Upload: apenas na própria pasta (user_id/)
CREATE POLICY "covers: upload próprio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Leitura pública (para exibir capas)
CREATE POLICY "covers: leitura pública"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'covers');

-- Substituição da própria capa
CREATE POLICY "covers: atualização própria"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Deletar a própria capa
CREATE POLICY "covers: deleção própria"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
