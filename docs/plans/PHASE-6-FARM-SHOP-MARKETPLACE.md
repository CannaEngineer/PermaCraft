# Phase 6: Farm Shop & Marketplace

> Turn every public farm into a storefront. Sell nursery stock, veg boxes, cut flowers, teas, tours, events, and more — directly to the community.

---

## Vision

Permaculture.Studio already connects growers through social features, maps, and learning. The shop closes the loop: **grow it, share it, sell it**. Every farm with `is_public = 1` can flip a switch and become a shop. Buyers discover farms by location, climate zone, or product type. Sellers manage everything from the same dashboard they already use to plan their designs.

### What you can sell

| Category | Examples | Fulfillment |
|---|---|---|
| **Nursery Stock** | Bare-root trees, potted perennials, rooted cuttings, grafted fruit trees | Ship or local pickup |
| **Seeds** | Open-pollinated, heirloom, native wildflower mixes | Ship |
| **Vegetable Boxes** | Weekly CSA-style boxes, one-off seasonal boxes | Local pickup / delivery |
| **Cut Flowers** | Bouquets, dried arrangements, flower subscriptions | Local pickup / delivery |
| **Teas & Herbs** | Dried herb blends, medicinal tinctures, tea sampler sets | Ship |
| **Value-Added** | Preserves, ferments, honey, mushroom kits, compost | Ship or local pickup |
| **Tours** | Farm walks, design consultations, foraging tours | On-site (date/time) |
| **Events** | Workshops, planting days, harvest festivals, kids camps | On-site (date/time) |
| **Digital** | Design templates, planting calendars, e-books, guild layouts | Instant download |

---

## Principles

1. **Farm-first, not Amazon** — Each shop is a farm's storefront, not a faceless listing. The farm's map, posts, and personality are the brand.
2. **Permaculture values** — Prioritize native species, organic practices, and local exchange. Show "miles from you" not just price.
3. **Low friction for sellers** — If you can create a post, you can list a product. Same editor patterns, same image upload.
4. **Community trust** — Reviews reuse the existing reaction+comment system. Follow a farm → get notified about new products and restocks.
5. **Location-aware** — Every farm has `center_lat/lng`. "Near me" discovery is built into the DNA.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  BUYER EXPERIENCE                               │
│                                                  │
│  Discover → Browse → Cart → Checkout → Track     │
│  (map/feed)  (shop)  (drawer)  (Stripe)  (order)│
└─────────────┬───────────────────────┬───────────┘
              │                       │
              │   Stripe Checkout     │   Stripe Webhooks
              │   Sessions            │   (payment confirmation)
              │                       │
┌─────────────┴───────────────────────┴───────────┐
│  SELLER EXPERIENCE                               │
│                                                  │
│  Enable Shop → List Products → Manage Orders     │
│  (farm settings) (product form) (order table)    │
└─────────────────────────────────────────────────┘
```

---

## Sub-Phase 6A: Database Schema & Types

### Migration: `lib/db/migrations/080_farm_shop.sql`

```sql
-- Enable shop on farms
ALTER TABLE farms ADD COLUMN is_shop_enabled INTEGER DEFAULT 0;
ALTER TABLE farms ADD COLUMN shop_headline TEXT;
ALTER TABLE farms ADD COLUMN shop_banner_url TEXT;
ALTER TABLE farms ADD COLUMN shop_policy TEXT;          -- Markdown: shipping, returns, etc.
ALTER TABLE farms ADD COLUMN accepts_pickup INTEGER DEFAULT 0;
ALTER TABLE farms ADD COLUMN accepts_shipping INTEGER DEFAULT 0;
ALTER TABLE farms ADD COLUMN accepts_delivery INTEGER DEFAULT 0;
ALTER TABLE farms ADD COLUMN delivery_radius_miles REAL;
ALTER TABLE farms ADD COLUMN stripe_account_id TEXT;    -- Stripe Connect account

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
  compare_at_price_cents INTEGER,          -- Strike-through price for sales
  currency TEXT DEFAULT 'usd',

  -- Inventory
  track_inventory INTEGER DEFAULT 1,
  quantity_in_stock INTEGER DEFAULT 0,
  allow_backorder INTEGER DEFAULT 0,

  -- Linked species/variety (optional)
  species_id TEXT REFERENCES species(id),
  variety_id TEXT REFERENCES plant_varieties(id),

  -- Media
  image_url TEXT,
  gallery_urls TEXT,                        -- JSON array of image URLs

  -- Shipping
  weight_oz REAL,
  ships_to TEXT DEFAULT 'us',              -- 'us', 'us_ca', 'worldwide', 'local_only'
  shipping_note TEXT,

  -- Event/tour-specific fields
  event_date INTEGER,                       -- Unix timestamp (NULL for non-events)
  event_end_date INTEGER,
  event_location TEXT,                      -- Override farm location if different
  event_capacity INTEGER,
  event_registered INTEGER DEFAULT 0,

  -- Digital product
  digital_file_url TEXT,                    -- R2 URL for downloadable file

  -- Metadata
  tags TEXT,                                -- JSON array
  is_featured INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,

  -- Ratings (denormalized for performance)
  rating_avg REAL DEFAULT 0,
  rating_count INTEGER DEFAULT 0,

  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);
CREATE INDEX idx_shop_products_farm ON shop_products(farm_id);
CREATE INDEX idx_shop_products_category ON shop_products(category);
CREATE INDEX idx_shop_products_published ON shop_products(is_published);

-- Product variants (e.g. pot sizes, quantities, colors)
CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,                       -- "1 gallon pot", "Packet (50 seeds)", "Family Box"
  price_cents INTEGER NOT NULL,
  quantity_in_stock INTEGER DEFAULT 0,
  sku TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (product_id) REFERENCES shop_products(id) ON DELETE CASCADE
);
CREATE INDEX idx_product_variants_product ON product_variants(product_id);

-- Shopping cart
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

-- Orders
CREATE TABLE IF NOT EXISTS shop_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,        -- Human-readable: PS-20260217-001
  farm_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN (
    'pending','paid','confirmed','preparing','shipped','out_for_delivery',
    'delivered','completed','cancelled','refunded'
  )),

  -- Financials (all in cents)
  subtotal_cents INTEGER NOT NULL,
  shipping_cents INTEGER DEFAULT 0,
  tax_cents INTEGER DEFAULT 0,
  total_cents INTEGER NOT NULL,

  -- Fulfillment
  fulfillment_type TEXT CHECK(fulfillment_type IN ('shipping','pickup','delivery','digital','event')),
  shipping_address TEXT,                    -- JSON: {name, line1, line2, city, state, zip, country}
  tracking_number TEXT,
  tracking_url TEXT,
  pickup_date INTEGER,                      -- For pickup orders

  -- Stripe
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,

  -- Buyer info
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_phone TEXT,
  order_notes TEXT,                          -- Special instructions

  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (farm_id) REFERENCES farms(id),
  FOREIGN KEY (buyer_id) REFERENCES users(id)
);
CREATE INDEX idx_shop_orders_farm ON shop_orders(farm_id);
CREATE INDEX idx_shop_orders_buyer ON shop_orders(buyer_id);
CREATE INDEX idx_shop_orders_status ON shop_orders(status);

-- Order line items (snapshot at purchase time)
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT,
  product_name TEXT NOT NULL,               -- Snapshot (product may change later)
  variant_name TEXT,
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,        -- Price at time of purchase
  total_cents INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (order_id) REFERENCES shop_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES shop_products(id)
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Product reviews
CREATE TABLE IF NOT EXISTS product_reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  order_id TEXT,                             -- Link to order for "verified purchase"
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT,
  image_urls TEXT,                           -- JSON array
  helpful_count INTEGER DEFAULT 0,
  is_verified_purchase INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (product_id) REFERENCES shop_products(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id),
  UNIQUE(product_id, reviewer_id)            -- One review per product per user
);
CREATE INDEX idx_product_reviews_product ON product_reviews(product_id);

-- Extend notifications for shop events
-- SQLite can't ALTER CHECK constraints, so we create a new notification type table
-- and the app code will handle both old and new types
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

### TypeScript types: add to `lib/db/schema.ts`

```typescript
// Shop & Marketplace Types

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

---

## Sub-Phase 6B: Stripe Connect Integration

Each farm-shop gets its own Stripe Connect Express account. The platform takes a fee on each transaction.

### New files

| File | Purpose |
|---|---|
| `lib/stripe/client.ts` | Stripe SDK singleton |
| `lib/stripe/connect.ts` | Create/manage Connect accounts |
| `lib/stripe/checkout.ts` | Create checkout sessions |
| `lib/stripe/webhooks.ts` | Event handler dispatch |
| `app/api/webhooks/stripe/route.ts` | Webhook endpoint (no auth — Stripe signature verification) |
| `app/api/shops/[farmId]/connect/route.ts` | POST: onboard seller → redirect to Stripe onboarding |
| `app/api/shops/[farmId]/connect/callback/route.ts` | GET: Stripe redirects back after onboarding |

### Environment variables

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_PLATFORM_FEE_PERCENT=8    # Platform cut (8%)
```

### Flow

```
Seller enables shop
  → POST /api/shops/{farmId}/connect
  → lib/stripe/connect.ts creates Express account
  → Redirect to Stripe onboarding URL
  → Seller completes bank details on Stripe
  → Stripe redirects to /api/shops/{farmId}/connect/callback
  → Save stripe_account_id on farms table
  → Shop is live
```

### Checkout flow

```
Buyer clicks "Checkout"
  → POST /api/checkout
  → lib/stripe/checkout.ts creates Checkout Session
    → line_items from cart
    → payment_intent_data.application_fee_amount = total * platform_fee
    → payment_intent_data.transfer_data.destination = farm.stripe_account_id
  → Redirect buyer to Stripe Checkout
  → Buyer pays
  → Stripe webhook: checkout.session.completed
    → Create order record, decrement inventory, send notifications
```

---

## Sub-Phase 6C: Product Management (Seller Side)

### API routes

| File | Method | Purpose |
|---|---|---|
| `app/api/shops/[farmId]/settings/route.ts` | GET, PATCH | Shop settings (headline, policy, fulfillment options) |
| `app/api/shops/[farmId]/products/route.ts` | GET, POST | List/create products |
| `app/api/shops/[farmId]/products/[productId]/route.ts` | GET, PATCH, DELETE | Single product CRUD |
| `app/api/shops/[farmId]/products/[productId]/variants/route.ts` | GET, POST, DELETE | Variant management |
| `app/api/shops/[farmId]/products/[productId]/images/route.ts` | POST | Upload product images to R2 |
| `app/api/shops/[farmId]/orders/route.ts` | GET | Seller's order list with filters |
| `app/api/shops/[farmId]/orders/[orderId]/route.ts` | GET, PATCH | Order detail, status updates |
| `app/api/shops/[farmId]/stats/route.ts` | GET | Revenue, orders, top products |

### Pages

| File | Purpose |
|---|---|
| `app/(app)/farm/[id]/shop/page.tsx` | Shop settings + product listing (seller view) |
| `app/(app)/farm/[id]/shop/products/new/page.tsx` | Create product form |
| `app/(app)/farm/[id]/shop/products/[productId]/edit/page.tsx` | Edit product |
| `app/(app)/farm/[id]/shop/orders/page.tsx` | Order management table |
| `app/(app)/farm/[id]/shop/orders/[orderId]/page.tsx` | Order detail + fulfillment actions |

### Components

| File | Purpose |
|---|---|
| `components/shop/seller/product-form.tsx` | Full product editor (name, description, price, variants, images, event fields, tags, category) |
| `components/shop/seller/product-table.tsx` | Sortable product list with inline stock editing |
| `components/shop/seller/order-table.tsx` | Orders with status filters, search, bulk actions |
| `components/shop/seller/order-detail.tsx` | Order timeline, fulfillment actions (mark shipped, add tracking) |
| `components/shop/seller/shop-settings-form.tsx` | Shop config: headline, banner, policy, fulfillment methods |
| `components/shop/seller/connect-stripe-button.tsx` | Stripe onboarding CTA |
| `components/shop/seller/revenue-chart.tsx` | Simple revenue over time |
| `components/shop/seller/inventory-alert.tsx` | Low stock warnings |

### Product form fields by category

**All categories:** name, description, price, compare_at_price, images, tags, is_published

**Nursery stock / Seeds:** species picker, variety picker, ships_to, weight, hardiness zone badge auto-fill from linked species

**Vegetable boxes / Cut flowers:** recurrence option (one-time vs subscription placeholder), delivery/pickup toggle

**Tours / Events:** date picker, end date, capacity, event_location override, registration count

**Teas & herbs / Value-added:** weight, ingredients list (in description), ships_to

**Digital:** file upload → R2, instant delivery after payment

---

## Sub-Phase 6D: Shop Storefront (Buyer Side)

### API routes

| File | Method | Purpose |
|---|---|---|
| `app/api/shops/route.ts` | GET | Discover shops (filters: category, location, climate zone) |
| `app/api/shops/[farmId]/route.ts` | GET | Shop public profile + featured products |
| `app/api/shops/[farmId]/products/route.ts` | GET | Browse products (public, paginated) |
| `app/api/shops/[farmId]/products/[productId]/route.ts` | GET | Product detail (public) |
| `app/api/shops/[farmId]/products/[productId]/reviews/route.ts` | GET, POST | Reviews (auth required for POST) |
| `app/api/cart/route.ts` | GET, POST, PATCH, DELETE | Cart CRUD |
| `app/api/checkout/route.ts` | POST | Create Stripe Checkout session |
| `app/api/orders/route.ts` | GET | Buyer's order history |
| `app/api/orders/[orderId]/route.ts` | GET | Order detail for buyer |

### Pages

| File | Purpose |
|---|---|
| `app/(app)/shops/page.tsx` | Shop directory — map view + list, filters |
| `app/(app)/shops/[farmId]/page.tsx` | Shop storefront — header, categories, product grid |
| `app/(app)/shops/[farmId]/product/[slug]/page.tsx` | Product detail — gallery, description, variants, reviews, add-to-cart |
| `app/(app)/cart/page.tsx` | Full cart page (fallback from drawer) |
| `app/(app)/checkout/success/page.tsx` | Order confirmation |
| `app/(app)/orders/page.tsx` | Buyer order history |
| `app/(app)/orders/[orderId]/page.tsx` | Order tracking |

### Components

| File | Purpose |
|---|---|
| `components/shop/shop-directory.tsx` | Grid/list toggle, map cluster view, filters |
| `components/shop/shop-card.tsx` | Farm shop preview card for directory |
| `components/shop/shop-header.tsx` | Storefront banner, farm name, ratings, follow button, location |
| `components/shop/product-card.tsx` | Product thumbnail, price, rating stars, "Add to Cart" |
| `components/shop/product-detail.tsx` | Full product page layout |
| `components/shop/product-gallery.tsx` | Image carousel with zoom |
| `components/shop/variant-selector.tsx` | Size/option picker |
| `components/shop/add-to-cart-button.tsx` | Quantity selector + add button with optimistic toast |
| `components/shop/cart-drawer.tsx` | Slide-out cart (Sheet component), item list, totals, checkout CTA |
| `components/shop/cart-icon.tsx` | Header cart icon with badge count |
| `components/shop/cart-item-row.tsx` | Item with quantity +-,  remove |
| `components/shop/checkout-summary.tsx` | Order summary before Stripe redirect |
| `components/shop/review-section.tsx` | Rating distribution bar + review list |
| `components/shop/review-form.tsx` | Star rating + text + photo upload |
| `components/shop/order-card.tsx` | Order summary card for order history |
| `components/shop/order-timeline.tsx` | Visual status progression |
| `components/shop/fulfillment-badge.tsx` | "Ships" / "Pickup" / "Delivery" / "Digital" badge |
| `components/shop/distance-badge.tsx` | "12 miles away" using Haversine from user location |
| `components/shop/category-pills.tsx` | Horizontal scroll filter pills |
| `components/shop/price-display.tsx` | Formats cents → $XX.XX, handles compare_at_price strike-through |

### Shop directory layout

```
+--------------------------------------------------+
| [Search]  [Category pills: All | Nursery | Seeds | Events | ...]
+--------------------------------------------------+
| [Map View toggle]                                 |
|                                                   |
| +----------+  +----------+  +----------+          |
| | Shop Card|  | Shop Card|  | Shop Card|          |
| | Farm Name|  | Farm Name|  | Farm Name|          |
| | 3 mi away|  | 12 mi    |  | 45 mi    |          |
| | ★4.8 (23)|  | ★4.5 (8) |  | ★5.0 (2) |          |
| | 12 products| | 5 products| | 3 products|         |
| +----------+  +----------+  +----------+          |
+--------------------------------------------------+
```

### Product detail layout

```
+--------------------------------------------------+
| [< Back to Shop Name]                             |
+--------------------------------------------------+
| [Image Gallery]          | Product Name            |
| [thumb] [thumb] [thumb]  | ★★★★☆ (23 reviews)     |
|                          | $24.99  ~~$34.99~~      |
|                          |                          |
|                          | [Variant: 1gal ▾]       |
|                          | [Qty: 1 -/+]            |
|                          | [Add to Cart]            |
|                          |                          |
|                          | 🚚 Ships nationwide      |
|                          | 📍 Pickup available      |
|                          | 🌿 Zone 7-10            |
+--------------------------------------------------+
| Description (markdown)                             |
+--------------------------------------------------+
| Linked species info (from species DB)              |
| Growing tips, companion plants, hardiness          |
+--------------------------------------------------+
| Reviews                                            |
| [Rating distribution bars]                         |
| [Review 1]  [Review 2]  [Review 3]                |
| [Write a Review]                                   |
+--------------------------------------------------+
```

---

## Sub-Phase 6E: Cart & Checkout

### Cart behavior

- Cart stored in database (`cart_items` table) — persists across devices
- Cart drawer (Sheet) accessible from any page via header icon
- Items grouped by farm — each farm is a separate checkout
- Quantity limits enforced by `quantity_in_stock`
- Price shown at time of add; re-validated at checkout

### Checkout flow

```
Cart Drawer → "Checkout" per farm
  → /checkout?farm={farmId}
  → Select fulfillment type (if farm offers multiple)
  → If shipping: enter address
  → If pickup: select date
  → Review order summary
  → "Pay with Stripe" → redirects to Stripe Checkout
  → Stripe handles payment
  → Webhook creates order → redirect to /checkout/success?order={orderId}
```

### Multi-farm cart

Since different farms have different Stripe accounts, each farm is a separate checkout. The cart drawer shows items grouped by farm with separate "Checkout" buttons per farm.

```
┌─────────────────────────────┐
│ Your Cart (5 items)         │
├─────────────────────────────┤
│ 🏡 Sunny Acres Farm        │
│   Heritage Tomato Seeds  $8 │
│   Herb Tea Blend        $12 │
│   Subtotal: $20             │
│   [Checkout Sunny Acres]    │
├─────────────────────────────┤
│ 🏡 River Bend Nursery      │
│   Pawpaw Seedling       $35 │
│   Elderberry (2)        $48 │
│   Redbud Tree           $45 │
│   Subtotal: $128            │
│   [Checkout River Bend]     │
└─────────────────────────────┘
```

---

## Sub-Phase 6F: Reviews & Ratings

Reuse existing patterns from `post_reactions` and `post_comments`.

### Review flow

1. Buyer receives order → order status goes to `delivered` or `completed`
2. Shop notification prompts: "How was your order? Leave a review"
3. Buyer clicks → product page → "Write a Review" form (only for purchased products)
4. Star rating (1-5) + title + body + optional photos
5. Review is immediately visible; `is_verified_purchase` set if linked to an order
6. Seller can respond (via a reply field — same pattern as `post_comments`)
7. Product `rating_avg` and `rating_count` denormalized on `shop_products` table for fast display

---

## Sub-Phase 6G: Discovery & Search

### Shop search integration

Extend the existing `UniversalSearch` component to include shops and products.

**Modify** `components/search/universal-search.tsx` — add "Shops" and "Products" result sections

**Create** `app/api/search/shops/route.ts` — search shops by name, location, category

**Create** `app/api/search/products/route.ts` — search products across all shops

### Map-based discovery

**Create** `components/shop/shop-map.tsx` — MapLibre map showing shop markers

- Reuse `farm-map-readonly.tsx` pattern
- Cluster markers when zoomed out
- Click marker → popup with shop card
- "Use my location" button → sort by distance
- Filter by category, climate zone, fulfillment type

### Feed integration

**Modify** `components/feed/post-card.tsx` — when a post links to a product, show product card embed

**Create** `components/shop/product-embed.tsx` — inline product card for social feed (name, image, price, "View" button)

Sellers can share products as posts using existing `CreatePostButton` flow, with a new "Link Product" option.

---

## Sub-Phase 6H: Notifications & Email

### Shop notification types

| Type | Recipient | Trigger |
|---|---|---|
| `order_placed` | Seller | Stripe webhook: payment success |
| `order_confirmed` | Buyer | Seller confirms order |
| `order_shipped` | Buyer | Seller adds tracking |
| `order_delivered` | Buyer | Manual or auto (7 days after shipped) |
| `new_product` | Farm followers | Seller publishes new product |
| `restock` | Users who viewed out-of-stock | Product back in stock |
| `review_received` | Seller | Buyer leaves review |
| `event_reminder` | Ticket holders | 24h before event |

Uses `shop_notifications` table (separate from existing `notifications` to avoid CHECK constraint issues).

### Email (future)

Not in MVP — but the notification system stores `content_preview` which can be used to generate email digests later. Consider Resend or SendGrid when ready.

---

## Sub-Phase 6I: Navigation Integration

### Modified files

| File | Change |
|---|---|
| `components/shared/sidebar.tsx` | Add "Shop" nav item (Storefront icon) between Community and Learn |
| `components/shared/bottom-nav-bar.tsx` | Add cart icon with badge to header area |
| `app/(app)/app-layout-client.tsx` | Thread cart count for header badge |
| `app/(app)/farm/[id]/page.tsx` | Add "Visit Shop" button if `is_shop_enabled` |
| `app/(app)/gallery/page.tsx` | Add "Shops" quick-action button alongside Following/Saved/Trending |

### Global cart state

Create `contexts/cart-context.tsx` — provides cart count and drawer toggle across the app.

```typescript
// contexts/cart-context.tsx
'use client';
import { createContext, useContext, useState, useEffect } from 'react';

interface CartContextType {
  itemCount: number;
  refreshCart: () => void;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}
```

Wrap `AppLayoutClient` with `CartProvider`. Cart icon in header shows badge with `itemCount`.

---

## Implementation Order

```
6A  Schema + Types            ← Foundation, everything depends on this
 ↓
6B  Stripe Connect            ← Sellers can onboard (no products yet, but payments ready)
 ↓
6C  Product Management        ← Sellers can list products
 ↓
6D  Storefront + Browse       ← Buyers can discover and view products
 ↓
6E  Cart + Checkout           ← Buyers can purchase
 ↓
6F  Reviews + Ratings         ← Community trust
 ↓
6G  Discovery + Search        ← Map-based shop finder, product search
 ↓
6H  Notifications             ← Order lifecycle communication
 ↓
6I  Navigation Integration    ← Wire everything into existing UI
```

---

## File Summary

### New files: ~55

- 1 migration
- ~20 API routes
- ~10 pages
- ~25 components
- 2 lib modules (stripe client, cart context)

### Modified files: ~8

- `lib/db/schema.ts` — new types
- `components/shared/sidebar.tsx` — Shop nav
- `components/shared/bottom-nav-bar.tsx` — cart icon
- `app/(app)/app-layout-client.tsx` — cart provider
- `app/(app)/gallery/page.tsx` — Shops button
- `app/(app)/farm/[id]/page.tsx` — Visit Shop button
- `components/search/universal-search.tsx` — shop/product results
- `components/feed/post-card.tsx` — product embed support

---

## Environment Variables (new)

```
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_PLATFORM_FEE_PERCENT=8
```

---

## Success Metrics

- Shops activated (farms with `is_shop_enabled = 1`)
- Products listed
- GMV (gross merchandise value)
- Orders per week
- Average order value
- Review rate (reviews / orders)
- Repeat purchase rate
- "Near me" searches
- Time from product view to purchase (funnel)
