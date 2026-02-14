CREATE TABLE IF NOT EXISTS external_links (
  id TEXT PRIMARY KEY,
  annotation_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_links_annotation
  ON external_links(annotation_id, display_order);
