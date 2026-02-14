CREATE TABLE IF NOT EXISTS farm_collaborators (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('owner', 'editor', 'commenter', 'viewer')),
  invited_by TEXT NOT NULL,
  invited_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (invited_by) REFERENCES users(id),
  UNIQUE(farm_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collaborators_farm ON farm_collaborators(farm_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user ON farm_collaborators(user_id);

-- Roles:
-- owner: full control (delete farm, manage collaborators)
-- editor: edit zones, plantings, lines
-- commenter: view + add comments
-- viewer: read-only access
