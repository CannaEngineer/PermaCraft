-- Species Affiliate Links: External nursery links for plant sourcing
CREATE TABLE IF NOT EXISTS species_affiliate_links (
  id TEXT PRIMARY KEY,
  species_id TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  vendor_url TEXT NOT NULL,
  vendor_logo_url TEXT,
  product_name TEXT,
  price_range TEXT,
  link_type TEXT DEFAULT 'affiliate',
  affiliate_network TEXT,
  is_active INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  added_by TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_species_affiliate_links_species ON species_affiliate_links(species_id, is_active);
