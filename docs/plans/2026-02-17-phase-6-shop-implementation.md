# Phase 6 MVP: Farm Shop Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Farm Shop MVP — database schema, seller product management, and public storefront — without payments.

**Architecture:** Farm-embedded shop at `/farm/[id]/shop` for sellers; public storefront at `/shops/[farmId]`. Full DB schema lands upfront (including future Stripe/event fields). Universal product form for all categories. "Add to Cart" disabled with "Coming Soon" tooltip.

**Tech Stack:** Next.js 14 App Router, Turso/libSQL (`@libsql/client`), Better Auth, Tailwind + shadcn/ui, Cloudflare R2 (existing upload pattern in `app/api/users/me/avatar/route.ts`)

---

### Task 1: Database Migration + TypeScript Types

**Files:**
- Create: `lib/db/migrations/080_farm_shop.sql`
- Modify: `lib/db/schema.ts`

**Step 1: Create the migration file**

```sql
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
```

**Step 2: Run the migration**

```bash
turso db shell permacraft < lib/db/migrations/080_farm_shop.sql
```

Expected: No output, no errors. Verify:

```bash
turso db shell permacraft "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('shop_products','product_variants','cart_items','shop_orders','order_items','product_reviews','shop_notifications');"
```

Expected: All 7 table names listed.

**Step 3: Add TypeScript types to `lib/db/schema.ts`**

Append to the end of the file:

```typescript
// ─── Shop & Marketplace ───────────────────────────────────────────────────────

export interface ShopProduct {
  id: string;
  farm_id: string;
  name: string;
  slug: string;
  description: string | null;
  category: 'nursery_stock' | 'seeds' | 'vegetable_box' | 'cut_flowers' |
            'teas_herbs' | 'value_added' | 'tour' | 'event' | 'digital' | 'other';
  price_cents: number;
  compare_at_price_cents: number | null;
  currency: string;
  track_inventory: number;
  quantity_in_stock: number;
  allow_backorder: number;
  species_id: string | null;
  variety_id: string | null;
  image_url: string | null;
  gallery_urls: string | null;
  weight_oz: number | null;
  ships_to: string;
  shipping_note: string | null;
  event_date: number | null;
  event_end_date: number | null;
  event_location: string | null;
  event_capacity: number | null;
  event_registered: number;
  digital_file_url: string | null;
  tags: string | null;
  is_featured: number;
  is_published: number;
  sort_order: number;
  view_count: number;
  rating_avg: number;
  rating_count: number;
  created_at: number;
  updated_at: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  price_cents: number;
  quantity_in_stock: number;
  sku: string | null;
  sort_order: number;
  created_at: number;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  added_at: number;
}

export interface ShopOrder {
  id: string;
  order_number: string;
  farm_id: string;
  buyer_id: string;
  status: 'pending' | 'paid' | 'confirmed' | 'preparing' | 'shipped' |
          'out_for_delivery' | 'delivered' | 'completed' | 'cancelled' | 'refunded';
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  fulfillment_type: 'shipping' | 'pickup' | 'delivery' | 'digital' | 'event' | null;
  shipping_address: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  pickup_date: number | null;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  order_notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  created_at: number;
}

export interface ProductReview {
  id: string;
  product_id: string;
  reviewer_id: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  image_urls: string | null;
  helpful_count: number;
  is_verified_purchase: number;
  created_at: number;
  updated_at: number;
}

export interface ShopNotification {
  id: string;
  user_id: string;
  notification_type: string;
  order_id: string | null;
  product_id: string | null;
  farm_id: string | null;
  triggered_by_user_id: string | null;
  content_preview: string | null;
  is_read: number;
  created_at: number;
}
```

**Step 4: Verify build**

```bash
npm run build 2>&1 | grep -E "error TS|Error" | head -20
```

Expected: No TypeScript errors.

**Step 5: Commit**

```bash
git add lib/db/migrations/080_farm_shop.sql lib/db/schema.ts
git commit -m "feat(shop-6A): add farm shop database schema and TypeScript types"
```

---

### Task 2: Shop Settings API

**Files:**
- Create: `app/api/shops/[farmId]/settings/route.ts`

**Step 1: Create the route**

```typescript
// app/api/shops/[farmId]/settings/route.ts
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { z } from 'zod';

const SettingsSchema = z.object({
  is_shop_enabled: z.number().int().min(0).max(1).optional(),
  shop_headline: z.string().max(200).optional().nullable(),
  shop_banner_url: z.string().url().optional().nullable(),
  shop_policy: z.string().optional().nullable(),
  accepts_pickup: z.number().int().min(0).max(1).optional(),
  accepts_shipping: z.number().int().min(0).max(1).optional(),
  accepts_delivery: z.number().int().min(0).max(1).optional(),
  delivery_radius_miles: z.number().positive().optional().nullable(),
});

async function verifyOwnership(farmId: string, userId: string) {
  const result = await db.execute({
    sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
    args: [farmId, userId],
  });
  return result.rows.length > 0;
}

export async function GET(
  _req: Request,
  { params }: { params: { farmId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) return new Response('Unauthorized', { status: 401 });

  const owned = await verifyOwnership(params.farmId, session.user.id);
  if (!owned) return new Response('Forbidden', { status: 403 });

  const result = await db.execute({
    sql: `SELECT id, name, is_shop_enabled, shop_headline, shop_banner_url,
                 shop_policy, accepts_pickup, accepts_shipping, accepts_delivery,
                 delivery_radius_miles
          FROM farms WHERE id = ?`,
    args: [params.farmId],
  });

  if (!result.rows[0]) return new Response('Not found', { status: 404 });
  return Response.json(result.rows[0]);
}

export async function PATCH(
  req: Request,
  { params }: { params: { farmId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) return new Response('Unauthorized', { status: 401 });

  const owned = await verifyOwnership(params.farmId, session.user.id);
  if (!owned) return new Response('Forbidden', { status: 403 });

  const body = await req.json();
  const parsed = SettingsSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error, { status: 400 });

  const data = parsed.data;
  const fields = (Object.keys(data) as (keyof typeof data)[]).filter(
    (k) => data[k] !== undefined
  );
  if (fields.length === 0) return new Response('No fields to update', { status: 400 });

  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => data[f] ?? null);

  await db.execute({
    sql: `UPDATE farms SET ${setClauses}, updated_at = unixepoch() WHERE id = ?`,
    args: [...values, params.farmId],
  });

  return Response.json({ ok: true });
}
```

**Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error TS|Error" | head -10
```

**Step 3: Commit**

```bash
git add app/api/shops/
git commit -m "feat(shop-6C): add shop settings API (GET/PATCH)"
```

---

### Task 3: Products API

**Files:**
- Create: `app/api/shops/[farmId]/products/route.ts`
- Create: `app/api/shops/[farmId]/products/[productId]/route.ts`

**Step 1: Create the products list/create route**

```typescript
// app/api/shops/[farmId]/products/route.ts
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { z } from 'zod';

const CATEGORIES = ['nursery_stock','seeds','vegetable_box','cut_flowers',
  'teas_herbs','value_added','tour','event','digital','other'] as const;

const ProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  category: z.enum(CATEGORIES),
  price_cents: z.number().int().positive(),
  compare_at_price_cents: z.number().int().positive().optional().nullable(),
  quantity_in_stock: z.number().int().min(0).default(0),
  image_url: z.string().url().optional().nullable(),
  tags: z.string().optional().nullable(),
  is_published: z.number().int().min(0).max(1).default(1),
});

async function verifyOwnership(farmId: string, userId: string) {
  const result = await db.execute({
    sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
    args: [farmId, userId],
  });
  return result.rows.length > 0;
}

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
}

export async function GET(
  _req: Request,
  { params }: { params: { farmId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) return new Response('Unauthorized', { status: 401 });

  const owned = await verifyOwnership(params.farmId, session.user.id);
  if (!owned) return new Response('Forbidden', { status: 403 });

  const result = await db.execute({
    sql: 'SELECT * FROM shop_products WHERE farm_id = ? ORDER BY sort_order ASC, created_at DESC',
    args: [params.farmId],
  });
  return Response.json(result.rows);
}

export async function POST(
  req: Request,
  { params }: { params: { farmId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) return new Response('Unauthorized', { status: 401 });

  const owned = await verifyOwnership(params.farmId, session.user.id);
  if (!owned) return new Response('Forbidden', { status: 403 });

  const body = await req.json();
  const parsed = ProductSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error, { status: 400 });

  const { name, description, category, price_cents, compare_at_price_cents,
          quantity_in_stock, image_url, tags, is_published } = parsed.data;

  const id = crypto.randomUUID();
  let slug = generateSlug(name);

  // Ensure slug uniqueness within farm
  const existing = await db.execute({
    sql: 'SELECT slug FROM shop_products WHERE farm_id = ? AND slug LIKE ?',
    args: [params.farmId, `${slug}%`],
  });
  if (existing.rows.length > 0) slug = `${slug}-${Date.now()}`;

  await db.execute({
    sql: `INSERT INTO shop_products
            (id, farm_id, name, slug, description, category, price_cents,
             compare_at_price_cents, quantity_in_stock, image_url, tags, is_published)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, params.farmId, name, slug, description ?? null, category, price_cents,
           compare_at_price_cents ?? null, quantity_in_stock, image_url ?? null,
           tags ?? null, is_published],
  });

  const product = await db.execute({
    sql: 'SELECT * FROM shop_products WHERE id = ?',
    args: [id],
  });
  return Response.json(product.rows[0], { status: 201 });
}
```

**Step 2: Create the single product CRUD route**

```typescript
// app/api/shops/[farmId]/products/[productId]/route.ts
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { z } from 'zod';

const CATEGORIES = ['nursery_stock','seeds','vegetable_box','cut_flowers',
  'teas_herbs','value_added','tour','event','digital','other'] as const;

const UpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  category: z.enum(CATEGORIES).optional(),
  price_cents: z.number().int().positive().optional(),
  compare_at_price_cents: z.number().int().positive().optional().nullable(),
  quantity_in_stock: z.number().int().min(0).optional(),
  image_url: z.string().url().optional().nullable(),
  tags: z.string().optional().nullable(),
  is_published: z.number().int().min(0).max(1).optional(),
  is_featured: z.number().int().min(0).max(1).optional(),
  sort_order: z.number().int().optional(),
});

async function verifyOwnership(farmId: string, userId: string) {
  const result = await db.execute({
    sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
    args: [farmId, userId],
  });
  return result.rows.length > 0;
}

export async function GET(
  _req: Request,
  { params }: { params: { farmId: string; productId: string } }
) {
  // Public endpoint — no auth required
  const result = await db.execute({
    sql: `SELECT p.*, f.name as farm_name, f.is_shop_enabled
          FROM shop_products p
          JOIN farms f ON f.id = p.farm_id
          WHERE p.id = ? AND p.farm_id = ? AND p.is_published = 1 AND f.is_shop_enabled = 1`,
    args: [params.productId, params.farmId],
  });
  if (!result.rows[0]) return new Response('Not found', { status: 404 });

  // Increment view count
  await db.execute({
    sql: 'UPDATE shop_products SET view_count = view_count + 1 WHERE id = ?',
    args: [params.productId],
  });
  return Response.json(result.rows[0]);
}

export async function PATCH(
  req: Request,
  { params }: { params: { farmId: string; productId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) return new Response('Unauthorized', { status: 401 });

  const owned = await verifyOwnership(params.farmId, session.user.id);
  if (!owned) return new Response('Forbidden', { status: 403 });

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error, { status: 400 });

  const data = parsed.data;
  const fields = (Object.keys(data) as (keyof typeof data)[]).filter(
    (k) => data[k] !== undefined
  );
  if (fields.length === 0) return new Response('No fields to update', { status: 400 });

  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => data[f] ?? null);

  await db.execute({
    sql: `UPDATE shop_products SET ${setClauses}, updated_at = unixepoch()
          WHERE id = ? AND farm_id = ?`,
    args: [...values, params.productId, params.farmId],
  });

  const updated = await db.execute({
    sql: 'SELECT * FROM shop_products WHERE id = ?',
    args: [params.productId],
  });
  return Response.json(updated.rows[0]);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { farmId: string; productId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) return new Response('Unauthorized', { status: 401 });

  const owned = await verifyOwnership(params.farmId, session.user.id);
  if (!owned) return new Response('Forbidden', { status: 403 });

  await db.execute({
    sql: 'DELETE FROM shop_products WHERE id = ? AND farm_id = ?',
    args: [params.productId, params.farmId],
  });
  return new Response(null, { status: 204 });
}
```

**Step 3: Verify build**

```bash
npm run build 2>&1 | grep -E "error TS|Error" | head -10
```

**Step 4: Commit**

```bash
git add app/api/shops/
git commit -m "feat(shop-6C): add products API (list, create, get, update, delete)"
```

---

### Task 4: Public Shops API

**Files:**
- Create: `app/api/shops/route.ts`
- Create: `app/api/shops/[farmId]/route.ts`

**Step 1: Create the shop directory API**

```typescript
// app/api/shops/route.ts
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const search = searchParams.get('q');

  let sql = `
    SELECT
      f.id, f.name, f.description, f.center_lat, f.center_lng, f.climate_zone,
      f.shop_headline, f.shop_banner_url,
      COUNT(DISTINCT p.id) as product_count,
      COALESCE(AVG(p.rating_avg), 0) as avg_rating
    FROM farms f
    LEFT JOIN shop_products p ON p.farm_id = f.id AND p.is_published = 1
    WHERE f.is_shop_enabled = 1 AND f.is_public = 1
  `;
  const args: (string | number)[] = [];

  if (category) {
    sql += ' AND EXISTS (SELECT 1 FROM shop_products WHERE farm_id = f.id AND category = ? AND is_published = 1)';
    args.push(category);
  }
  if (search) {
    sql += ' AND (f.name LIKE ? OR f.shop_headline LIKE ?)';
    args.push(`%${search}%`, `%${search}%`);
  }

  sql += ' GROUP BY f.id ORDER BY product_count DESC LIMIT 50';

  const result = await db.execute({ sql, args });
  return Response.json(result.rows);
}
```

**Step 2: Create the shop storefront API**

```typescript
// app/api/shops/[farmId]/route.ts
import { db } from '@/lib/db';

export async function GET(
  _req: Request,
  { params }: { params: { farmId: string } }
) {
  const farmResult = await db.execute({
    sql: `SELECT id, name, description, center_lat, center_lng, climate_zone,
                 is_shop_enabled, shop_headline, shop_banner_url, shop_policy,
                 accepts_pickup, accepts_shipping, accepts_delivery
          FROM farms WHERE id = ? AND is_shop_enabled = 1 AND is_public = 1`,
    args: [params.farmId],
  });
  if (!farmResult.rows[0]) return new Response('Shop not found', { status: 404 });

  const productsResult = await db.execute({
    sql: `SELECT * FROM shop_products
          WHERE farm_id = ? AND is_published = 1
          ORDER BY is_featured DESC, sort_order ASC, created_at DESC`,
    args: [params.farmId],
  });

  return Response.json({ shop: farmResult.rows[0], products: productsResult.rows });
}
```

**Step 3: Verify build**

```bash
npm run build 2>&1 | grep -E "error TS|Error" | head -10
```

**Step 4: Commit**

```bash
git add app/api/shops/route.ts app/api/shops/[farmId]/route.ts
git commit -m "feat(shop-6D): add public shop directory and storefront APIs"
```

---

### Task 5: Product Image Upload API

**Files:**
- Create: `app/api/shops/[farmId]/products/upload/route.ts`

**Step 1: Read the existing avatar upload route for the R2 pattern**

Read `app/api/users/me/avatar/route.ts` to confirm the exact env var names (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`) and the public URL pattern used.

**Step 2: Create the upload route**

```typescript
// app/api/shops/[farmId]/products/upload/route.ts
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function verifyOwnership(farmId: string, userId: string) {
  const result = await db.execute({
    sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
    args: [farmId, userId],
  });
  return result.rows.length > 0;
}

export async function POST(
  req: Request,
  { params }: { params: { farmId: string } }
) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) return new Response('Unauthorized', { status: 401 });

  const owned = await verifyOwnership(params.farmId, session.user.id);
  if (!owned) return new Response('Forbidden', { status: 403 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return new Response('No file provided', { status: 400 });
  if (!file.type.startsWith('image/')) return new Response('File must be an image', { status: 400 });
  if (file.size > 5 * 1024 * 1024) return new Response('File too large (max 5MB)', { status: 400 });

  const ext = file.name.split('.').pop() || 'jpg';
  const key = `shops/${params.farmId}/products/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: file.type,
  }));

  // Use same public URL pattern as avatar upload — check avatar route for exact format
  const url = `${process.env.R2_PUBLIC_URL}/${key}`;
  return Response.json({ url });
}
```

Note: After reading the avatar route in Step 1, adjust the public URL construction if the pattern differs.

**Step 3: Verify build**

```bash
npm run build 2>&1 | grep -E "error TS|Error" | head -10
```

**Step 4: Commit**

```bash
git add app/api/shops/
git commit -m "feat(shop-6C): add product image upload API"
```

---

### Task 6: Shop Settings Form Component

**Files:**
- Create: `components/shop/seller/shop-settings-form.tsx`

**Step 1: Create the component**

```tsx
// components/shop/seller/shop-settings-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

interface ShopSettings {
  id: string;
  name: string;
  is_shop_enabled: number;
  shop_headline: string | null;
  shop_policy: string | null;
  accepts_pickup: number;
  accepts_shipping: number;
  accepts_delivery: number;
}

export function ShopSettingsForm({ farmId, initial }: { farmId: string; initial: ShopSettings }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    is_shop_enabled: initial.is_shop_enabled === 1,
    shop_headline: initial.shop_headline ?? '',
    shop_policy: initial.shop_policy ?? '',
    accepts_pickup: initial.accepts_pickup === 1,
    accepts_shipping: initial.accepts_shipping === 1,
    accepts_delivery: initial.accepts_delivery === 1,
  });

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/shops/${farmId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_shop_enabled: settings.is_shop_enabled ? 1 : 0,
          shop_headline: settings.shop_headline || null,
          shop_policy: settings.shop_policy || null,
          accepts_pickup: settings.accepts_pickup ? 1 : 0,
          accepts_shipping: settings.accepts_shipping ? 1 : 0,
          accepts_delivery: settings.accepts_delivery ? 1 : 0,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      toast({ title: 'Shop settings saved' });
      router.refresh();
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shop Settings</CardTitle>
        <CardDescription>Configure your farm storefront</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-medium">Enable Shop</Label>
            <p className="text-sm text-muted-foreground">Make your storefront publicly visible</p>
          </div>
          <Switch
            checked={settings.is_shop_enabled}
            onCheckedChange={(v) => setSettings((s) => ({ ...s, is_shop_enabled: v }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Shop Headline</Label>
          <Input
            placeholder="Fresh organic produce from our family farm"
            value={settings.shop_headline}
            onChange={(e) => setSettings((s) => ({ ...s, shop_headline: e.target.value }))}
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          <Label>Shipping & Returns Policy</Label>
          <Textarea
            placeholder="Describe your shipping times, return policy, pickup options..."
            value={settings.shop_policy}
            onChange={(e) => setSettings((s) => ({ ...s, shop_policy: e.target.value }))}
            rows={4}
          />
        </div>

        <div className="space-y-3">
          <Label className="text-base font-medium">Fulfillment Methods</Label>
          {[
            { key: 'accepts_shipping' as const, label: 'Shipping', desc: 'Ship products to customers' },
            { key: 'accepts_pickup' as const, label: 'Local Pickup', desc: 'Customers pick up from your farm' },
            { key: 'accepts_delivery' as const, label: 'Local Delivery', desc: 'You deliver to nearby customers' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch
                checked={settings[key]}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, [key]: v }))}
              />
            </div>
          ))}
        </div>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error TS|Error" | head -10
```

**Step 3: Commit**

```bash
git add components/shop/
git commit -m "feat(shop-6C): add ShopSettingsForm component"
```

---

### Task 7: Product Form Component

**Files:**
- Create: `components/shop/seller/product-form.tsx`

**Step 1: Create the component**

```tsx
// components/shop/seller/product-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import type { ShopProduct } from '@/lib/db/schema';

const CATEGORIES = [
  { value: 'nursery_stock', label: 'Nursery Stock' },
  { value: 'seeds', label: 'Seeds' },
  { value: 'vegetable_box', label: 'Vegetable Box' },
  { value: 'cut_flowers', label: 'Cut Flowers' },
  { value: 'teas_herbs', label: 'Teas & Herbs' },
  { value: 'value_added', label: 'Value-Added' },
  { value: 'tour', label: 'Tour' },
  { value: 'event', label: 'Event' },
  { value: 'digital', label: 'Digital' },
  { value: 'other', label: 'Other' },
] as const;

interface ProductFormProps {
  farmId: string;
  product?: ShopProduct;
}

export function ProductForm({ farmId, product }: ProductFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    category: product?.category ?? 'other',
    price: product ? (product.price_cents / 100).toFixed(2) : '',
    compare_at_price: product?.compare_at_price_cents
      ? (product.compare_at_price_cents / 100).toFixed(2)
      : '',
    quantity_in_stock: product?.quantity_in_stock ?? 0,
    image_url: product?.image_url ?? '',
    tags: product?.tags ?? '',
    is_published: product ? product.is_published === 1 : true,
  });

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/shops/${farmId}/products/upload`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();
      setForm((f) => ({ ...f, image_url: url }));
      toast({ title: 'Image uploaded' });
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name.trim() || !form.price || !form.category) {
      toast({ title: 'Name, price, and category are required', variant: 'destructive' });
      return;
    }
    const price_cents = Math.round(parseFloat(form.price) * 100);
    if (isNaN(price_cents) || price_cents <= 0) {
      toast({ title: 'Invalid price', variant: 'destructive' });
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category,
      price_cents,
      compare_at_price_cents: form.compare_at_price
        ? Math.round(parseFloat(form.compare_at_price) * 100)
        : null,
      quantity_in_stock: form.quantity_in_stock,
      image_url: form.image_url || null,
      tags: form.tags.trim() || null,
      is_published: form.is_published ? 1 : 0,
    };

    setSaving(true);
    try {
      const url = product
        ? `/api/shops/${farmId}/products/${product.id}`
        : `/api/shops/${farmId}/products`;
      const res = await fetch(url, {
        method: product ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Save failed');
      toast({ title: product ? 'Product updated' : 'Product created' });
      router.push(`/farm/${farmId}/shop`);
      router.refresh();
    } catch {
      toast({ title: 'Failed to save product', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{product ? 'Edit Product' : 'New Product'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Product Name *</Label>
          <Input
            placeholder="Heritage Tomato Seeds"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          <Label>Category *</Label>
          <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Price (USD) *</Label>
            <Input type="number" min="0.01" step="0.01" placeholder="24.99"
              value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Compare-at Price</Label>
            <Input type="number" min="0.01" step="0.01" placeholder="34.99"
              value={form.compare_at_price}
              onChange={(e) => setForm((f) => ({ ...f, compare_at_price: e.target.value }))} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea placeholder="Describe your product..." value={form.description} rows={4}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>

        <div className="space-y-2">
          <Label>Product Image</Label>
          {form.image_url && (
            <img src={form.image_url} alt="Product" className="w-32 h-32 object-cover rounded-lg border" />
          )}
          <Input type="file" accept="image/*" disabled={uploading}
            onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadImage(file); }} />
          {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
        </div>

        <div className="space-y-2">
          <Label>Stock Quantity</Label>
          <Input type="number" min="0" value={form.quantity_in_stock}
            onChange={(e) => setForm((f) => ({ ...f, quantity_in_stock: parseInt(e.target.value) || 0 }))} />
        </div>

        <div className="space-y-2">
          <Label>Tags (comma-separated)</Label>
          <Input placeholder="heirloom, organic, native" value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-medium">Published</Label>
            <p className="text-sm text-muted-foreground">Visible on your public storefront</p>
          </div>
          <Switch checked={form.is_published}
            onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))} />
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={save} disabled={saving || uploading} className="flex-1">
            {saving ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
          </Button>
          <Button variant="outline" onClick={() => router.push(`/farm/${farmId}/shop`)}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error TS|Error" | head -10
```

**Step 3: Commit**

```bash
git add components/shop/
git commit -m "feat(shop-6C): add universal ProductForm component"
```

---

### Task 8: Product Table Component

**Files:**
- Create: `components/shop/seller/product-table.tsx`

**Step 1: Create the component**

```tsx
// components/shop/seller/product-table.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Pencil, Trash2, Eye, EyeOff, Plus } from 'lucide-react';
import type { ShopProduct } from '@/lib/db/schema';

const CATEGORY_LABELS: Record<string, string> = {
  nursery_stock: 'Nursery Stock', seeds: 'Seeds', vegetable_box: 'Veg Box',
  cut_flowers: 'Flowers', teas_herbs: 'Teas & Herbs', value_added: 'Value-Added',
  tour: 'Tour', event: 'Event', digital: 'Digital', other: 'Other',
};

export function ProductTable({ farmId, initialProducts }: { farmId: string; initialProducts: ShopProduct[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const patch = async (productId: string, data: object) => {
    const res = await fetch(`/api/shops/${farmId}/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Update failed');
    return res.json();
  };

  const togglePublished = async (product: ShopProduct) => {
    setUpdatingId(product.id);
    try {
      const updated = await patch(product.id, { is_published: product.is_published === 1 ? 0 : 1 });
      setProducts((ps) => ps.map((p) => (p.id === product.id ? updated : p)));
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  const updateStock = async (product: ShopProduct, qty: number) => {
    try {
      await patch(product.id, { quantity_in_stock: qty });
      setProducts((ps) => ps.map((p) => (p.id === product.id ? { ...p, quantity_in_stock: qty } : p)));
    } catch {
      toast({ title: 'Failed to update stock', variant: 'destructive' });
    }
  };

  const deleteProduct = async (product: ShopProduct) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await fetch(`/api/shops/${farmId}/products/${product.id}`, { method: 'DELETE' });
      setProducts((ps) => ps.filter((p) => p.id !== product.id));
      toast({ title: 'Product deleted' });
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground mb-4">No products yet</p>
        <Link href={`/farm/${farmId}/shop/products/new`}>
          <Button><Plus className="w-4 h-4 mr-2" />Add Your First Product</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {products.map((product) => (
        <div key={product.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded-md flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 bg-muted rounded-md flex-shrink-0 flex items-center justify-center text-xl">🌱</div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{product.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[product.category] || product.category}</Badge>
              <span className="text-sm font-semibold">${(product.price_cents / 100).toFixed(2)}</span>
              {product.is_published === 0 && <Badge variant="outline" className="text-xs text-muted-foreground">Draft</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Input type="number" min="0" className="w-16 h-8 text-center text-sm"
              value={product.quantity_in_stock}
              onChange={(e) => updateStock(product, parseInt(e.target.value) || 0)}
              title="Stock quantity" />
            <span className="text-xs text-muted-foreground">in stock</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" disabled={updatingId === product.id}
              onClick={() => togglePublished(product)}
              title={product.is_published === 1 ? 'Unpublish' : 'Publish'}>
              {product.is_published === 1
                ? <Eye className="w-4 h-4 text-green-600" />
                : <EyeOff className="w-4 h-4 text-muted-foreground" />}
            </Button>
            <Link href={`/farm/${farmId}/shop/products/${product.id}/edit`}>
              <Button variant="ghost" size="sm"><Pencil className="w-4 h-4" /></Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => deleteProduct(product)}
              className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error TS|Error" | head -10
```

**Step 3: Commit**

```bash
git add components/shop/
git commit -m "feat(shop-6C): add ProductTable component with inline editing"
```

---

### Task 9: Shop Dashboard Page

**Files:**
- Create: `app/(app)/farm/[id]/shop/page.tsx`

**Step 1: Create the page**

```tsx
// app/(app)/farm/[id]/shop/page.tsx
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShopSettingsForm } from '@/components/shop/seller/shop-settings-form';
import { ProductTable } from '@/components/shop/seller/product-table';
import { Plus, ExternalLink } from 'lucide-react';
import type { ShopProduct } from '@/lib/db/schema';

export default async function ShopDashboardPage({ params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) redirect('/login');

  const farmResult = await db.execute({
    sql: `SELECT id, name, is_shop_enabled, shop_headline, shop_banner_url, shop_policy,
                 accepts_pickup, accepts_shipping, accepts_delivery, delivery_radius_miles
          FROM farms WHERE id = ? AND user_id = ?`,
    args: [params.id, session.user.id],
  });
  if (!farmResult.rows[0]) notFound();

  const farm = farmResult.rows[0] as any;

  const productsResult = await db.execute({
    sql: 'SELECT * FROM shop_products WHERE farm_id = ? ORDER BY sort_order ASC, created_at DESC',
    args: [params.id],
  });
  const products = productsResult.rows as unknown as ShopProduct[];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{farm.name} — Shop</h1>
          <p className="text-muted-foreground">Manage your farm storefront</p>
        </div>
        <div className="flex items-center gap-3">
          {farm.is_shop_enabled === 1 && (
            <Link href={`/shops/${params.id}`} target="_blank">
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />View Storefront
              </Button>
            </Link>
          )}
          <Link href={`/farm/${params.id}/shop/products/new`}>
            <Button><Plus className="w-4 h-4 mr-2" />Add Product</Button>
          </Link>
        </div>
      </div>

      <ShopSettingsForm farmId={params.id} initial={farm} />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Products ({products.length})</h2>
          <Link href={`/farm/${params.id}/shop/products/new`}>
            <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-2" />Add Product</Button>
          </Link>
        </div>
        <ProductTable farmId={params.id} initialProducts={products} />
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error TS|Error" | head -10
```

**Step 3: Commit**

```bash
git add app/\(app\)/farm/
git commit -m "feat(shop-6C): add shop dashboard page"
```

---

### Task 10: Create and Edit Product Pages

**Files:**
- Create: `app/(app)/farm/[id]/shop/products/new/page.tsx`
- Create: `app/(app)/farm/[id]/shop/products/[productId]/edit/page.tsx`

**Step 1: Create new product page**

```tsx
// app/(app)/farm/[id]/shop/products/new/page.tsx
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { ProductForm } from '@/components/shop/seller/product-form';

export default async function NewProductPage({ params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) redirect('/login');

  const result = await db.execute({
    sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
    args: [params.id, session.user.id],
  });
  if (!result.rows[0]) notFound();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Add New Product</h1>
      <ProductForm farmId={params.id} />
    </div>
  );
}
```

**Step 2: Create edit product page**

```tsx
// app/(app)/farm/[id]/shop/products/[productId]/edit/page.tsx
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { ProductForm } from '@/components/shop/seller/product-form';
import type { ShopProduct } from '@/lib/db/schema';

export default async function EditProductPage({
  params,
}: {
  params: { id: string; productId: string };
}) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) redirect('/login');

  const farmResult = await db.execute({
    sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
    args: [params.id, session.user.id],
  });
  if (!farmResult.rows[0]) notFound();

  const productResult = await db.execute({
    sql: 'SELECT * FROM shop_products WHERE id = ? AND farm_id = ?',
    args: [params.productId, params.id],
  });
  if (!productResult.rows[0]) notFound();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Edit Product</h1>
      <ProductForm farmId={params.id} product={productResult.rows[0] as unknown as ShopProduct} />
    </div>
  );
}
```

**Step 3: Verify build**

```bash
npm run build 2>&1 | grep -E "error TS|Error" | head -10
```

**Step 4: Commit**

```bash
git add app/\(app\)/farm/
git commit -m "feat(shop-6C): add create and edit product pages"
```

---

### Task 11: Farm Page "Visit Shop" Integration

**Files:**
- Modify: `app/(app)/farm/[id]/page.tsx`

**Step 1: Read the farm page**

Read `app/(app)/farm/[id]/page.tsx` — find the existing farm SELECT query and the owner/header section.

**Step 2: Add `is_shop_enabled` to the farm query**

Find the SQL that fetches the farm and add `is_shop_enabled` to the SELECT list.

**Step 3: Add the buttons to the JSX**

Find where the farm name/header is rendered and the section where owner actions are shown. Add:

```tsx
import { ShoppingBag } from 'lucide-react';

// For all visitors — show "Visit Shop" if shop is enabled:
{farm.is_shop_enabled === 1 && (
  <Link href={`/shops/${params.id}`}>
    <Button variant="outline" size="sm">
      <ShoppingBag className="w-4 h-4 mr-2" />
      Visit Shop
    </Button>
  </Link>
)}

// For owners only (where isOwner / ownership check already exists):
{isOwner && (
  <Link href={`/farm/${params.id}/shop`}>
    <Button variant="ghost" size="sm">
      <ShoppingBag className="w-4 h-4 mr-2" />
      {farm.is_shop_enabled ? 'Manage Shop' : 'Open a Shop'}
    </Button>
  </Link>
)}
```

Follow the exact existing pattern for other owner-only buttons in the file.

**Step 4: Verify build**

```bash
npm run build 2>&1 | grep -E "error TS|Error" | head -10
```

**Step 5: Commit**

```bash
git add app/\(app\)/farm/
git commit -m "feat(shop-6C): add Visit Shop and Manage Shop buttons to farm page"
```

---

### Task 12: Shop Display Components

**Files:**
- Create: `components/shop/price-display.tsx`
- Create: `components/shop/shop-card.tsx`
- Create: `components/shop/product-card.tsx`

**Step 1: Create PriceDisplay**

```tsx
// components/shop/price-display.tsx
interface PriceDisplayProps {
  cents: number;
  compareAtCents?: number | null;
  className?: string;
}

export function PriceDisplay({ cents, compareAtCents, className }: PriceDisplayProps) {
  const price = `$${(cents / 100).toFixed(2)}`;
  const compareAt = compareAtCents ? `$${(compareAtCents / 100).toFixed(2)}` : null;
  return (
    <span className={className}>
      <span className="font-semibold">{price}</span>
      {compareAt && <span className="ml-2 text-muted-foreground line-through text-sm">{compareAt}</span>}
    </span>
  );
}
```

**Step 2: Create ShopCard**

```tsx
// components/shop/shop-card.tsx
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';

interface ShopCardProps {
  shop: {
    id: string;
    name: string;
    shop_headline: string | null;
    shop_banner_url: string | null;
    climate_zone: string | null;
    product_count: number;
  };
}

export function ShopCard({ shop }: ShopCardProps) {
  return (
    <Link href={`/shops/${shop.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
        <div className="h-32 bg-gradient-to-br from-green-100 to-emerald-50 relative">
          {shop.shop_banner_url && (
            <img src={shop.shop_banner_url} alt={shop.name} className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <h3 className="absolute bottom-2 left-3 font-bold text-white text-lg drop-shadow">{shop.name}</h3>
        </div>
        <CardContent className="p-3 space-y-2">
          {shop.shop_headline && (
            <p className="text-sm text-muted-foreground line-clamp-2">{shop.shop_headline}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3" />{shop.product_count} products
            </span>
            {shop.climate_zone && <Badge variant="secondary" className="text-xs">{shop.climate_zone}</Badge>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

**Step 3: Create ProductCard**

```tsx
// components/shop/product-card.tsx
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PriceDisplay } from './price-display';
import { ShoppingCart } from 'lucide-react';
import type { ShopProduct } from '@/lib/db/schema';

const CATEGORY_LABELS: Record<string, string> = {
  nursery_stock: 'Nursery Stock', seeds: 'Seeds', vegetable_box: 'Veg Box',
  cut_flowers: 'Flowers', teas_herbs: 'Teas & Herbs', value_added: 'Value-Added',
  tour: 'Tour', event: 'Event', digital: 'Digital', other: 'Other',
};

export function ProductCard({ product, farmId }: { product: ShopProduct; farmId: string }) {
  const inStock = product.quantity_in_stock > 0 || product.allow_backorder === 1;
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
      <Link href={`/shops/${farmId}/product/${product.slug}`} className="flex-1">
        <div className="aspect-square bg-muted relative overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🌱</div>
          )}
          {!inStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="secondary">Out of Stock</Badge>
            </div>
          )}
          {product.is_featured === 1 && (
            <Badge className="absolute top-2 left-2 bg-amber-500">Featured</Badge>
          )}
        </div>
        <CardContent className="p-3">
          <p className="font-medium text-sm line-clamp-2 mb-1">{product.name}</p>
          <Badge variant="secondary" className="text-xs mb-2">
            {CATEGORY_LABELS[product.category] || product.category}
          </Badge>
          <PriceDisplay cents={product.price_cents} compareAtCents={product.compare_at_price_cents} />
        </CardContent>
      </Link>
      <div className="px-3 pb-3">
        <Button className="w-full" size="sm" disabled title="Payments coming soon" variant="outline">
          <ShoppingCart className="w-4 h-4 mr-2" />Add to Cart
        </Button>
      </div>
    </Card>
  );
}
```

**Step 4: Verify build**

```bash
npm run build 2>&1 | grep -E "error TS|Error" | head -10
```

**Step 5: Commit**

```bash
git add components/shop/
git commit -m "feat(shop-6D): add PriceDisplay, ShopCard, ProductCard components"
```

---

### Task 13: Shop Directory Page

**Files:**
- Create: `app/(app)/shops/page.tsx`

**Step 1: Create the page**

```tsx
// app/(app)/shops/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShopCard } from '@/components/shop/shop-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Store } from 'lucide-react';

const CATEGORY_FILTERS = [
  { value: '', label: 'All' },
  { value: 'nursery_stock', label: 'Nursery Stock' },
  { value: 'seeds', label: 'Seeds' },
  { value: 'vegetable_box', label: 'Veg Boxes' },
  { value: 'cut_flowers', label: 'Cut Flowers' },
  { value: 'teas_herbs', label: 'Teas & Herbs' },
  { value: 'tour', label: 'Tours' },
  { value: 'event', label: 'Events' },
  { value: 'digital', label: 'Digital' },
];

export default function ShopsPage() {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const fetchShops = useCallback(async (q: string, cat: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (cat) params.set('category', cat);
      const res = await fetch(`/api/shops?${params}`);
      setShops(await res.json());
    } catch {
      setShops([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchShops('', ''); }, [fetchShops]);

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    fetchShops(search, cat);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Store className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Farm Shops</h1>
          <p className="text-muted-foreground">Buy directly from local permaculture farms</p>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); fetchShops(search, category); }} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search farms..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button type="submit">Search</Button>
      </form>

      <div className="flex gap-2 flex-wrap">
        {CATEGORY_FILTERS.map((f) => (
          <Button key={f.value} size="sm"
            variant={category === f.value ? 'default' : 'outline'}
            onClick={() => handleCategoryChange(f.value)}>
            {f.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : shops.length === 0 ? (
        <div className="text-center py-16">
          <Store className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No shops found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {shops.map((shop) => <ShopCard key={shop.id} shop={shop} />)}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error TS|Error" | head -10
```

**Step 3: Commit**

```bash
git add app/\(app\)/shops/
git commit -m "feat(shop-6D): add shop directory page"
```

---

### Task 14: Shop Storefront Page

**Files:**
- Create: `app/(app)/shops/[farmId]/page.tsx`

**Step 1: Create the page**

```tsx
// app/(app)/shops/[farmId]/page.tsx
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/shop/product-card';
import { Badge } from '@/components/ui/badge';
import { Truck, Package } from 'lucide-react';
import type { ShopProduct } from '@/lib/db/schema';

const CATEGORY_LABELS: Record<string, string> = {
  nursery_stock: 'Nursery Stock', seeds: 'Seeds', vegetable_box: 'Veg Box',
  cut_flowers: 'Cut Flowers', teas_herbs: 'Teas & Herbs', value_added: 'Value-Added',
  tour: 'Tours', event: 'Events', digital: 'Digital', other: 'Other',
};

async function getShop(farmId: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/shops/${farmId}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function ShopStorefrontPage({ params }: { params: { farmId: string } }) {
  const data = await getShop(params.farmId);
  if (!data) notFound();

  const { shop, products } = data as { shop: any; products: ShopProduct[] };
  const categories = [...new Set(products.map((p) => p.category))];
  const fulfillmentMethods = [
    shop.accepts_shipping && 'Ships nationwide',
    shop.accepts_pickup && 'Local pickup',
    shop.accepts_delivery && 'Local delivery',
  ].filter(Boolean) as string[];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="relative h-48 bg-gradient-to-br from-green-200 to-emerald-100 overflow-hidden">
        {shop.shop_banner_url && (
          <img src={shop.shop_banner_url} alt={shop.name} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-6">
          <h1 className="text-3xl font-bold text-white drop-shadow">{shop.name}</h1>
          {shop.shop_headline && <p className="text-white/90 mt-1 drop-shadow">{shop.shop_headline}</p>}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {fulfillmentMethods.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {fulfillmentMethods.map((m) => (
              <Badge key={m} variant="secondary" className="gap-1">
                <Truck className="w-3 h-3" />{m}
              </Badge>
            ))}
          </div>
        )}

        {categories.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <Badge key={cat} variant="outline">{CATEGORY_LABELS[cat] || cat}</Badge>
            ))}
          </div>
        )}

        {products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No products listed yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} farmId={params.farmId} />
            ))}
          </div>
        )}

        {shop.shop_policy && (
          <div className="border rounded-lg p-4 mt-4">
            <h3 className="font-semibold mb-2">Shop Policy</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{shop.shop_policy}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error TS|Error" | head -10
```

**Step 3: Commit**

```bash
git add app/\(app\)/shops/
git commit -m "feat(shop-6D): add shop storefront page"
```

---

### Task 15: Product Detail Page

**Files:**
- Create: `app/(app)/shops/[farmId]/product/[slug]/page.tsx`

**Step 1: Create the page**

```tsx
// app/(app)/shops/[farmId]/product/[slug]/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PriceDisplay } from '@/components/shop/price-display';
import { ShoppingCart, ArrowLeft, Package } from 'lucide-react';
import type { ShopProduct } from '@/lib/db/schema';

const CATEGORY_LABELS: Record<string, string> = {
  nursery_stock: 'Nursery Stock', seeds: 'Seeds', vegetable_box: 'Vegetable Box',
  cut_flowers: 'Cut Flowers', teas_herbs: 'Teas & Herbs', value_added: 'Value-Added',
  tour: 'Tour', event: 'Event', digital: 'Digital', other: 'Other',
};

async function getProductBySlug(farmId: string, slug: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/shops/${farmId}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json();
  const product = data.products.find((p: ShopProduct) => p.slug === slug);
  if (!product) return null;
  return { product, farmName: data.shop.name as string };
}

export default async function ProductDetailPage({
  params,
}: {
  params: { farmId: string; slug: string };
}) {
  const result = await getProductBySlug(params.farmId, params.slug);
  if (!result) notFound();

  const { product, farmName } = result;
  const inStock = product.quantity_in_stock > 0 || product.allow_backorder === 1;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link href={`/shops/${params.farmId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />Back to {farmName}
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="aspect-square bg-muted rounded-xl overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">🌱</div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <Badge variant="secondary" className="mb-2">
              {CATEGORY_LABELS[product.category] || product.category}
            </Badge>
            <h1 className="text-2xl font-bold">{product.name}</h1>
          </div>

          <PriceDisplay cents={product.price_cents} compareAtCents={product.compare_at_price_cents}
            className="text-2xl" />

          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            {inStock
              ? <span className="text-sm text-green-600 font-medium">In Stock ({product.quantity_in_stock} available)</span>
              : <span className="text-sm text-destructive font-medium">Out of Stock</span>}
          </div>

          <Button className="w-full" size="lg" disabled title="Payments coming soon — check back shortly!">
            <ShoppingCart className="w-5 h-5 mr-2" />
            Add to Cart
            <span className="ml-2 text-xs opacity-70">(Coming Soon)</span>
          </Button>

          {product.tags && (
            <div className="flex gap-2 flex-wrap">
              {product.tags.split(',').map((tag) => (
                <Badge key={tag.trim()} variant="outline" className="text-xs">{tag.trim()}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {product.description && (
        <div className="mt-8 border-t pt-6">
          <h2 className="text-lg font-semibold mb-3">Description</h2>
          <p className="text-muted-foreground whitespace-pre-wrap">{product.description}</p>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error TS|Error" | head -10
```

**Step 3: Commit**

```bash
git add app/\(app\)/shops/
git commit -m "feat(shop-6D): add product detail page"
```

---

### Task 16: Navigation Integration

**Files:**
- Modify: `components/shared/sidebar.tsx`
- Modify: `app/(app)/gallery/page.tsx`

**Step 1: Read sidebar and gallery files**

Read both files to understand the exact nav item patterns before editing.

**Step 2: Add "Shop" to sidebar**

In `components/shared/sidebar.tsx`, find the nav items list (look for Community and Learn items). Add a Shop entry between them, following the exact same pattern:

```tsx
import { Store } from 'lucide-react'; // add to existing imports

// In the nav items array/JSX, between Community and Learn:
{ href: '/shops', label: 'Shop', icon: Store },
// or as JSX — match the existing pattern exactly
```

**Step 3: Add "Shops" to gallery quick actions**

In `app/(app)/gallery/page.tsx`, find the "Following", "Saved", "Trending" buttons. Add a "Shops" button alongside them:

```tsx
import { Store } from 'lucide-react'; // add to imports

<Link href="/shops">
  <Button variant="outline" size="sm">
    <Store className="w-4 h-4 mr-2" />
    Shops
  </Button>
</Link>
```

**Step 4: Verify build**

```bash
npm run build 2>&1 | grep -E "error TS|Error" | head -10
```

**Step 5: Commit**

```bash
git add components/shared/sidebar.tsx app/\(app\)/gallery/page.tsx
git commit -m "feat(shop-6I): add Shop to sidebar nav and gallery quick actions"
```

---

### Task 17: Final Build Verification + Smoke Test

**Step 1: Full clean build**

```bash
npm run build
```

Expected: `✓ Compiled successfully`. Dynamic route warnings for auth-protected API routes are expected — not errors.

**Step 2: Smoke test locally**

```bash
npm run dev
```

Test sequence (use a real account):

1. Navigate to any farm you own → confirm "Manage Shop" button appears in the farm header
2. Click "Manage Shop" → `/farm/[id]/shop` loads with settings form and empty product table
3. Enable shop, set a headline → click "Save Settings" → toast confirms save
4. Click "Add Product" → fill in name, category ($9.99), stock (5) → "Create Product" → redirects to dashboard, product appears in table
5. Toggle publish/unpublish on the product → confirms instant update
6. Edit inline stock quantity → tab away → confirms save
7. Click "View Storefront" → `/shops/[farmId]` shows product grid
8. Click product card → product detail page with disabled "Add to Cart" button
9. Navigate to `/shops` → farm card appears after enabling shop
10. Category filter pills filter results correctly

**Step 3: Fix any issues found, commit**

```bash
git add -A
git commit -m "fix(shop): address issues from smoke test"
```

---

## File Summary

| Task | Files Created/Modified |
|---|---|
| 1 | `lib/db/migrations/080_farm_shop.sql`, `lib/db/schema.ts` |
| 2 | `app/api/shops/[farmId]/settings/route.ts` |
| 3 | `app/api/shops/[farmId]/products/route.ts`, `app/api/shops/[farmId]/products/[productId]/route.ts` |
| 4 | `app/api/shops/route.ts`, `app/api/shops/[farmId]/route.ts` |
| 5 | `app/api/shops/[farmId]/products/upload/route.ts` |
| 6 | `components/shop/seller/shop-settings-form.tsx` |
| 7 | `components/shop/seller/product-form.tsx` |
| 8 | `components/shop/seller/product-table.tsx` |
| 9 | `app/(app)/farm/[id]/shop/page.tsx` |
| 10 | `app/(app)/farm/[id]/shop/products/new/page.tsx`, `app/(app)/farm/[id]/shop/products/[productId]/edit/page.tsx` |
| 11 | `app/(app)/farm/[id]/page.tsx` (modified) |
| 12 | `components/shop/price-display.tsx`, `components/shop/shop-card.tsx`, `components/shop/product-card.tsx` |
| 13 | `app/(app)/shops/page.tsx` |
| 14 | `app/(app)/shops/[farmId]/page.tsx` |
| 15 | `app/(app)/shops/[farmId]/product/[slug]/page.tsx` |
| 16 | `components/shared/sidebar.tsx` (modified), `app/(app)/gallery/page.tsx` (modified) |
| 17 | Smoke test + final fixes |
