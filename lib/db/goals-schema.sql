-- Farmer Goals Table
CREATE TABLE IF NOT EXISTS farmer_goals (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  goal_category TEXT NOT NULL, -- 'income', 'food', 'biodiversity', 'soil', 'water', 'shelter', 'learning'
  description TEXT NOT NULL,
  priority INTEGER DEFAULT 3, -- 1-5 scale
  targets TEXT, -- JSON array of measurable targets
  timeline TEXT, -- 'short' (1 year), 'medium' (2-3 years), 'long' (4+ years)
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'archived'
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_goals_farm_id ON farmer_goals(farm_id);
CREATE INDEX IF NOT EXISTS idx_goals_category ON farmer_goals(goal_category);
CREATE INDEX IF NOT EXISTS idx_goals_priority ON farmer_goals(priority);

-- Insert example goals for existing farms (migration script)
-- This would be run as a one-time migration