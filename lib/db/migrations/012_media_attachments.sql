CREATE TABLE IF NOT EXISTS media_attachments (
  id TEXT PRIMARY KEY,
  annotation_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('image', 'video')),
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  uploaded_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_media_annotation
  ON media_attachments(annotation_id, display_order);
