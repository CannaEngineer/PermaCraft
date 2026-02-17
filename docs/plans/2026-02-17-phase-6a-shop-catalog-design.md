# Phase 6 (MVP): Farm Shop — Schema + Product Catalog

**Date:** 2026-02-17
**Scope:** 6A (database), 6C (seller management), 6D (buyer storefront)
**Deferred:** Stripe payments, cart/checkout, reviews, discovery/search, notifications

---

## Decisions

- **Architecture:** Farm-embedded shop. Seller manages at `/farm/[id]/shop`; public storefront at `/shops/[farmId]`.
- **Product form:** Universal form (name, description, category, price, image, stock, tags). Category-specific fields (event dates, digital file upload) deferred.
- **Payments:** "Add to Cart" button rendered but disabled with "Coming Soon" tooltip. Stripe wired in a future sub-phase.
- **Schema:** Full schema lands now (all columns including Stripe and event fields) so no future migrations needed just to unlock a field.

---

## Database (6A)

**Migration:** `lib/db/migrations/080_farm_shop.sql`

New columns on `farms`:
- `is_shop_enabled`, `shop_headline`, `shop_banner_url`, `shop_policy`
- `accepts_pickup`, `accepts_shipping`, `accepts_delivery`, `delivery_radius_miles`
- `stripe_account_id`

New tables:
- `shop_products` — products with full schema (inventory, media, event fields, digital fields, ratings stubs)
- `product_variants` — size/option variants per product
- `cart_items` — persisted cart (populated by future checkout phase)
- `shop_orders` + `order_items` — order lifecycle (populated by future checkout phase)
- `product_reviews` — reviews (populated by future reviews phase)
- `shop_notifications` — shop-specific notifications (separate table to avoid CHECK constraint on existing `notifications`)

**Types:** All interfaces added to `lib/db/schema.ts`.

---

## Seller Side (6C)

**Pages:**
| Route | Purpose |
|---|---|
| `/farm/[id]/shop` | Dashboard: enable toggle, shop settings, product table |
| `/farm/[id]/shop/products/new` | Create product |
| `/farm/[id]/shop/products/[productId]/edit` | Edit product |

**Universal product form fields:** name, description (markdown), category, price, compare-at price, single image (R2 upload), stock quantity, published toggle, tags.

**API routes:**
| Route | Methods | Purpose |
|---|---|---|
| `/api/shops/[farmId]/settings` | GET, PATCH | Shop config (enable, headline, banner, policy) |
| `/api/shops/[farmId]/products` | GET, POST | List/create products |
| `/api/shops/[farmId]/products/[productId]` | GET, PATCH, DELETE | Single product CRUD |

All routes verify farm ownership before mutation.

**Farm page integration:** "Visit Shop" button appears on `/farm/[id]` when `is_shop_enabled = 1`.

---

## Buyer Side (6D)

**Pages:**
| Route | Purpose |
|---|---|
| `/shops` | Directory: grid of enabled shops, category filter pills, name search |
| `/shops/[farmId]` | Storefront: farm banner, headline, product grid |
| `/shops/[farmId]/product/[slug]` | Product detail: image, description, price, stock, disabled cart button |

**API routes:**
| Route | Methods | Purpose |
|---|---|---|
| `/api/shops` | GET | Public shop directory (is_shop_enabled = 1 only) |
| `/api/shops/[farmId]` | GET | Public shop profile + featured products |
| `/api/shops/[farmId]/products/[productId]` | GET | Product detail (public) |

**Navigation additions:**
- Sidebar: "Shop" link between Community and Learn
- Farm page: "Visit Shop" button when shop enabled
- Gallery: "Shops" quick-action button

---

## Out of Scope (This Phase)

- Stripe Connect onboarding (6B)
- Cart & checkout (6E)
- Reviews & ratings (6F)
- Map-based shop discovery (6G)
- Shop notifications (6H)
- Cart icon with badge in header (6I)
- Product variants UI (schema exists, UI deferred)
- Category-specific form fields (event dates, digital file upload)
