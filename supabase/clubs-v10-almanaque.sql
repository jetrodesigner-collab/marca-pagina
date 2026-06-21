-- Migration: Almanaque feature for clubs
-- Adds admin content cards (Contexto Histórico, Curiosidades) + member notes with likes/comments

-- ── Tables ────────────────────────────────────────────────────────────────────

-- One row per club; admins upsert to fill the two text fields
CREATE TABLE IF NOT EXISTS club_almanaque_content (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id             uuid        NOT NULL UNIQUE REFERENCES clubs(id) ON DELETE CASCADE,
  contexto_historico  text,
  curiosidades        text,
  updated_by          uuid        REFERENCES auth.users(id),
  updated_at          timestamptz DEFAULT now()
);

-- Free-form notes, any member, no limit per user
CREATE TABLE IF NOT EXISTS club_almanaque_notes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id    uuid        NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id),
  content    text        NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Likes on member notes
CREATE TABLE IF NOT EXISTS club_almanaque_note_likes (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES club_almanaque_notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  UNIQUE (note_id, user_id)
);

-- Comments on member notes
CREATE TABLE IF NOT EXISTS club_almanaque_note_comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id    uuid        NOT NULL REFERENCES club_almanaque_notes(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id),
  content    text        NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Likes on the two fixed admin cards (contexto_historico | curiosidades)
CREATE TABLE IF NOT EXISTS club_almanaque_card_likes (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id   uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  card_type text NOT NULL CHECK (card_type IN ('contexto_historico', 'curiosidades')),
  user_id   uuid NOT NULL REFERENCES auth.users(id),
  UNIQUE (club_id, card_type, user_id)
);

-- Comments on the two fixed admin cards
CREATE TABLE IF NOT EXISTS club_almanaque_card_comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id    uuid        NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  card_type  text        NOT NULL CHECK (card_type IN ('contexto_historico', 'curiosidades')),
  user_id    uuid        NOT NULL REFERENCES auth.users(id),
  content    text        NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_alma_content_club    ON club_almanaque_content(club_id);
CREATE INDEX IF NOT EXISTS idx_alma_notes_club      ON club_almanaque_notes(club_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alma_note_likes      ON club_almanaque_note_likes(note_id);
CREATE INDEX IF NOT EXISTS idx_alma_note_comments   ON club_almanaque_note_comments(note_id, created_at);
CREATE INDEX IF NOT EXISTS idx_alma_card_likes      ON club_almanaque_card_likes(club_id, card_type);
CREATE INDEX IF NOT EXISTS idx_alma_card_comments   ON club_almanaque_card_comments(club_id, card_type, created_at);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE club_almanaque_content      ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_almanaque_notes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_almanaque_note_likes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_almanaque_note_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_almanaque_card_likes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_almanaque_card_comments ENABLE ROW LEVEL SECURITY;

-- ── club_almanaque_content ───────────────────────────────────────────────────

CREATE POLICY "alma_content_select"
  ON club_almanaque_content FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_almanaque_content.club_id
        AND cm.user_id = auth.uid()
        AND cm.status  = 'ativo'
    )
  );

CREATE POLICY "alma_content_insert"
  ON club_almanaque_content FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_almanaque_content.club_id
        AND cm.user_id = auth.uid()
        AND cm.role    = 'admin'
        AND cm.status  = 'ativo'
    )
  );

CREATE POLICY "alma_content_update"
  ON club_almanaque_content FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_almanaque_content.club_id
        AND cm.user_id = auth.uid()
        AND cm.role    = 'admin'
        AND cm.status  = 'ativo'
    )
  );

-- ── club_almanaque_notes ─────────────────────────────────────────────────────

CREATE POLICY "alma_notes_select"
  ON club_almanaque_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_almanaque_notes.club_id
        AND cm.user_id = auth.uid()
        AND cm.status  = 'ativo'
    )
  );

CREATE POLICY "alma_notes_insert"
  ON club_almanaque_notes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_almanaque_notes.club_id
        AND cm.user_id = auth.uid()
        AND cm.status  = 'ativo'
    )
  );

CREATE POLICY "alma_notes_delete"
  ON club_almanaque_notes FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_almanaque_notes.club_id
        AND cm.user_id = auth.uid()
        AND cm.role    = 'admin'
        AND cm.status  = 'ativo'
    )
  );

-- ── club_almanaque_note_likes ────────────────────────────────────────────────

CREATE POLICY "alma_note_likes_select"
  ON club_almanaque_note_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_almanaque_notes n
      JOIN  club_members cm ON cm.club_id = n.club_id
      WHERE n.id          = club_almanaque_note_likes.note_id
        AND cm.user_id    = auth.uid()
        AND cm.status     = 'ativo'
    )
  );

CREATE POLICY "alma_note_likes_insert"
  ON club_almanaque_note_likes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM club_almanaque_notes n
      JOIN  club_members cm ON cm.club_id = n.club_id
      WHERE n.id          = club_almanaque_note_likes.note_id
        AND cm.user_id    = auth.uid()
        AND cm.status     = 'ativo'
    )
  );

CREATE POLICY "alma_note_likes_delete"
  ON club_almanaque_note_likes FOR DELETE
  USING (user_id = auth.uid());

-- ── club_almanaque_note_comments ─────────────────────────────────────────────

CREATE POLICY "alma_note_comments_select"
  ON club_almanaque_note_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_almanaque_notes n
      JOIN  club_members cm ON cm.club_id = n.club_id
      WHERE n.id          = club_almanaque_note_comments.note_id
        AND cm.user_id    = auth.uid()
        AND cm.status     = 'ativo'
    )
  );

CREATE POLICY "alma_note_comments_insert"
  ON club_almanaque_note_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM club_almanaque_notes n
      JOIN  club_members cm ON cm.club_id = n.club_id
      WHERE n.id          = club_almanaque_note_comments.note_id
        AND cm.user_id    = auth.uid()
        AND cm.status     = 'ativo'
    )
  );

CREATE POLICY "alma_note_comments_delete"
  ON club_almanaque_note_comments FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM club_almanaque_notes n
      JOIN  club_members cm ON cm.club_id = n.club_id
      WHERE n.id          = club_almanaque_note_comments.note_id
        AND cm.user_id    = auth.uid()
        AND cm.role       = 'admin'
        AND cm.status     = 'ativo'
    )
  );

-- ── club_almanaque_card_likes ────────────────────────────────────────────────

CREATE POLICY "alma_card_likes_select"
  ON club_almanaque_card_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_almanaque_card_likes.club_id
        AND cm.user_id = auth.uid()
        AND cm.status  = 'ativo'
    )
  );

CREATE POLICY "alma_card_likes_insert"
  ON club_almanaque_card_likes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_almanaque_card_likes.club_id
        AND cm.user_id = auth.uid()
        AND cm.status  = 'ativo'
    )
  );

CREATE POLICY "alma_card_likes_delete"
  ON club_almanaque_card_likes FOR DELETE
  USING (user_id = auth.uid());

-- ── club_almanaque_card_comments ─────────────────────────────────────────────

CREATE POLICY "alma_card_comments_select"
  ON club_almanaque_card_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_almanaque_card_comments.club_id
        AND cm.user_id = auth.uid()
        AND cm.status  = 'ativo'
    )
  );

CREATE POLICY "alma_card_comments_insert"
  ON club_almanaque_card_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_almanaque_card_comments.club_id
        AND cm.user_id = auth.uid()
        AND cm.status  = 'ativo'
    )
  );

CREATE POLICY "alma_card_comments_delete"
  ON club_almanaque_card_comments FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = club_almanaque_card_comments.club_id
        AND cm.user_id = auth.uid()
        AND cm.role    = 'admin'
        AND cm.status  = 'ativo'
    )
  );
