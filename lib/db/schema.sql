-- Users (managed by Better Auth)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  password TEXT,
  emailVerified INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Sessions (managed by Better Auth)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Farms
CREATE TABLE IF NOT EXISTS farms (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  acres REAL,
  climate_zone TEXT,
  rainfall_inches REAL,
  soil_type TEXT,
  center_lat REAL NOT NULL,
  center_lng REAL NOT NULL,
  zoom_level REAL DEFAULT 15,
  is_public INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Zones
CREATE TABLE IF NOT EXISTS zones (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  name TEXT,
  zone_type TEXT NOT NULL,
  geometry TEXT NOT NULL, -- GeoJSON
  properties TEXT, -- JSON for colors, etc
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

-- Species
CREATE TABLE IF NOT EXISTS species (
  id TEXT PRIMARY KEY,
  common_name TEXT NOT NULL,
  scientific_name TEXT NOT NULL,
  layer TEXT NOT NULL, -- canopy, understory, shrub, herbaceous, groundcover, vine, root, aquatic
  native_regions TEXT, -- JSON array
  is_native INTEGER DEFAULT 1,
  years_to_maturity INTEGER,
  mature_height_ft REAL,
  mature_width_ft REAL,
  sun_requirements TEXT,
  water_requirements TEXT,
  hardiness_zones TEXT,
  description TEXT,
  contributed_by TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(scientific_name)
);

-- Plantings
CREATE TABLE IF NOT EXISTS plantings (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  zone_id TEXT,
  species_id TEXT NOT NULL,
  name TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  planted_year INTEGER,
  current_year INTEGER DEFAULT 0,
  notes TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL,
  FOREIGN KEY (species_id) REFERENCES species(id)
);

-- Map Snapshots
CREATE TABLE IF NOT EXISTS map_snapshots (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  snapshot_type TEXT NOT NULL, -- satellite, design, overlay
  url TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

-- AI Conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  title TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

-- AI Analyses
CREATE TABLE IF NOT EXISTS ai_analyses (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  conversation_id TEXT,
  user_query TEXT NOT NULL,
  screenshot_data TEXT, -- Base64 image data
  map_layer TEXT, -- satellite, street, terrain
  zones_context TEXT, -- JSON array of zone info at time of analysis
  ai_response TEXT NOT NULL,
  model TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE SET NULL
);

-- Farm Collaborators
CREATE TABLE IF NOT EXISTS farm_collaborators (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'viewer', -- owner, editor, viewer
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(farm_id, user_id)
);

-- Regional Knowledge
CREATE TABLE IF NOT EXISTS regional_knowledge (
  id TEXT PRIMARY KEY,
  region TEXT NOT NULL,
  climate_zone TEXT,
  knowledge_type TEXT NOT NULL, -- soil, climate, species, practice
  content TEXT NOT NULL,
  contributed_by TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON farms(user_id);
CREATE INDEX IF NOT EXISTS idx_zones_farm_id ON zones(farm_id);
CREATE INDEX IF NOT EXISTS idx_plantings_farm_id ON plantings(farm_id);
CREATE INDEX IF NOT EXISTS idx_plantings_species_id ON plantings(species_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_farm_id ON map_snapshots(farm_id);
CREATE INDEX IF NOT EXISTS idx_conversations_farm_id ON ai_conversations(farm_id);
CREATE INDEX IF NOT EXISTS idx_analyses_farm_id ON ai_analyses(farm_id);
CREATE INDEX IF NOT EXISTS idx_analyses_conversation_id ON ai_analyses(conversation_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_farm_id ON farm_collaborators(farm_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user_id ON farm_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_species_layer ON species(layer);
CREATE INDEX IF NOT EXISTS idx_species_native ON species(is_native);
