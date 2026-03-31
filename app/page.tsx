import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { LandingNav } from "@/components/shared/landing-nav";
import { LandingHeroClient } from "@/components/landing/landing-hero-client";
import { LandingFarmsCarousel } from "@/components/landing/landing-farms-carousel";

async function getLandingData() {
  try {
    const [farmsResult, toursResult, statsResult, blogResult, speciesResult] = await Promise.all([
      db.execute({
        sql: `
          SELECT f.id, f.name, f.description, f.acres, f.climate_zone,
                 f.center_lat, f.center_lng,
                 u.name as owner_name, u.image as owner_image,
                 (SELECT COUNT(*) FROM farm_tours WHERE farm_id = f.id AND status = 'published') as tour_count,
                 (SELECT COUNT(*) FROM farm_follows WHERE farm_id = f.id) as follower_count,
                 (SELECT screenshot_url FROM map_snapshots WHERE farm_id = f.id ORDER BY created_at DESC LIMIT 1) as latest_screenshot
          FROM farms f
          JOIN users u ON f.user_id = u.id
          WHERE f.is_public = 1
          ORDER BY follower_count DESC, tour_count DESC
          LIMIT 8
        `,
        args: [],
      }),
      db.execute({
        sql: `
          SELECT t.id, t.title, t.description, t.cover_image_url,
                 t.estimated_duration_minutes, t.difficulty, t.visitor_count,
                 t.share_slug,
                 f.id as farm_id, f.name as farm_name,
                 u.name as owner_name, u.image as owner_image,
                 (SELECT COUNT(*) FROM tour_stops WHERE tour_id = t.id) as stop_count,
                 (SELECT screenshot_url FROM map_snapshots WHERE farm_id = f.id ORDER BY created_at DESC LIMIT 1) as farm_screenshot
          FROM farm_tours t
          JOIN farms f ON t.farm_id = f.id
          JOIN users u ON f.user_id = u.id
          WHERE t.status = 'published' AND f.is_public = 1
          ORDER BY t.visitor_count DESC, t.published_at DESC
          LIMIT 4
        `,
        args: [],
      }),
      db.execute({
        sql: `
          SELECT
            (SELECT COUNT(*) FROM farms WHERE is_public = 1) as total_farms,
            (SELECT COUNT(*) FROM species) as total_species,
            (SELECT COUNT(DISTINCT user_id) FROM farms WHERE is_public = 1) as total_farmers,
            (SELECT COUNT(*) FROM farm_tours WHERE status = 'published') as total_tours
        `,
        args: [],
      }),
      db.execute({
        sql: `
          SELECT p.id, p.farm_id, p.content, p.media_urls, p.created_at,
                 f.name as farm_name,
                 u.name as author_name, u.image as author_image
          FROM farm_posts p
          JOIN farms f ON p.farm_id = f.id
          JOIN users u ON p.author_id = u.id
          WHERE f.is_public = 1 AND p.is_published = 1
          ORDER BY p.created_at DESC
          LIMIT 3
        `,
        args: [],
      }),
      db.execute({
        sql: `
          SELECT id, common_name, scientific_name, layer, native_regions, image_url
          FROM species
          WHERE image_url IS NOT NULL
          ORDER BY RANDOM()
          LIMIT 6
        `,
        args: [],
      }),
    ]);

    return {
      farms: farmsResult.rows,
      tours: toursResult.rows,
      stats: statsResult.rows[0] || { total_farms: 0, total_species: 0, total_farmers: 0, total_tours: 0 },
      posts: blogResult.rows.map((row: any) => ({
        ...row,
        media_urls: row.media_urls ? JSON.parse(row.media_urls) : null,
      })),
      species: speciesResult.rows,
    };
  } catch {
    return {
      farms: [],
      tours: [],
      stats: { total_farms: 0, total_species: 0, total_farmers: 0, total_tours: 0 },
      posts: [],
      species: [],
    };
  }
}

export default async function LandingPage() {
  const session = await getSession();
  const isSignedIn = !!session;
  const { farms, tours, stats, posts, species } = await getLandingData();
  const totalFarms = Number(stats.total_farms) || 0;
  const totalSpecies = Number(stats.total_species) || 0;
  const totalTours = Number(stats.total_tours) || 0;
  const totalFarmers = Number(stats.total_farmers) || 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav isSignedIn={isSignedIn} />

      {/* ============ HERO ============ */}
      <section className="relative min-h-[100vh] flex flex-col items-center justify-center overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 landing-ambient-bg" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/20 to-background" />

        <div className="relative z-10 mx-auto max-w-5xl px-6 pt-24 pb-16 text-center">
          <div className="landing-fade-up" style={{ animationDelay: "0.1s" }}>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              {totalFarms > 0 ? `${totalFarms} farms` : "Farms"} growing real food, right now
            </p>
          </div>

          <h1
            className="landing-fade-up mx-auto max-w-4xl font-serif font-bold leading-[1.02] tracking-tight"
            style={{ fontSize: "clamp(2.8rem, 8vw, 5.5rem)", animationDelay: "0.2s" }}
          >
            Know your farmer.{" "}
            <span className="landing-text-shimmer">Visit the land.</span>
          </h1>

          <p
            className="landing-fade-up mx-auto mt-6 max-w-2xl text-muted-foreground"
            style={{ fontSize: "clamp(1.05rem, 1.8vw, 1.25rem)", lineHeight: 1.7, animationDelay: "0.4s" }}
          >
            Real permaculture farms, open for you to explore. Walk the rows virtually,
            learn what&apos;s growing, and buy directly from the people who tend the soil.
          </p>

          {/* Visitor CTAs */}
          <div className="landing-fade-up mt-10 flex flex-wrap items-center justify-center gap-4" style={{ animationDelay: "0.6s" }}>
            <Link
              href="/gallery"
              className="landing-btn-primary inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold no-underline transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              Find a Farm
            </Link>
            <Link
              href="/shops"
              className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-foreground/5 px-8 py-4 text-base font-semibold no-underline transition-all hover:bg-foreground/10 text-foreground"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
              Shop Farm Fresh
            </Link>
          </div>

          {/* Live stats ticker */}
          <LandingHeroClient
            totalFarms={totalFarms}
            totalSpecies={totalSpecies}
            totalTours={totalTours}
            totalFarmers={totalFarmers}
          />
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 landing-fade-up" style={{ animationDelay: "1.2s" }}>
          <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
            <span className="text-[10px] font-medium uppercase tracking-[0.2em]">Scroll to explore</span>
            <div className="h-8 w-[1px] bg-gradient-to-b from-muted-foreground/30 to-transparent landing-scroll-pulse" />
          </div>
        </div>
      </section>

      {/* ============ FEATURED FARMS - Horizontal immersive scroll ============ */}
      {farms.length > 0 && (
        <section className="py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <div className="landing-scroll-reveal flex items-end justify-between mb-10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-2">Meet Your Growers</p>
                <h2 className="font-serif font-bold tracking-tight" style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)" }}>
                  These are the people feeding your community
                </h2>
              </div>
              <Link
                href="/gallery"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border/60 px-5 py-2.5 text-sm font-medium no-underline text-foreground transition-all hover:border-primary/40 hover:text-primary"
              >
                View all
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
              </Link>
            </div>
          </div>

          <LandingFarmsCarousel farms={farms as any[]} />

          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/gallery"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-5 py-2.5 text-sm font-medium no-underline text-foreground transition-all hover:border-primary/40 hover:text-primary"
            >
              View all farms
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </Link>
          </div>
        </section>
      )}

      {/* ============ TOURS SECTION - Immersive cards ============ */}
      {tours.length > 0 && (
        <section className="py-20 md:py-28 landing-section-alt">
          <div className="mx-auto max-w-7xl px-6">
            <div className="landing-scroll-reveal flex items-end justify-between mb-10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-2">See Where It Grows</p>
                <h2 className="font-serif font-bold tracking-tight" style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)" }}>
                  Walk the land before you visit
                </h2>
                <p className="mt-2 max-w-lg text-muted-foreground" style={{ fontSize: "clamp(0.95rem, 1.3vw, 1.1rem)" }}>
                  Farmers open their gates with guided tours. Explore from your couch, then book a visit in person.
                </p>
              </div>
              <Link
                href="/gallery?tab=tours"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border/60 px-5 py-2.5 text-sm font-medium no-underline text-foreground transition-all hover:border-primary/40 hover:text-primary"
              >
                All tours
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
              </Link>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {tours.map((tour: any) => (
                <Link
                  key={tour.id}
                  href={tour.share_slug ? `/tour/${tour.share_slug}` : `/farm/${tour.farm_id}/tours`}
                  className="landing-scroll-reveal group relative overflow-hidden rounded-2xl no-underline landing-card-hover"
                  style={{ border: "1px solid hsl(var(--border)/0.5)" }}
                >
                  <div className="aspect-[4/5] relative">
                    {tour.cover_image_url || tour.farm_screenshot ? (
                      <img
                        src={tour.cover_image_url || tour.farm_screenshot}
                        alt={tour.title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full" style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.15), hsl(var(--secondary)/0.1))" }} />
                    )}
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 40%, transparent 100%)" }} />

                    {/* Difficulty badge */}
                    {tour.difficulty && (
                      <div className="absolute top-3 left-3">
                        <span className="rounded-full bg-black/40 backdrop-blur-md px-3 py-1 text-[11px] font-medium text-white/90 capitalize">
                          {tour.difficulty}
                        </span>
                      </div>
                    )}

                    {/* Duration badge */}
                    {tour.estimated_duration_minutes && (
                      <div className="absolute top-3 right-3">
                        <span className="rounded-full bg-black/40 backdrop-blur-md px-3 py-1 text-[11px] font-medium text-white/90">
                          {tour.estimated_duration_minutes} min
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                    <h3 className="mb-1 text-base font-bold leading-tight">{tour.title}</h3>
                    <p className="text-sm text-white/60">{tour.farm_name}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-white/40">
                      {Number(tour.stop_count) > 0 && <span>{tour.stop_count} stops</span>}
                      {Number(tour.visitor_count) > 0 && <span>{Number(tour.visitor_count).toLocaleString()} visitors</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ PLANT DATABASE PREVIEW ============ */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="landing-scroll-reveal grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Text side */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-2">Learn What&apos;s Growing</p>
              <h2 className="font-serif font-bold tracking-tight" style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)" }}>
                {totalSpecies > 0 ? `${totalSpecies.toLocaleString()}+` : "Hundreds of"} plants, all native-first
              </h2>
              <p className="mt-4 text-muted-foreground" style={{ fontSize: "clamp(0.95rem, 1.3vw, 1.1rem)", lineHeight: 1.7 }}>
                Curious about what&apos;s in your food forest box? Want to know what thrives in your
                backyard? Every species is tagged by region, growing season, and ecological role.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-4">
                {[
                  { label: "Native species", desc: "Tagged by your region" },
                  { label: "Companion planting", desc: "What grows well together" },
                  { label: "Forest layers", desc: "Canopy to groundcover" },
                  { label: "Seasonal guides", desc: "When to plant and harvest" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-border/40 bg-card/50 p-4">
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>

              <Link
                href="/plants"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3 text-sm font-semibold no-underline transition-all hover:opacity-90"
              >
                Explore Plants
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
              </Link>
            </div>

            {/* Species grid */}
            <div className="landing-scroll-reveal grid grid-cols-3 gap-3">
              {species.length > 0 ? species.map((sp: any, i: number) => (
                <Link
                  key={sp.id}
                  href={`/plants/${sp.id}`}
                  className="group relative aspect-square overflow-hidden rounded-2xl no-underline landing-card-hover"
                  style={{
                    animationDelay: `${i * 0.08}s`,
                    border: "1px solid hsl(var(--border)/0.3)",
                  }}
                >
                  {sp.image_url ? (
                    <img
                      src={sp.image_url}
                      alt={sp.common_name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-primary/10 to-primary/5" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-xs font-semibold text-white truncate">{sp.common_name}</p>
                    <p className="text-[10px] text-white/60 italic truncate">{sp.scientific_name}</p>
                  </div>
                </Link>
              )) : (
                // Placeholder grid
                Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-2xl"
                    style={{
                      background: `linear-gradient(${135 + i * 20}deg, hsl(var(--primary)/0.08), hsl(var(--primary)/0.03))`,
                      border: "1px solid hsl(var(--border)/0.3)",
                    }}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============ BLOG / STORIES PREVIEW ============ */}
      <section className="py-20 md:py-28 landing-section-alt">
        <div className="mx-auto max-w-7xl px-6">
          <div className="landing-scroll-reveal flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-2">Voices from the Soil</p>
              <h2 className="font-serif font-bold tracking-tight" style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)" }}>
                Hear it from the growers themselves
              </h2>
            </div>
            <Link
              href="/learn/blog"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border/60 px-5 py-2.5 text-sm font-medium no-underline text-foreground transition-all hover:border-primary/40 hover:text-primary"
            >
              Read the blog
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </Link>
          </div>

          {posts.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-3">
              {posts.map((post: any, i: number) => {
                const mediaUrl = post.media_urls?.[0];
                return (
                  <Link
                    key={post.id}
                    href={`/farm/${post.farm_id}`}
                    className="landing-scroll-reveal group rounded-2xl overflow-hidden no-underline landing-card-hover"
                    style={{
                      animationDelay: `${i * 0.1}s`,
                      border: "1px solid hsl(var(--border)/0.5)",
                      backgroundColor: "hsl(var(--card))",
                    }}
                  >
                    {mediaUrl && (
                      <div className="aspect-[16/9] overflow-hidden">
                        <img
                          src={mediaUrl}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        {post.author_image && (
                          <img src={post.author_image} alt="" className="h-6 w-6 rounded-full object-cover" />
                        )}
                        <span className="text-xs font-medium text-muted-foreground">{post.author_name}</span>
                        <span className="text-xs text-muted-foreground/40">at</span>
                        <span className="text-xs font-medium text-foreground">{post.farm_name}</span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                        {post.content?.slice(0, 180)}{post.content?.length > 180 ? "..." : ""}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              {[
                { title: "What Is Permaculture, Really?", desc: "A no-jargon guide to how these farms work with nature instead of against it, and why the food tastes different." },
                { title: "How to Read a Farm Map", desc: "Zones, guilds, food forests. Here's what you're looking at when you explore a farm on the platform." },
                { title: "Eating with the Seasons", desc: "Why your local permaculture farm doesn't have tomatoes in January, and why that's a good thing." },
              ].map((placeholder, i) => (
                <Link
                  key={i}
                  href="/learn/blog"
                  className="landing-scroll-reveal group rounded-2xl p-6 no-underline landing-card-hover"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    border: "1px solid hsl(var(--border)/0.5)",
                    backgroundColor: "hsl(var(--card))",
                  }}
                >
                  <div className="mb-4 h-32 rounded-xl" style={{ background: `linear-gradient(${135 + i * 25}deg, hsl(var(--primary)/0.08), hsl(var(--primary)/0.03))` }} />
                  <h3 className="text-base font-bold text-foreground mb-2">{placeholder.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{placeholder.desc}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============ HOW IT WORKS - Simple, human ============ */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="landing-scroll-reveal text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-2">How It Works</p>
            <h2 className="font-serif font-bold tracking-tight" style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)" }}>
              From screen to soil in three steps
            </h2>
          </div>

          {/* Three-step flow */}
          <div className="grid gap-6 md:grid-cols-3 mb-16">
            {[
              {
                step: "01",
                title: "Find a farm near you",
                desc: "Browse real permaculture farms by location, what they grow, or what they sell. Every farm is mapped and maintained by the grower.",
                href: "/gallery",
              },
              {
                step: "02",
                title: "Explore before you go",
                desc: "Take a virtual tour, read the farmer's story, browse their plant list. You'll know the land before your feet touch it.",
                href: "/gallery?tab=tours",
              },
              {
                step: "03",
                title: "Visit, buy, or learn",
                desc: "Book a farm visit, order from their shop, or simply follow along as they share seasonal updates and growing wisdom.",
                href: "/shops",
              },
            ].map((card, i) => (
              <Link
                key={card.step}
                href={card.href}
                className="landing-scroll-reveal group rounded-2xl border border-border/40 p-7 no-underline transition-all landing-card-hover"
                style={{ animationDelay: `${i * 0.08}s`, backgroundColor: "hsl(var(--card))" }}
              >
                <span className="mb-4 block font-serif text-3xl font-bold text-primary/20 group-hover:text-primary/40 transition-colors">{card.step}</span>
                <h3 className="mb-2 text-lg font-bold text-foreground">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
              </Link>
            ))}
          </div>

          {/* Supporting features - compact */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/></svg>`,
                title: "Plant Database",
                desc: "Search native species by region and growing season.",
                href: "/plants",
              },
              {
                icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`,
                title: "Farm Shops",
                desc: "Seeds, produce boxes, and plants straight from the grower.",
                href: "/shops",
              },
              {
                icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>`,
                title: "Grower Stories",
                desc: "Real experiences from people regenerating their land.",
                href: "/learn/blog",
              },
            ].map((card, i) => (
              <Link
                key={card.title}
                href={card.href}
                className="landing-scroll-reveal group flex items-start gap-4 rounded-xl border border-border/30 p-5 no-underline transition-all hover:border-primary/20 hover:bg-primary/[0.02]"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div
                  className="mt-0.5 flex-shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8 text-primary transition-colors group-hover:bg-primary/15"
                  dangerouslySetInnerHTML={{ __html: card.icon }}
                />
                <div>
                  <h3 className="mb-1 text-sm font-bold text-foreground">{card.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FOR GROWERS - MVS Painkiller Section ============ */}
      <section className="py-20 md:py-28 landing-section-alt">
        <div className="mx-auto max-w-7xl px-6">
          <div className="landing-scroll-reveal text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-2">For Growers &amp; Designers</p>
            <h2 className="font-serif font-bold tracking-tight" style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)" }}>
              You have land.{" "}
              <span className="landing-text-shimmer">Now what?</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground" style={{ fontSize: "clamp(0.95rem, 1.3vw, 1.1rem)", lineHeight: 1.7 }}>
              Hundreds of species, dozens of companion combinations, eight forest layers, six zones.
              Planning a permaculture design is overwhelming. Our AI does the hard part for you.
            </p>
          </div>

          {/* Pain → Solution cards */}
          <div className="grid gap-5 md:grid-cols-3 mb-12">
            {[
              {
                pain: "Consultations cost $2,000+",
                solution: "AI-powered design in minutes",
                desc: "Drop a pin on your land, tell us your goals, and get a permaculture layout with native species recommendations tailored to your climate zone and soil.",
                icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .963L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>`,
              },
              {
                pain: "Miss planting season = lose a year",
                solution: "Seasonal task lists, ready to go",
                desc: "Every design comes with a planting timeline. Know exactly what to plant, when to plant it, and where it goes on your land. No more analysis paralysis.",
                icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/></svg>`,
              },
              {
                pain: "Can't picture what it'll look like",
                solution: "See your food forest in 1, 5, 10 years",
                desc: "Our growth simulation shows exactly how your design matures over time. Watch canopy spread, understory fill in, and guilds establish — before you put a single plant in the ground.",
                icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/></svg>`,
              },
            ].map((card, i) => (
              <div
                key={card.pain}
                className="landing-scroll-reveal group rounded-2xl border border-border/40 p-7 transition-all landing-card-hover"
                style={{ animationDelay: `${i * 0.08}s`, backgroundColor: "hsl(var(--card))" }}
              >
                <div
                  className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/8 text-primary"
                  dangerouslySetInnerHTML={{ __html: card.icon }}
                />
                <p className="mb-1 text-xs font-medium text-muted-foreground/60 line-through decoration-muted-foreground/30">{card.pain}</p>
                <h3 className="mb-3 text-lg font-bold text-foreground">{card.solution}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          {/* Grower CTA */}
          <div className="landing-scroll-reveal text-center">
            <Link
              href={isSignedIn ? "/farm/new" : "/register"}
              className="landing-btn-primary inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold no-underline transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>
              {isSignedIn ? "Design Your Farm" : "Start Your Design — Free"}
            </Link>
            <p className="mt-4 text-xs text-muted-foreground/50">
              No credit card required. Draw your first zone in under 2 minutes.
            </p>
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA - Magazine style ============ */}
      <section className="relative py-28 md:py-36 overflow-hidden">
        <div className="absolute inset-0 landing-ambient-bg opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />

        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <div className="landing-scroll-reveal">
            <h2 className="font-serif font-bold tracking-tight" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
              Every bite has{" "}
              <span className="landing-text-shimmer">a story</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-muted-foreground" style={{ fontSize: "clamp(1rem, 1.5vw, 1.2rem)", lineHeight: 1.7 }}>
              The farms on this platform are real, the growers are your neighbors,
              and the food is grown the way nature intended. Come see for yourself.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href={isSignedIn ? "/farm/new" : "/register"}
                className="landing-btn-primary inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold no-underline transition-all"
              >
                {isSignedIn ? "Design Your Farm" : "Start Designing — Free"}
              </Link>
              <Link
                href="/gallery"
                className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-8 py-4 text-base font-medium no-underline transition-all hover:bg-foreground/5 text-foreground"
              >
                Explore Community Farms
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-border/30 px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/></svg>
                <span className="font-serif text-base font-bold">Permaculture.Studio</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connecting people with the farms and growers regenerating their local food systems.
              </p>
            </div>
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">Explore</p>
              <div className="flex flex-col gap-2.5 text-sm">
                <Link href="/gallery" className="no-underline text-muted-foreground hover:text-foreground transition-colors">Farms</Link>
                <Link href="/gallery?tab=tours" className="no-underline text-muted-foreground hover:text-foreground transition-colors">Tours</Link>
                <Link href="/plants" className="no-underline text-muted-foreground hover:text-foreground transition-colors">Plant Database</Link>
                <Link href="/shops" className="no-underline text-muted-foreground hover:text-foreground transition-colors">Farm Shops</Link>
              </div>
            </div>
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">Learn</p>
              <div className="flex flex-col gap-2.5 text-sm">
                <Link href="/learn/blog" className="no-underline text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
                <Link href="/gallery?tab=stories" className="no-underline text-muted-foreground hover:text-foreground transition-colors">Farm Stories</Link>
                <Link href="/plants" className="no-underline text-muted-foreground hover:text-foreground transition-colors">Species Guide</Link>
              </div>
            </div>
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">For Farmers</p>
              <div className="flex flex-col gap-2.5 text-sm">
                <Link href={isSignedIn ? "/canvas" : "/login"} className="no-underline text-muted-foreground hover:text-foreground transition-colors">
                  {isSignedIn ? "Dashboard" : "Farmer Login"}
                </Link>
                <Link href="/login" className="no-underline text-muted-foreground hover:text-foreground transition-colors">Farmer Login</Link>
              </div>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/20 pt-8 text-xs text-muted-foreground/50 sm:flex-row">
            <p className="m-0">Real farms. Real food. Real people.</p>
            <p className="m-0">&copy; {new Date().getFullYear()} Permaculture.Studio</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
