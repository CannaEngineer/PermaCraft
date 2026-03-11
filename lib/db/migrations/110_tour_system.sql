-- PermaTour AI: Self-guided farm tour system
-- Migration 110: Tour tables

-- Tour configuration per farm
CREATE TABLE IF NOT EXISTS tour_configs (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  published INTEGER NOT NULL DEFAULT 0,
  ai_system_prompt TEXT,
  primary_color TEXT DEFAULT '#16a34a',
  default_route_id TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tour_configs_farm ON tour_configs(farm_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tour_configs_slug ON tour_configs(slug);

-- Points of interest on a farm tour
CREATE TABLE IF NOT EXISTS tour_pois (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  qr_code_id TEXT NOT NULL UNIQUE,
  description TEXT,
  media_urls TEXT,
  species_list TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tour_pois_farm ON tour_pois(farm_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tour_pois_qr ON tour_pois(qr_code_id);

-- Named routes through POIs
CREATE TABLE IF NOT EXISTS tour_routes (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  name TEXT NOT NULL,
  duration_minutes INTEGER,
  distance_meters REAL,
  poi_sequence TEXT NOT NULL DEFAULT '[]',
  cached_route_geojson TEXT,
  difficulty TEXT DEFAULT 'easy',
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tour_routes_farm ON tour_routes(farm_id);

-- Anonymous visitor sessions (no PII)
CREATE TABLE IF NOT EXISTS tour_sessions (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  route_id TEXT,
  device_type TEXT,
  started_at INTEGER DEFAULT (unixepoch()),
  ended_at INTEGER,
  pois_visited_count INTEGER NOT NULL DEFAULT 0,
  shares_count INTEGER NOT NULL DEFAULT 0,
  completion_percentage REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (route_id) REFERENCES tour_routes(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tour_sessions_farm ON tour_sessions(farm_id);

-- Behavioral events for analytics
CREATE TABLE IF NOT EXISTS tour_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  farm_id TEXT NOT NULL,
  poi_id TEXT,
  event_type TEXT NOT NULL,
  payload TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (session_id) REFERENCES tour_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (poi_id) REFERENCES tour_pois(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tour_events_session ON tour_events(session_id);
CREATE INDEX IF NOT EXISTS idx_tour_events_farm ON tour_events(farm_id);
CREATE INDEX IF NOT EXISTS idx_tour_events_type ON tour_events(event_type);

-- Visitor comments on POIs
CREATE TABLE IF NOT EXISTS tour_comments (
  id TEXT PRIMARY KEY,
  poi_id TEXT NOT NULL,
  farm_id TEXT NOT NULL,
  session_id TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  moderation_score REAL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (poi_id) REFERENCES tour_pois(id) ON DELETE CASCADE,
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES tour_sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tour_comments_poi ON tour_comments(poi_id);
CREATE INDEX IF NOT EXISTS idx_tour_comments_farm ON tour_comments(farm_id);
CREATE INDEX IF NOT EXISTS idx_tour_comments_status ON tour_comments(status);
