-- Farm Tours System
-- Allows farm owners to create self-guided tours of their farm.
-- Visitors can take tours, and owners see analytics on visits.

CREATE TABLE IF NOT EXISTS farm_tours (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
  access_type TEXT NOT NULL DEFAULT 'public' CHECK(access_type IN ('public', 'link_only', 'password')),
  access_password TEXT,
  estimated_duration_minutes INTEGER,
  difficulty TEXT DEFAULT 'easy' CHECK(difficulty IN ('easy', 'moderate', 'challenging')),
  seasonal_notes TEXT,
  welcome_message TEXT,
  completion_message TEXT,
  allow_comments INTEGER DEFAULT 1,
  show_map INTEGER DEFAULT 1,
  visitor_count INTEGER DEFAULT 0,
  share_slug TEXT UNIQUE,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  published_at INTEGER,
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_farm_tours_farm ON farm_tours(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_tours_slug ON farm_tours(share_slug);
CREATE INDEX IF NOT EXISTS idx_farm_tours_status ON farm_tours(status);

CREATE TABLE IF NOT EXISTS tour_stops (
  id TEXT PRIMARY KEY,
  tour_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  rich_content TEXT,
  media_urls TEXT,
  lat REAL,
  lng REAL,
  radius_meters REAL DEFAULT 20,
  zone_id TEXT,
  planting_id TEXT,
  stop_type TEXT DEFAULT 'point_of_interest' CHECK(stop_type IN (
    'point_of_interest', 'garden_bed', 'water_feature', 'structure',
    'food_forest', 'animal_area', 'composting', 'welcome', 'farewell', 'custom'
  )),
  display_order INTEGER DEFAULT 0,
  is_optional INTEGER DEFAULT 0,
  audio_url TEXT,
  estimated_time_minutes INTEGER DEFAULT 3,
  seasonal_visibility TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (tour_id) REFERENCES farm_tours(id) ON DELETE CASCADE,
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tour_stops_tour ON tour_stops(tour_id, display_order ASC);

CREATE TABLE IF NOT EXISTS tour_visits (
  id TEXT PRIMARY KEY,
  tour_id TEXT NOT NULL,
  visitor_user_id TEXT,
  visitor_name TEXT,
  visitor_email TEXT,
  session_token TEXT,
  started_at INTEGER DEFAULT (unixepoch()),
  completed_at INTEGER,
  stops_visited TEXT,
  last_stop_id TEXT,
  rating INTEGER,
  feedback TEXT,
  device_type TEXT,
  referrer TEXT,
  FOREIGN KEY (tour_id) REFERENCES farm_tours(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tour_visits_tour ON tour_visits(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_visits_started ON tour_visits(started_at);
CREATE INDEX IF NOT EXISTS idx_tour_visits_session ON tour_visits(session_token);
