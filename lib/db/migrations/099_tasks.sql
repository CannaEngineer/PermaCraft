-- Task & Workflow Management System
-- Closes HIGH PRIORITY gap: Task management for farm operations

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'custom', -- 'planting', 'watering', 'harvesting', 'maintenance', 'observation', 'pruning', 'mulching', 'custom'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'skipped'
  priority INTEGER NOT NULL DEFAULT 2, -- 1=low, 2=medium, 3=high, 4=urgent
  due_date INTEGER, -- Unix epoch
  completed_at INTEGER,
  assigned_to TEXT, -- user_id (for collaborator farms)
  related_planting_id TEXT,
  related_zone_id TEXT,
  recurrence TEXT, -- JSON: { pattern: 'daily'|'weekly'|'biweekly'|'monthly'|'seasonal', interval: 1, end_date: ... }
  tags TEXT, -- JSON array
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (related_planting_id) REFERENCES plantings(id) ON DELETE SET NULL,
  FOREIGN KEY (related_zone_id) REFERENCES zones(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_farm_id ON tasks(farm_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(farm_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(farm_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
