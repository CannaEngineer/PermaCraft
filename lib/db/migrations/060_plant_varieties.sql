-- lib/db/migrations/060_plant_varieties.sql
-- Plant varieties: cultivars, hybrids, and named selections

CREATE TABLE IF NOT EXISTS plant_varieties (
  id TEXT PRIMARY KEY,
  species_id TEXT NOT NULL,

  -- Identity
  variety_name TEXT NOT NULL, -- 'Honeycrisp', 'Liberty', 'Enterprise'
  common_aliases TEXT, -- JSON array ['Honeycrunch', 'Honey Crisp']
  patent_number TEXT, -- Plant patent if applicable
  introduction_year INTEGER, -- Year introduced/released

  -- Classification
  variety_type TEXT NOT NULL DEFAULT 'cultivar', -- 'cultivar', 'hybrid', 'heirloom', 'wild_selection'
  breeding_program TEXT, -- 'University of Minnesota', 'Stark Bros'

  -- Elite characteristics (JSON object)
  elite_characteristics TEXT, -- {"disease_resistance": ["scab", "fire_blight"], "flavor_profile": "sweet-tart", "storage_life": "excellent"}

  -- Awards & certifications (JSON array)
  awards TEXT, -- [{"name": "All-America Selections Winner", "year": 1985, "organization": "AAS"}]

  -- Performance data
  hardiness_zone_min TEXT,
  hardiness_zone_max TEXT,
  chill_hours_required INTEGER, -- For fruit trees
  days_to_maturity INTEGER, -- For annuals/vegetables
  yield_rating TEXT, -- 'low', 'medium', 'high', 'exceptional'

  -- Descriptive
  description TEXT,
  flavor_notes TEXT, -- For edibles
  color_description TEXT,
  size_description TEXT, -- 'large', 'medium', 'compact'

  -- Sourcing
  sourcing_notes TEXT, -- Where to buy, common nurseries
  average_price_usd REAL, -- Ballpark price
  availability TEXT, -- 'common', 'specialty', 'rare'

  -- Photos
  image_url TEXT, -- Main variety photo
  gallery_urls TEXT, -- JSON array of additional photos

  -- Ratings
  user_rating_avg REAL, -- Aggregated user ratings
  expert_rating INTEGER, -- 1-10 expert rating
  popularity_score INTEGER DEFAULT 0, -- Track selection count

  -- Meta
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  created_by TEXT, -- User ID who added it

  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_varieties_species ON plant_varieties(species_id);
CREATE INDEX IF NOT EXISTS idx_varieties_type ON plant_varieties(variety_type);
CREATE INDEX IF NOT EXISTS idx_varieties_rating ON plant_varieties(expert_rating DESC);

-- Sample data: Apple varieties
INSERT INTO plant_varieties (
  id,
  species_id,
  variety_name,
  variety_type,
  breeding_program,
  elite_characteristics,
  awards,
  description,
  flavor_notes,
  hardiness_zone_min,
  hardiness_zone_max,
  chill_hours_required,
  sourcing_notes,
  availability,
  expert_rating
) VALUES (
  'var-apple-honeycrisp',
  (SELECT id FROM species WHERE common_name = 'Apple' LIMIT 1),
  'Honeycrisp',
  'cultivar',
  'University of Minnesota',
  '{"disease_resistance": ["scab_moderate"], "storage_life": "excellent", "texture": "exceptionally_crisp", "cold_hardy": true}',
  '[{"name": "Best Apple Variety", "year": 2004, "organization": "American Pomological Society"}]',
  'Explosively crisp texture with balanced sweet-tart flavor. Excellent storage life and cold hardiness.',
  'Sweet-tart, honey notes, exceptionally juicy',
  '3',
  '8',
  800,
  'Widely available at nurseries. Try Stark Bros, Raintree Nursery, local garden centers.',
  'common',
  9
);
