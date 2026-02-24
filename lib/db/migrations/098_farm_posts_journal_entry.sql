-- Migration: Add journal_entry_id to farm_posts
-- Date: 2026-02-24
-- Description: Allow journal entries to be shared as community posts

ALTER TABLE farm_posts ADD COLUMN journal_entry_id TEXT;

CREATE INDEX IF NOT EXISTS idx_posts_journal_entry_id ON farm_posts(journal_entry_id);
