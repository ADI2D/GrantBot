-- ============================================================================
-- MANUAL MIGRATION: COLLABORATION FEATURES
-- ============================================================================
-- Run this in your Supabase SQL Editor to add collaboration features
-- This avoids migration history conflicts
-- ============================================================================

-- 1. PROPOSAL PRESENCE (Who's viewing/editing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS proposal_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT,
  section_id UUID REFERENCES proposal_sections(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('viewing', 'editing')),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(proposal_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_proposal_presence_proposal ON proposal_presence(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_presence_last_seen ON proposal_presence(last_seen_at DESC);

-- Auto-cleanup stale presence (older than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  DELETE FROM proposal_presence
  WHERE last_seen_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. INLINE COMMENTS (Comments on specific text selections)
-- ============================================================================
CREATE TABLE IF NOT EXISTS proposal_inline_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES proposal_sections(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_email TEXT,
  comment_text TEXT NOT NULL,
  -- Text selection metadata
  selection_start INTEGER NOT NULL,
  selection_end INTEGER NOT NULL,
  selected_text TEXT NOT NULL,
  -- Status
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inline_comments_proposal ON proposal_inline_comments(proposal_id);
CREATE INDEX IF NOT EXISTS idx_inline_comments_section ON proposal_inline_comments(section_id);
CREATE INDEX IF NOT EXISTS idx_inline_comments_resolved ON proposal_inline_comments(resolved);
CREATE INDEX IF NOT EXISTS idx_inline_comments_created ON proposal_inline_comments(created_at DESC);

-- 3. MENTIONS & NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS proposal_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES proposal_inline_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentioning_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mention_text TEXT NOT NULL,
  context TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_user ON proposal_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_mentions_proposal ON proposal_mentions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_mentions_read ON proposal_mentions(read, mentioned_user_id);

-- General notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mention', 'comment', 'assignment', 'deadline', 'share')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- 4. PROPOSAL REVISIONS (Version history)
-- ============================================================================
CREATE TABLE IF NOT EXISTS proposal_section_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES proposal_sections(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  change_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_section_revisions_section ON proposal_section_revisions(section_id);
CREATE INDEX IF NOT EXISTS idx_section_revisions_proposal ON proposal_section_revisions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_section_revisions_created ON proposal_section_revisions(created_at DESC);

-- 5. ENHANCED ACTIVITY LOGS
-- ============================================================================
DO $$ BEGIN
  ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES proposal_sections(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS comment_id UUID REFERENCES proposal_inline_comments(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS mentioned_user_ids UUID[];
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_activity_logs_section ON activity_logs(section_id) WHERE section_id IS NOT NULL;

-- 6. RLS POLICIES
-- ============================================================================

-- Proposal Presence Policies
ALTER TABLE proposal_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view presence on org proposals" ON proposal_presence;
CREATE POLICY "Members can view presence on org proposals"
  ON proposal_presence
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM proposals p
    JOIN organization_members m ON m.organization_id = p.organization_id
    WHERE p.id = proposal_presence.proposal_id
      AND m.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update their own presence" ON proposal_presence;
CREATE POLICY "Users can update their own presence"
  ON proposal_presence
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Inline Comments Policies
ALTER TABLE proposal_inline_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read inline comments on org proposals" ON proposal_inline_comments;
CREATE POLICY "Members can read inline comments on org proposals"
  ON proposal_inline_comments
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM proposals p
    JOIN organization_members m ON m.organization_id = p.organization_id
    WHERE p.id = proposal_inline_comments.proposal_id
      AND m.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Members can create inline comments on org proposals" ON proposal_inline_comments;
CREATE POLICY "Members can create inline comments on org proposals"
  ON proposal_inline_comments
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM proposals p
    JOIN organization_members m ON m.organization_id = p.organization_id
    WHERE p.id = proposal_inline_comments.proposal_id
      AND m.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Comment authors can update their own comments" ON proposal_inline_comments;
CREATE POLICY "Comment authors can update their own comments"
  ON proposal_inline_comments
  FOR UPDATE
  USING (user_id = auth.uid());

-- Mentions Policies
ALTER TABLE proposal_mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own mentions" ON proposal_mentions;
CREATE POLICY "Users can read their own mentions"
  ON proposal_mentions
  FOR SELECT
  USING (mentioned_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own mention read status" ON proposal_mentions;
CREATE POLICY "Users can update their own mention read status"
  ON proposal_mentions
  FOR UPDATE
  USING (mentioned_user_id = auth.uid())
  WITH CHECK (mentioned_user_id = auth.uid());

-- Notifications Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own notifications" ON notifications;
CREATE POLICY "Users can read their own notifications"
  ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notification read status" ON notifications;
CREATE POLICY "Users can update their own notification read status"
  ON notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Section Revisions Policies
ALTER TABLE proposal_section_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read revisions on org proposals" ON proposal_section_revisions;
CREATE POLICY "Members can read revisions on org proposals"
  ON proposal_section_revisions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM proposals p
    JOIN organization_members m ON m.organization_id = p.organization_id
    WHERE p.id = proposal_section_revisions.proposal_id
      AND m.user_id = auth.uid()
  ));

-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_metadata)
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to save revision when section content changes
CREATE OR REPLACE FUNCTION save_section_revision()
RETURNS TRIGGER AS $$
BEGIN
  -- Only save if content actually changed
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    INSERT INTO proposal_section_revisions (
      section_id,
      proposal_id,
      content,
      user_id,
      user_name,
      change_summary
    )
    SELECT
      NEW.id,
      p.id,
      OLD.content,
      auth.uid(),
      COALESCE(
        (SELECT email FROM auth.users WHERE id = auth.uid()),
        'System'
      ),
      'Content updated'
    FROM proposals p
    WHERE p.id = (
      SELECT proposal_id FROM proposal_sections WHERE id = NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS save_section_revision_trigger ON proposal_sections;
CREATE TRIGGER save_section_revision_trigger
  BEFORE UPDATE ON proposal_sections
  FOR EACH ROW
  EXECUTE FUNCTION save_section_revision();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All collaboration features are now ready to use!
-- ============================================================================
