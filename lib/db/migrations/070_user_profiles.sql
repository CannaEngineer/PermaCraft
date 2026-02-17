-- Profile fields on users table
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN location TEXT;
ALTER TABLE users ADD COLUMN website TEXT;
ALTER TABLE users ADD COLUMN cover_image_url TEXT;
ALTER TABLE users ADD COLUMN social_links TEXT;       -- JSON: {twitter, github, instagram}
ALTER TABLE users ADD COLUMN interests TEXT;           -- JSON array
ALTER TABLE users ADD COLUMN experience_level TEXT CHECK(experience_level IN ('beginner','intermediate','advanced','expert'));
ALTER TABLE users ADD COLUMN climate_zone TEXT;
ALTER TABLE users ADD COLUMN profile_visibility TEXT DEFAULT 'public' CHECK(profile_visibility IN ('public','registered','private'));

-- User-to-user following (distinct from farm_follows)
CREATE TABLE IF NOT EXISTS user_follows (
  id TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL,
  followed_id TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (followed_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(follower_id, followed_id)
);
CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_followed ON user_follows(followed_id);

-- Allow posts in collections (existing table only has farm_id)
ALTER TABLE collection_items ADD COLUMN post_id TEXT REFERENCES farm_posts(id) ON DELETE CASCADE;
