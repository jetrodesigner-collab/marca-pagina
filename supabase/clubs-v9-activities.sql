-- Migration: club_activities feature
-- Adds evaluation/quiz system to clubs

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS club_activities (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     uuid        NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  created_by  uuid        NOT NULL REFERENCES auth.users(id),
  title       text        NOT NULL,
  deadline    timestamptz NOT NULL,
  status      text        NOT NULL DEFAULT 'aberta'
                          CHECK (status IN ('aberta','encerrada','corrigida')),
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS club_activity_questions (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id   uuid    NOT NULL REFERENCES club_activities(id) ON DELETE CASCADE,
  type          text    NOT NULL CHECK (type IN ('dissertativa','multipla_escolha')),
  question_text text    NOT NULL,
  options       jsonb,
  order_index   integer NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS club_activity_answers (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid        NOT NULL REFERENCES club_activities(id) ON DELETE CASCADE,
  question_id uuid        NOT NULL REFERENCES club_activity_questions(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id),
  answer_text text        NOT NULL,
  is_public   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (question_id, user_id)
);

CREATE TABLE IF NOT EXISTS club_activity_grades (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid        NOT NULL REFERENCES club_activities(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id),
  nota        numeric(4,1),
  feedback    text,
  graded_by   uuid        NOT NULL REFERENCES auth.users(id),
  graded_at   timestamptz DEFAULT now(),
  UNIQUE (activity_id, user_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_club_activities_club        ON club_activities(club_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_questions_activity ON club_activity_questions(activity_id, order_index);
CREATE INDEX IF NOT EXISTS idx_activity_answers_activity   ON club_activity_answers(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_answers_user       ON club_activity_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_grades_activity    ON club_activity_grades(activity_id);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE club_activities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_activity_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_activity_answers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_activity_grades    ENABLE ROW LEVEL SECURITY;

-- Helper: active member of a club
-- club_activities
CREATE POLICY "club_members_view_activities"
  ON club_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_activities.club_id
        AND cm.user_id = auth.uid()
        AND cm.status  = 'ativo'
    )
  );

CREATE POLICY "club_admins_manage_activities"
  ON club_activities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_activities.club_id
        AND cm.user_id = auth.uid()
        AND cm.role    = 'admin'
        AND cm.status  = 'ativo'
    )
  );

-- club_activity_questions
CREATE POLICY "club_members_view_questions"
  ON club_activity_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_activities ca
      JOIN  club_members cm ON cm.club_id = ca.club_id
      WHERE ca.id           = club_activity_questions.activity_id
        AND cm.user_id      = auth.uid()
        AND cm.status       = 'ativo'
    )
  );

CREATE POLICY "club_admins_manage_questions"
  ON club_activity_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM club_activities ca
      JOIN  club_members cm ON cm.club_id = ca.club_id
      WHERE ca.id           = club_activity_questions.activity_id
        AND cm.user_id      = auth.uid()
        AND cm.role         = 'admin'
        AND cm.status       = 'ativo'
    )
  );

-- club_activity_answers — all active members can SELECT rows
-- (content filtering for private answers is handled in the application layer)
CREATE POLICY "club_members_view_answers"
  ON club_activity_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_activities ca
      JOIN  club_members cm ON cm.club_id = ca.club_id
      WHERE ca.id           = club_activity_answers.activity_id
        AND cm.user_id      = auth.uid()
        AND cm.status       = 'ativo'
    )
  );

CREATE POLICY "members_insert_own_answers"
  ON club_activity_answers FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "members_update_own_answers"
  ON club_activity_answers FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "members_delete_own_or_admin"
  ON club_activity_answers FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM club_activities ca
      JOIN  club_members cm ON cm.club_id = ca.club_id
      WHERE ca.id           = club_activity_answers.activity_id
        AND cm.user_id      = auth.uid()
        AND cm.role         = 'admin'
        AND cm.status       = 'ativo'
    )
  );

-- club_activity_grades — all active members can SELECT
-- (grade visibility controlled in application layer based on answer privacy)
CREATE POLICY "club_members_view_grades"
  ON club_activity_grades FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_activities ca
      JOIN  club_members cm ON cm.club_id = ca.club_id
      WHERE ca.id           = club_activity_grades.activity_id
        AND cm.user_id      = auth.uid()
        AND cm.status       = 'ativo'
    )
  );

CREATE POLICY "club_admins_manage_grades"
  ON club_activity_grades FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM club_activities ca
      JOIN  club_members cm ON cm.club_id = ca.club_id
      WHERE ca.id           = club_activity_grades.activity_id
        AND cm.user_id      = auth.uid()
        AND cm.role         = 'admin'
        AND cm.status       = 'ativo'
    )
  );
