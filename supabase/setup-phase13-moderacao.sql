-- ============================================================
-- marca·página — Fase 13: Denúncias e moderação
-- Cole e execute no SQL Editor do Supabase
-- ============================================================

-- 1. Tabela reports
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason        TEXT,
  status        TEXT        NOT NULL DEFAULT 'pendente',
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports: inserir próprio"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reports: admin lê tudo"
  ON public.reports FOR SELECT
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM public.admins));

CREATE POLICY "reports: admin atualiza"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM public.admins));

CREATE INDEX IF NOT EXISTS idx_reports_reported ON public.reports (reported_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status);

-- 2. Admins podem excluir posts/comentários de qualquer usuário
-- ============================================================
CREATE POLICY "posts: admin remove"
  ON public.posts FOR DELETE
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM public.admins));

CREATE POLICY "comments: admin remove"
  ON public.comments FOR DELETE
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM public.admins));

-- 3. Admin excluir a conta de um usuário denunciado
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_delete_account(target_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  DELETE FROM auth.users WHERE id = target_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_account(UUID) TO authenticated;
