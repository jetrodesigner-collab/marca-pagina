-- ============================================================
-- marca·página — Notificações in-app (sininho)
-- Cole e execute no SQL Editor do Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  actor_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type        TEXT        NOT NULL DEFAULT 'comment',
  item_id     UUID        REFERENCES public.items(id) ON DELETE CASCADE,
  comment_id  UUID        REFERENCES public.comments(id) ON DELETE CASCADE,
  read        BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_sees_own_notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "system_inserts_notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "user_updates_own_notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Trigger: notifica quando alguém comenta em um item da
-- biblioteca de outro usuário (não notifica o próprio autor).
--
-- Observação: a tabela public.items é um catálogo compartilhado
-- (não tem dono único), então o "dono" de um item é quem o tem
-- em public.user_items. Notificamos todos os usuários que têm
-- esse item na biblioteca, exceto quem comentou.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  owner_id UUID;
BEGIN
  IF NEW.item_id IS NOT NULL THEN
    FOR owner_id IN
      SELECT DISTINCT user_id
      FROM public.user_items
      WHERE item_id = NEW.item_id
        AND user_id <> NEW.user_id
    LOOP
      INSERT INTO public.notifications (user_id, actor_id, type, item_id, comment_id)
      VALUES (owner_id, NEW.user_id, 'comment', NEW.item_id, NEW.id);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_inserted ON public.comments;
CREATE TRIGGER on_comment_inserted
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();
