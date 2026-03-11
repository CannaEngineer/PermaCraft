import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { LandingNav } from "@/components/shared/landing-nav";

async function getLandingData() {
  try {
    const [farmsResult, statsResult] = await Promise.all([
      db.execute({
        sql: `
          SELECT f.id, f.name, f.description, f.acres, f.climate_zone,
                 f.is_shop_enabled,
                 u.name as owner_name,
                 (SELECT COUNT(*) FROM farm_tours WHERE farm_id = f.id AND status = 'published') as tour_count,
                 (SELECT COUNT(*) FROM shop_products WHERE farm_id = f.id AND is_published = 1) as product_count,
                 (SELECT COUNT(*) FROM farm_follows WHERE farm_id = f.id) as follower_count,
                 (SELECT screenshot_url FROM map_snapshots WHERE farm_id = f.id ORDER BY created_at DESC LIMIT 1) as latest_screenshot
          FROM farms f
          JOIN users u ON f.user_id = u.id
          WHERE f.is_public = 1
          ORDER BY follower_count DESC, tour_count DESC
          LIMIT 6
        `,
        args: [],
      }),
      db.execute({
        sql: `
          SELECT
            (SELECT COUNT(*) FROM farms WHERE is_public = 1) as total_farms,
            (SELECT COUNT(*) FROM species) as total_species,
            (SELECT COUNT(DISTINCT user_id) FROM farms WHERE is_public = 1) as total_farmers,
            (SELECT COUNT(*) FROM farms WHERE is_public = 1 AND is_shop_enabled = 1) as total_shops
        `,
        args: [],
      }),
    ]);

    return {
      farms: farmsResult.rows,
      stats: statsResult.rows[0] || { total_farms: 0, total_species: 0, total_farmers: 0, total_shops: 0 },
    };
  } catch {
    return {
      farms: [],
      stats: { total_farms: 0, total_species: 0, total_farmers: 0, total_shops: 0 },
    };
  }
}

export default async function LandingPage() {
  const session = await getSession();
  const isSignedIn = !!session;
  const { farms, stats } = await getLandingData();
  const speciesCount = Number(stats.total_species) || 0;
  const speciesLabel = speciesCount > 0 ? `${speciesCount.toLocaleString()}+` : "Hundreds of";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav isSignedIn={isSignedIn} />

      {/* Hero */}
      <section className="landing-gradient-bg relative flex min-h-[85vh] flex-col items-center justify-center px-6 pt-20 text-center">
        <h1
          className="landing-fade-up mx-auto max-w-4xl font-serif font-bold leading-[1.05] tracking-tight"
          style={{ fontSize: "clamp(2.5rem, 7vw, 5.5rem)", marginBottom: "1.5rem", animationDelay: "0.1s" }}
        >
          Design Your Land.{" "}
          <span style={{ color: "hsl(var(--primary))" }}>Grow Your Future.</span>
        </h1>
        <p
          className="landing-fade-up mx-auto max-w-xl font-sans text-muted-foreground"
          style={{ fontSize: "clamp(1.05rem, 1.8vw, 1.25rem)", lineHeight: 1.7, animationDelay: "0.35s" }}
        >
          AI-powered permaculture planning. Draw zones on your land, get native plant recommendations, and simulate years of growth — all in one place.
        </p>
        <div className="landing-fade-up mt-8 flex flex-wrap items-center justify-center gap-4" style={{ animationDelay: "0.6s" }}>
          <Link
            href="/gallery"
            className="landing-glow-hover inline-flex items-center rounded-lg px-7 py-3.5 text-base font-semibold no-underline transition-colors"
            style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          >
            Explore Farms
          </Link>
          <Link
            href={isSignedIn ? "/dashboard" : "/register"}
            className="inline-flex items-center rounded-lg border px-7 py-3.5 text-base font-semibold no-underline transition-colors hover:bg-muted"
            style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
          >
            {isSignedIn ? "Go to Dashboard" : "Start Designing — Free"}
          </Link>
        </div>

        {/* Stats ribbon */}
        <div className="landing-fade-up mt-14 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground" style={{ animationDelay: "0.8s" }}>
          {Number(stats.total_farms) > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-foreground">{Number(stats.total_farms).toLocaleString()}</span>
              <span>Farms</span>
            </div>
          )}
          {speciesCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-foreground">{speciesCount.toLocaleString()}</span>
              <span>Plant Species</span>
            </div>
          )}
          {Number(stats.total_farmers) > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-foreground">{Number(stats.total_farmers).toLocaleString()}</span>
              <span>Farmers</span>
            </div>
          )}
        </div>
      </section>

      {/* Featured Farms */}
      {farms.length > 0 && (
        <section style={{ padding: "72px 0 80px", background: "hsl(var(--muted)/0.25)" }}>
          <div className="mx-auto max-w-7xl px-6">
            <div className="landing-scroll-reveal mb-10 text-center">
              <h2 className="font-serif font-bold tracking-tight" style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", marginBottom: "12px" }}>
                Farms on the platform
              </h2>
              <p style={{ fontSize: "clamp(1rem, 1.5vw, 1.15rem)", color: "hsl(var(--muted-foreground))", maxWidth: 520, margin: "0 auto" }}>
                Real permaculture farms designed and shared by our community.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {farms.map((farm: any) => (
                <Link
                  key={farm.id}
                  href={`/farm/${farm.id}`}
                  className="landing-scroll-reveal group relative overflow-hidden rounded-xl no-underline"
                  style={{ aspectRatio: "4/3", border: "1px solid hsl(var(--border))" }}
                >
                  <div className="absolute inset-0">
                    {farm.latest_screenshot ? (
                      <img
                        src={farm.latest_screenshot}
                        alt={farm.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full" style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.15), hsl(var(--secondary)/0.1))" }} />
                    )}
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)" }} />
                  </div>
                  <div className="relative flex h-full flex-col justify-end p-5 text-white">
                    <h3 className="mb-1 text-lg font-bold leading-tight">{farm.name}</h3>
                    <p className="text-sm text-white/70">
                      by {farm.owner_name}
                      {farm.acres ? ` · ${farm.acres} acres` : ""}
                      {farm.climate_zone ? ` · ${farm.climate_zone}` : ""}
                    </p>
                    <div className="mt-2 flex gap-3 text-xs text-white/60">
                      {Number(farm.tour_count) > 0 && <span>{farm.tour_count} tour{Number(farm.tour_count) !== 1 ? "s" : ""}</span>}
                      {Number(farm.product_count) > 0 && <span>{farm.product_count} product{Number(farm.product_count) !== 1 ? "s" : ""}</span>}
                      {Number(farm.follower_count) > 0 && <span>{farm.follower_count} follower{Number(farm.follower_count) !== 1 ? "s" : ""}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/gallery"
                className="inline-flex items-center gap-2 rounded-lg border px-6 py-3 text-sm font-semibold no-underline transition-colors hover:bg-muted"
                style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
              >
                View All Farms
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <h2 className="landing-scroll-reveal mb-4 text-center font-serif font-bold tracking-tight" style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)" }}>
            A smarter way to design with nature
          </h2>
          <p className="landing-scroll-reveal mx-auto mb-14 max-w-xl text-center text-muted-foreground" style={{ fontSize: "clamp(1rem, 1.5vw, 1.15rem)" }}>
            From satellite map to harvest plan — everything you need in one place.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Map Your Land", desc: "Draw zones and plantings on a satellite view of your actual property." },
              { title: "AI Recommendations", desc: "Get permaculture suggestions tailored to your climate, soil, and design goals." },
              { title: "Native Species First", desc: "Every suggestion prioritizes native plants. Non-natives are clearly marked." },
              { title: "Growth Simulation", desc: "Slide through time and watch your food forest grow, year by year." },
            ].map((f, i) => (
              <div
                key={f.title}
                className="landing-scroll-reveal rounded-xl border p-6 transition-all hover:shadow-lg"
                style={{ animationDelay: `${i * 0.1}s`, borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
              >
                <h3 className="mb-2 font-serif text-lg font-bold">{f.title}</h3>
                <p className="text-sm text-muted-foreground" style={{ lineHeight: 1.6, marginBottom: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshot Gallery */}
      <section style={{ padding: "64px 0 72px", background: "hsl(var(--muted)/0.25)" }}>
        <div className="landing-scroll-reveal mb-10 px-6 text-center">
          <h2 className="font-serif font-bold tracking-tight" style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", marginBottom: "12px" }}>
            See it in action
          </h2>
        </div>
        <div style={{
          overflow: "hidden",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
          maskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
        }}>
          <div className="landing-screenshot-marquee" style={{ gap: "20px", paddingBottom: "8px", alignItems: "flex-start" }}>
            {[...[
              { src: "/screenshots/map-editor.png", label: "Map Editor", desc: "Draw zones on your actual land", gradient: "linear-gradient(140deg, #0f2318 0%, #1a4030 40%, #0d2518 70%, #132e1a 100%)" },
              { src: "/screenshots/time-machine.png", label: "Growth Simulation", desc: "Watch your food forest mature", gradient: "linear-gradient(140deg, #0d1a2e 0%, #1a2d4a 40%, #0f2040 70%, #162840 100%)" },
              { src: "/screenshots/ai-analysis.png", label: "AI Analysis", desc: "Permaculture recommendations, instantly", gradient: "linear-gradient(140deg, #1a0d2e 0%, #2d1a4a 40%, #20103c 70%, #281540 100%)" },
              { src: "/screenshots/plant-catalog.png", label: "Plant Catalog", desc: `${speciesLabel} native & companion species`, gradient: "linear-gradient(140deg, #0d2010 0%, #1a3820 40%, #102818 70%, #183020 100%)" },
              { src: "/screenshots/plant-story.png", label: "Plant Stories", desc: "Rich profiles for every species", gradient: "linear-gradient(140deg, #1a1f0a 0%, #2e3512 40%, #222a0d 70%, #282e10 100%)" },
              { src: "/screenshots/farm-story.png", label: "Farm Story", desc: "Share your farm with the world", gradient: "linear-gradient(140deg, #2a1a08 0%, #3d2a10 40%, #301f0a 70%, #38250c 100%)" },
            ], ...[
              { src: "/screenshots/map-editor.png", label: "Map Editor", desc: "Draw zones on your actual land", gradient: "linear-gradient(140deg, #0f2318 0%, #1a4030 40%, #0d2518 70%, #132e1a 100%)" },
              { src: "/screenshots/time-machine.png", label: "Growth Simulation", desc: "Watch your food forest mature", gradient: "linear-gradient(140deg, #0d1a2e 0%, #1a2d4a 40%, #0f2040 70%, #162840 100%)" },
              { src: "/screenshots/ai-analysis.png", label: "AI Analysis", desc: "Permaculture recommendations, instantly", gradient: "linear-gradient(140deg, #1a0d2e 0%, #2d1a4a 40%, #20103c 70%, #281540 100%)" },
              { src: "/screenshots/plant-catalog.png", label: "Plant Catalog", desc: `${speciesLabel} native & companion species`, gradient: "linear-gradient(140deg, #0d2010 0%, #1a3820 40%, #102818 70%, #183020 100%)" },
              { src: "/screenshots/plant-story.png", label: "Plant Stories", desc: "Rich profiles for every species", gradient: "linear-gradient(140deg, #1a1f0a 0%, #2e3512 40%, #222a0d 70%, #282e10 100%)" },
              { src: "/screenshots/farm-story.png", label: "Farm Story", desc: "Share your farm with the world", gradient: "linear-gradient(140deg, #2a1a08 0%, #3d2a10 40%, #301f0a 70%, #38250c 100%)" },
            ]].map((shot, i) => (
              <div key={i} style={{ flexShrink: 0, width: 360, borderRadius: 12, overflow: "hidden", border: "1px solid hsl(var(--border))", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", background: "hsl(var(--card))" }}>
                <div style={{ background: "hsl(var(--muted))", padding: "9px 14px", display: "flex", gap: 6, alignItems: "center", borderBottom: "1px solid hsl(var(--border))" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
                </div>
                <div style={{ aspectRatio: "16/10", backgroundImage: `url('${shot.src}'), ${shot.gradient}`, backgroundSize: "cover", backgroundPosition: "center top", backgroundRepeat: "no-repeat" }} />
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 2 }}>{shot.label}</div>
                  <div style={{ fontSize: "0.8rem", color: "hsl(var(--muted-foreground))" }}>{shot.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Three CTAs */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <h2 className="landing-scroll-reveal mb-4 text-center font-serif font-bold tracking-tight" style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)" }}>
            Built for every kind of grower
          </h2>
          <p className="landing-scroll-reveal mx-auto mb-12 max-w-lg text-center text-muted-foreground" style={{ fontSize: "clamp(1rem, 1.5vw, 1.15rem)" }}>
            Whether you&apos;re exploring, designing, or selling — there&apos;s a place for you here.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Explore Farms",
                desc: "Browse farm tours, read stories, and discover what other growers are building in your bioregion.",
                cta: "Discover Farms",
                href: "/gallery",
                accent: "hsl(var(--primary)/0.08)",
              },
              {
                title: "Design Your Farm",
                desc: "Map your property, draw zones, get AI-powered plant recommendations, and simulate growth over time.",
                cta: isSignedIn ? "Go to Dashboard" : "Start Designing — Free",
                href: isSignedIn ? "/dashboard" : "/register",
                accent: "hsl(var(--accent-summer)/0.12)",
              },
              {
                title: "Open a Farm Store",
                desc: "List your seeds, nursery stock, produce, or farm experiences and reach customers who value local food.",
                cta: isSignedIn ? "Manage My Shop" : "Create Your Shop",
                href: isSignedIn ? "/canvas" : "/register",
                accent: "hsl(var(--accent-autumn)/0.10)",
              },
            ].map((card, i) => (
              <div
                key={card.title}
                className="landing-scroll-reveal flex flex-col rounded-xl border p-7"
                style={{ animationDelay: `${i * 0.1}s`, borderColor: "hsl(var(--border))", background: card.accent }}
              >
                <h3 className="mb-2 font-serif text-xl font-bold">{card.title}</h3>
                <p className="mb-6 flex-1 text-sm text-muted-foreground" style={{ lineHeight: 1.65 }}>{card.desc}</p>
                <Link
                  href={card.href}
                  className="inline-flex w-fit items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold no-underline transition-colors"
                  style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                >
                  {card.cta}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="landing-gradient-bg px-6 py-20 text-center md:py-28">
        <div className="mx-auto max-w-3xl">
          <h2 className="landing-scroll-reveal mb-6 font-serif font-bold tracking-tight" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
            Your land has potential.{" "}
            <span style={{ color: "hsl(var(--primary))" }}>Let&apos;s unlock it.</span>
          </h2>
          <p className="landing-scroll-reveal mx-auto mb-10 max-w-xl text-muted-foreground" style={{ fontSize: "clamp(1rem, 1.5vw, 1.2rem)", lineHeight: 1.7, animationDelay: "0.15s" }}>
            Join farmers and designers building a more regenerative future — one zone at a time.
          </p>
          <div className="landing-scroll-reveal" style={{ animationDelay: "0.3s" }}>
            <Link
              href={isSignedIn ? "/dashboard" : "/register"}
              className="landing-glow-hover inline-flex items-center rounded-lg px-9 py-4 text-lg font-bold no-underline transition-colors"
              style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
            >
              {isSignedIn ? "Go to Dashboard" : "Get Started Free"}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-14" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <p className="mb-3 font-serif text-base font-bold" style={{ marginBottom: "0.75rem" }}>Permaculture.Studio</p>
              <p className="text-sm text-muted-foreground" style={{ lineHeight: 1.6, marginBottom: 0 }}>
                AI-powered permaculture design for farmers, gardeners, and land stewards.
              </p>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold" style={{ marginBottom: "0.75rem" }}>Explore</p>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <Link href="/gallery" className="no-underline hover:underline" style={{ color: "hsl(var(--muted-foreground))" }}>Discover Farms</Link>
                <Link href="/plants" className="no-underline hover:underline" style={{ color: "hsl(var(--muted-foreground))" }}>Plant Catalog</Link>
                <Link href="/shops" className="no-underline hover:underline" style={{ color: "hsl(var(--muted-foreground))" }}>Farm Shops</Link>
                <Link href="/learn/blog" className="no-underline hover:underline" style={{ color: "hsl(var(--muted-foreground))" }}>Blog</Link>
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold" style={{ marginBottom: "0.75rem" }}>For Farmers</p>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <Link href={isSignedIn ? "/dashboard" : "/register"} className="no-underline hover:underline" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {isSignedIn ? "Dashboard" : "Get Started"}
                </Link>
                <Link href="/gallery" className="no-underline hover:underline" style={{ color: "hsl(var(--muted-foreground))" }}>Create a Tour</Link>
                <Link href="/shops" className="no-underline hover:underline" style={{ color: "hsl(var(--muted-foreground))" }}>Open a Shop</Link>
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold" style={{ marginBottom: "0.75rem" }}>Account</p>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                {isSignedIn ? (
                  <Link href="/dashboard" className="no-underline hover:underline" style={{ color: "hsl(var(--muted-foreground))" }}>Dashboard</Link>
                ) : (
                  <>
                    <Link href="/login" className="no-underline hover:underline" style={{ color: "hsl(var(--muted-foreground))" }}>Sign In</Link>
                    <Link href="/register" className="no-underline hover:underline" style={{ color: "hsl(var(--muted-foreground))" }}>Create Account</Link>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t pt-8 text-sm text-muted-foreground sm:flex-row" style={{ borderColor: "hsl(var(--border))" }}>
            <p style={{ marginBottom: 0 }}>Built for regenerative farmers</p>
            <p style={{ marginBottom: 0 }}>&copy; {new Date().getFullYear()} Permaculture.Studio</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
