-- Intelligent Blog System with Auto-Generation

-- Blog Posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  meta_description TEXT,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  author_id TEXT NOT NULL,
  published_at INTEGER,
  is_published INTEGER DEFAULT 0,
  is_ai_generated INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  read_time_minutes INTEGER DEFAULT 5,
  xp_reward INTEGER DEFAULT 15,
  seo_keywords TEXT,
  generation_prompt TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_ai ON blog_posts(is_ai_generated);

-- Blog Tags
CREATE TABLE IF NOT EXISTS blog_tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  post_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_blog_tags_slug ON blog_tags(slug);

-- Blog Post Tags (many-to-many)
CREATE TABLE IF NOT EXISTS blog_post_tags (
  blog_post_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (blog_post_id, tag_id),
  FOREIGN KEY (blog_post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES blog_tags(id) ON DELETE CASCADE
);

-- Blog Post Reads (track who read what for XP)
CREATE TABLE IF NOT EXISTS blog_post_reads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  blog_post_id TEXT NOT NULL,
  started_at INTEGER DEFAULT (unixepoch()),
  completed_at INTEGER,
  xp_earned INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (blog_post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
  UNIQUE(user_id, blog_post_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_reads_user ON blog_post_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_reads_post ON blog_post_reads(blog_post_id);

-- Blog Generation Queue (for scheduled posts)
CREATE TABLE IF NOT EXISTS blog_generation_queue (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  keywords TEXT,
  target_audience TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'generating', 'completed', 'failed')),
  generated_post_id TEXT,
  error_message TEXT,
  scheduled_for INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  completed_at INTEGER,
  FOREIGN KEY (generated_post_id) REFERENCES blog_posts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_blog_queue_status ON blog_generation_queue(status, scheduled_for);

-- Blog Generation Analytics
CREATE TABLE IF NOT EXISTS blog_generation_analytics (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  posts_generated INTEGER DEFAULT 0,
  posts_published INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  total_reads INTEGER DEFAULT 0,
  avg_read_time REAL DEFAULT 0,
  top_topics TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_blog_analytics_date ON blog_generation_analytics(date DESC);

-- Insert starter tags
INSERT OR IGNORE INTO blog_tags (id, name, slug, description) VALUES
  ('tag_permaculture', 'Permaculture', 'permaculture', 'Core permaculture principles and practices'),
  ('tag_gardening', 'Gardening', 'gardening', 'Garden design and techniques'),
  ('tag_sustainability', 'Sustainability', 'sustainability', 'Sustainable living practices'),
  ('tag_food_forests', 'Food Forests', 'food-forests', 'Food forest design and management'),
  ('tag_water', 'Water Management', 'water-management', 'Water conservation and harvesting'),
  ('tag_soil', 'Soil Health', 'soil-health', 'Soil building and composting'),
  ('tag_native_plants', 'Native Plants', 'native-plants', 'Native plant selection and guilds'),
  ('tag_urban', 'Urban Permaculture', 'urban-permaculture', 'City and small-space growing'),
  ('tag_climate', 'Climate Action', 'climate-action', 'Climate adaptation and resilience'),
  ('tag_community', 'Community', 'community', 'Social permaculture and cooperation');

-- Add blog reading badges
INSERT OR IGNORE INTO badges (id, name, description, icon_name, badge_type, tier, unlock_criteria) VALUES
  ('badge_blog_reader', 'Blog Explorer', 'Read your first blog post', '📖', 'foundation', 1, 'Read 1 blog post'),
  ('badge_avid_reader', 'Avid Reader', 'Read 10 blog posts', '📚', 'foundation', 2, 'Read 10 blog posts'),
  ('badge_blog_scholar', 'Knowledge Seeker', 'Read 25 blog posts', '🎓', 'mastery', 3, 'Read 25 blog posts'),
  ('badge_blog_master', 'Blog Master', 'Read 50 blog posts', '🔍', 'mastery', 4, 'Read 50 blog posts');

