-- lib/db/migrations/080_farm_shop.sql

-- Shop columns on farms table
ALTER TABLE farms ADD COLUMN is_shop_enabled INTEGER DEFAULT 0;
ALTER TABLE farms ADD COLUMN shop_headline TEXT;
ALTER TABLE farms ADD COLUMN shop_banner_url TEXT;
ALTER TABLE farms ADD COLUMN shop_policy TEXT;
ALTER TABLE farms ADD COLUMN accepts_pickup INTEGER DEFAULT 0;
ALTER TABLE farms ADD COLUMN accepts_shipping INTEGER DEFAULT 0;
ALTER TABLE farms ADD COLUMN accepts_delivery INTEGER DEFAULT 0;
ALTER TABLE farms ADD COLUMN delivery_radius_miles REAL;
ALTER TABLE farms ADD COLUMN stripe_account_id TEXT;

-- Products
CREATE TABLE IF NOT EXISTS shop_products (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK(category IN (
    'nursery_stock','seeds','vegetable_box','cut_flowers',
    'teas_herbs','value_added','tour','event','digital','other'
  )),
  price_cents INTEGER NOT NULL,
  compare_at_price_cents INTEGER,
  currency TEXT DEFAULT 'usd',
  track_inventory INTEGER DEFAULT 1,
  quantity_in_stock INTEGER DEFAULT 0,
  allow_backorder INTEGER DEFAULT 0,
  species_id TEXT REFERENCES species(id),
  variety_id TEXT REFERENCES plant_varieties(id),
  image_url TEXT,
  gallery_urls TEXT,
  weight_oz REAL,
  ships_to TEXT DEFAULT 'us',
  shipping_note TEXT,
  event_date INTEGER,
  event_end_date INTEGER,
  event_location TEXT,
  event_capacity INTEGER,
  event_registered INTEGER DEFAULT 0,
  digital_file_url TEXT,
  tags TEXT,
  is_featured INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  rating_avg REAL DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);
CREATE INDEX idx_shop_products_farm ON shop_products(farm_id);
CREATE INDEX idx_shop_products_category ON shop_products(category);
CREATE INDEX idx_shop_products_published ON shop_products(is_published, farm_id);

-- Product variants
CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  quantity_in_stock INTEGER DEFAULT 0,
  sku TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (product_id) REFERENCES shop_products(id) ON DELETE CASCADE
);
CREATE INDEX idx_product_variants_product ON product_variants(product_id);

-- Cart items (for future checkout phase)
CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  added_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES shop_products(id) ON DELETE CASCADE,
  UNIQUE(user_id, product_id, variant_id)
);
CREATE INDEX idx_cart_items_user ON cart_items(user_id);

-- Orders (for future checkout phase)
CREATE TABLE IF NOT EXISTS shop_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  farm_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN (
    'pending','paid','confirmed','preparing','shipped','out_for_delivery',
    'delivered','completed','cancelled','refunded'
  )),
  subtotal_cents INTEGER NOT NULL,
  shipping_cents INTEGER DEFAULT 0,
  tax_cents INTEGER DEFAULT 0,
  total_cents INTEGER NOT NULL,
  fulfillment_type TEXT CHECK(fulfillment_type IN ('shipping','pickup','delivery','digital','event')),
  shipping_address TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  pickup_date INTEGER,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_phone TEXT,
  order_notes TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id),
  FOREIGN KEY (buyer_id) REFERENCES users(id)
);
CREATE INDEX idx_shop_orders_farm ON shop_orders(farm_id);
CREATE INDEX idx_shop_orders_buyer ON shop_orders(buyer_id);
CREATE INDEX idx_shop_orders_status ON shop_orders(status);

-- Order line items
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT,
  product_name TEXT NOT NULL,
  variant_name TEXT,
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (order_id) REFERENCES shop_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES shop_products(id)
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Product reviews (for future phase)
CREATE TABLE IF NOT EXISTS product_reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  order_id TEXT,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT,
  image_urls TEXT,
  helpful_count INTEGER DEFAULT 0,
  is_verified_purchase INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (product_id) REFERENCES shop_products(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id),
  UNIQUE(product_id, reviewer_id)
);
CREATE INDEX idx_product_reviews_product ON product_reviews(product_id);

-- Shop notifications (separate table to avoid CHECK constraint on existing notifications)
CREATE TABLE IF NOT EXISTS shop_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK(notification_type IN (
    'order_placed','order_confirmed','order_shipped','order_delivered',
    'order_cancelled','order_refunded',
    'new_product','restock','review_received','payout_sent',
    'event_reminder','event_cancelled'
  )),
  order_id TEXT,
  product_id TEXT,
  farm_id TEXT,
  triggered_by_user_id TEXT,
  content_preview TEXT,
  is_read INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_shop_notifications_user ON shop_notifications(user_id);
CREATE INDEX idx_shop_notifications_read ON shop_notifications(user_id, is_read);
