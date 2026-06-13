-- ============================================================
-- marca·página — Excluir conta: função RPC para o usuário
-- apagar a própria conta (Auth + dados relacionados via cascade)
-- Cole e execute no SQL Editor do Supabase
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
