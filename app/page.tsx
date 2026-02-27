import Link from "next/link";
import { getSession } from "@/lib/auth/session";

const screenshots = [
  { src: "/screenshots/map-editor.png", label: "Map Editor", desc: "Draw zones on your actual land", gradient: "linear-gradient(140deg, #0f2318 0%, #1a4030 40%, #0d2518 70%, #132e1a 100%)" },
  { src: "/screenshots/time-machine.png", label: "Growth Simulation", desc: "Watch your food forest mature", gradient: "linear-gradient(140deg, #0d1a2e 0%, #1a2d4a 40%, #0f2040 70%, #162840 100%)" },
  { src: "/screenshots/ai-analysis.png", label: "AI Analysis", desc: "Permaculture recommendations, instantly", gradient: "linear-gradient(140deg, #1a0d2e 0%, #2d1a4a 40%, #20103c 70%, #281540 100%)" },
  { src: "/screenshots/plant-catalog.png", label: "Plant Catalog", desc: "2,000+ native & companion species", gradient: "linear-gradient(140deg, #0d2010 0%, #1a3820 40%, #102818 70%, #183020 100%)" },
  { src: "/screenshots/plant-story.png", label: "Plant Stories", desc: "Rich profiles for every species", gradient: "linear-gradient(140deg, #1a1f0a 0%, #2e3512 40%, #222a0d 70%, #282e10 100%)" },
  { src: "/screenshots/farm-story.png", label: "Farm Story", desc: "Share your farm with the world", gradient: "linear-gradient(140deg, #2a1a08 0%, #3d2a10 40%, #301f0a 70%, #38250c 100%)" },
];

export default async function LandingPage() {
  const session = await getSession();
  const isSignedIn = !!session;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-serif text-xl font-bold tracking-tight no-underline hover:no-underline" style={{ color: "hsl(var(--foreground))" }}>
            Permaculture.Studio
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/learn/blog" className="rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-muted no-underline" style={{ color: "hsl(var(--foreground))" }}>
              Blog
            </Link>
            {isSignedIn ? (
              <Link href="/dashboard" className="rounded-md px-4 py-2 text-sm font-medium no-underline" style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-muted no-underline" style={{ color: "hsl(var(--foreground))" }}>
                  Sign In
                </Link>
                <Link href="/register" className="rounded-md px-4 py-2 text-sm font-medium no-underline" style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-gradient-bg relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1
          className="landing-fade-up mx-auto max-w-5xl font-serif font-bold leading-[1.05] tracking-tight"
          style={{ fontSize: "clamp(3rem, 8vw, 7rem)", marginBottom: "1.5rem", animationDelay: "0.1s" }}
        >
          Design Your Land.{" "}
          <span style={{ color: "hsl(var(--primary))" }}>Grow Your Future.</span>
        </h1>
        <p
          className="landing-fade-up mx-auto max-w-xl font-sans text-muted-foreground"
          style={{ fontSize: "clamp(1.1rem, 2vw, 1.35rem)", lineHeight: 1.7, animationDelay: "0.35s" }}
        >
          AI-powered permaculture planning. Draw zones on your land, get instant native plant recommendations, and simulate years of growth in seconds.
        </p>
        <div className="landing-fade-up mt-10" style={{ animationDelay: "0.6s" }}>
          <Link
            href={isSignedIn ? "/dashboard" : "/register"}
            className="landing-glow-hover inline-flex items-center rounded-lg px-8 py-4 text-lg font-semibold no-underline transition-colors"
            style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          >
            {isSignedIn ? "Go to Dashboard" : "Start Designing — Free"}
          </Link>
        </div>
      </section>

      {/* Screenshot Gallery */}
      <section style={{ padding: "80px 0 88px", background: "hsl(var(--muted)/0.25)" }}>
        <div className="landing-scroll-reveal" style={{ textAlign: "center", padding: "0 24px 52px" }}>
          <h2 className="font-serif font-bold tracking-tight" style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", marginBottom: "12px" }}>
            See it in action
          </h2>
          <p style={{ fontSize: "clamp(1rem, 1.5vw, 1.15rem)", color: "hsl(var(--muted-foreground))", maxWidth: 560, margin: "0 auto" }}>
            From satellite map to harvest plan — everything in one place.
          </p>
        </div>
        <div style={{
          overflow: "hidden",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
          maskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
        }}>
          <div className="landing-screenshot-marquee" style={{ gap: "20px", paddingBottom: "8px", alignItems: "flex-start" }}>
            {[...screenshots, ...screenshots].map((shot, i) => (
              <div key={i} style={{ flexShrink: 0, width: 380, borderRadius: 12, overflow: "hidden", border: "1px solid hsl(var(--border))", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", background: "hsl(var(--card))" }}>
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

      {/* Features */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <h2 className="landing-scroll-reveal mb-16 text-center font-serif font-bold tracking-tight" style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}>
            A smarter way to design with nature
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Map Editor", desc: "Draw zones and plantings on a satellite view of your actual land." },
              { title: "AI Recommendations", desc: "Get permaculture-informed suggestions based on your climate, soil, and design." },
              { title: "Native Species First", desc: "Every suggestion prioritizes native plants. Non-natives are clearly marked." },
              { title: "Growth Simulation", desc: "Slide through time and watch your food forest fill in, year by year." },
            ].map((f, i) => (
              <div
                key={f.title}
                className="landing-scroll-reveal rounded-xl border p-6 transition-all hover:shadow-lg"
                style={{ animationDelay: `${i * 0.1}s`, borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
              >
                <h3 className="mb-2 font-serif text-lg font-bold">{f.title}</h3>
                <p className="text-sm text-muted-foreground" style={{ lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-gradient-bg px-6 py-24 text-center md:py-32">
        <div className="mx-auto max-w-3xl">
          <h2 className="landing-scroll-reveal mb-6 font-serif font-bold tracking-tight" style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}>
            Your land has potential.{" "}
            <span style={{ color: "hsl(var(--primary))" }}>Let&apos;s unlock it.</span>
          </h2>
          <p className="landing-scroll-reveal mx-auto mb-10 max-w-xl text-muted-foreground" style={{ fontSize: "clamp(1rem, 1.5vw, 1.25rem)", lineHeight: 1.7, animationDelay: "0.15s" }}>
            Join farmers and designers building a more regenerative future — one zone at a time.
          </p>
          <div className="landing-scroll-reveal" style={{ animationDelay: "0.3s" }}>
            <Link
              href={isSignedIn ? "/dashboard" : "/register"}
              className="landing-glow-hover inline-flex items-center rounded-lg px-10 py-5 text-xl font-bold no-underline transition-colors"
              style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
            >
              {isSignedIn ? "Go to Dashboard" : "Get Started Free"}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-12" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
          <p className="font-serif text-sm font-semibold" style={{ marginBottom: 0 }}>Permaculture.Studio</p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/learn/blog" className="no-underline hover:underline" style={{ color: "hsl(var(--muted-foreground))" }}>Blog</Link>
            <Link href="/gallery" className="no-underline hover:underline" style={{ color: "hsl(var(--muted-foreground))" }}>Gallery</Link>
            {isSignedIn ? (
              <Link href="/dashboard" className="no-underline hover:underline" style={{ color: "hsl(var(--muted-foreground))" }}>Dashboard</Link>
            ) : (
              <Link href="/register" className="no-underline hover:underline" style={{ color: "hsl(var(--muted-foreground))" }}>Sign Up</Link>
            )}
          </div>
          <p className="text-sm text-muted-foreground" style={{ marginBottom: 0 }}>Built for regenerative farmers</p>
        </div>
      </footer>
    </div>
  );
}
