-- Fix: RLS policies para club_activities e club_almanaque_content
-- Problema: as políticas originais checam apenas club_members.role = 'admin',
-- mas o criador do clube (criador_id em clubs) pode não estar em club_members
-- com role = 'admin', causando falhas silenciosas no INSERT/UPDATE.
-- Solução: ampliar o check de admin para cobrir também criador_id.

-- ── Helpers ───────────────────────────────────────────────────────────────────

-- Retorna true se o usuário é admin do clube (via club_members ou criador_id)
CREATE OR REPLACE FUNCTION is_club_admin(p_club_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = p_club_id
      AND cm.user_id = auth.uid()
      AND cm.role    = 'admin'
      AND cm.status  = 'ativo'
  )
  OR EXISTS (
    SELECT 1 FROM clubs c
    WHERE c.id        = p_club_id
      AND c.criador_id = auth.uid()
  );
$$;

-- Retorna true se o usuário é membro ativo do clube
CREATE OR REPLACE FUNCTION is_club_member(p_club_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = p_club_id
      AND cm.user_id = auth.uid()
      AND cm.status  = 'ativo'
  )
  OR EXISTS (
    SELECT 1 FROM clubs c
    WHERE c.id        = p_club_id
      AND c.criador_id = auth.uid()
  );
$$;

-- ── club_activities ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "club_members_view_activities"   ON club_activities;
DROP POLICY IF EXISTS "club_admins_manage_activities"  ON club_activities;

CREATE POLICY "club_members_view_activities"
  ON club_activities FOR SELECT
  USING (is_club_member(club_id));

CREATE POLICY "club_admins_insert_activities"
  ON club_activities FOR INSERT
  WITH CHECK (is_club_admin(club_id));

CREATE POLICY "club_admins_update_activities"
  ON club_activities FOR UPDATE
  USING (is_club_admin(club_id))
  WITH CHECK (is_club_admin(club_id));

CREATE POLICY "club_admins_delete_activities"
  ON club_activities FOR DELETE
  USING (is_club_admin(club_id));

-- ── club_activity_questions ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "club_members_view_questions"   ON club_activity_questions;
DROP POLICY IF EXISTS "club_admins_manage_questions"  ON club_activity_questions;

CREATE POLICY "club_members_view_questions"
  ON club_activity_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_activities ca
      WHERE ca.id = club_activity_questions.activity_id
        AND is_club_member(ca.club_id)
    )
  );

CREATE POLICY "club_admins_insert_questions"
  ON club_activity_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_activities ca
      WHERE ca.id = club_activity_questions.activity_id
        AND is_club_admin(ca.club_id)
    )
  );

CREATE POLICY "club_admins_update_questions"
  ON club_activity_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM club_activities ca
      WHERE ca.id = club_activity_questions.activity_id
        AND is_club_admin(ca.club_id)
    )
  );

CREATE POLICY "club_admins_delete_questions"
  ON club_activity_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM club_activities ca
      WHERE ca.id = club_activity_questions.activity_id
        AND is_club_admin(ca.club_id)
    )
  );

-- ── club_activity_grades ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "club_members_view_grades"  ON club_activity_grades;
DROP POLICY IF EXISTS "club_admins_manage_grades" ON club_activity_grades;

CREATE POLICY "club_members_view_grades"
  ON club_activity_grades FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_activities ca
      WHERE ca.id = club_activity_grades.activity_id
        AND is_club_member(ca.club_id)
    )
  );

CREATE POLICY "club_admins_manage_grades"
  ON club_activity_grades FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM club_activities ca
      WHERE ca.id = club_activity_grades.activity_id
        AND is_club_admin(ca.club_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_activities ca
      WHERE ca.id = club_activity_grades.activity_id
        AND is_club_admin(ca.club_id)
    )
  );

-- ── club_almanaque_content ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "alma_content_select" ON club_almanaque_content;
DROP POLICY IF EXISTS "alma_content_insert" ON club_almanaque_content;
DROP POLICY IF EXISTS "alma_content_update" ON club_almanaque_content;

CREATE POLICY "alma_content_select"
  ON club_almanaque_content FOR SELECT
  USING (is_club_member(club_id));

CREATE POLICY "alma_content_insert"
  ON club_almanaque_content FOR INSERT
  WITH CHECK (is_club_admin(club_id));

CREATE POLICY "alma_content_update"
  ON club_almanaque_content FOR UPDATE
  USING (is_club_admin(club_id))
  WITH CHECK (is_club_admin(club_id));
