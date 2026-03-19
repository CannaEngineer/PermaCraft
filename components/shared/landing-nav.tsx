"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Leaf, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface LandingNavProps {
  isSignedIn: boolean;
}

export function LandingNav({ isSignedIn }: LandingNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-background/90 backdrop-blur-xl border-b border-border/40 shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-serif text-xl font-bold tracking-tight text-foreground no-underline hover:no-underline"
        >
          <Leaf className="h-5 w-5 text-primary" />
          <span>Permaculture.Studio</span>
        </Link>

        {/* Desktop nav - visitor focused */}
        <div className="hidden lg:flex items-center gap-0.5">
          <Link
            href="/gallery"
            className="rounded-full px-4 py-2 text-sm font-medium transition-all hover:bg-foreground/5 no-underline text-foreground/80 hover:text-foreground"
          >
            Find Farms
          </Link>
          <Link
            href="/gallery?tab=tours"
            className="rounded-full px-4 py-2 text-sm font-medium transition-all hover:bg-foreground/5 no-underline text-foreground/80 hover:text-foreground"
          >
            Tours
          </Link>
          <Link
            href="/shops"
            className="rounded-full px-4 py-2 text-sm font-medium transition-all hover:bg-foreground/5 no-underline text-foreground/80 hover:text-foreground"
          >
            Shop
          </Link>
          <Link
            href="/plants"
            className="rounded-full px-4 py-2 text-sm font-medium transition-all hover:bg-foreground/5 no-underline text-foreground/80 hover:text-foreground"
          >
            Plants
          </Link>
          <Link
            href="/learn/blog"
            className="rounded-full px-4 py-2 text-sm font-medium transition-all hover:bg-foreground/5 no-underline text-foreground/80 hover:text-foreground"
          >
            Stories
          </Link>
        </div>

        {/* Right side - farmer entry point (subtle) */}
        <div className="hidden lg:flex items-center gap-2">
          {isSignedIn ? (
            <Link
              href="/canvas"
              className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary no-underline transition-all hover:bg-primary/10"
            >
              <Leaf className="h-3.5 w-3.5" />
              My Farm
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-muted-foreground/70 no-underline transition-all hover:text-foreground hover:bg-foreground/5"
                title="Farmer login"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Farmer Login</span>
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-border/60 px-4 py-2 text-xs font-medium text-muted-foreground no-underline transition-all hover:border-primary/40 hover:text-primary hover:bg-primary/5"
              >
                I&apos;m a Grower
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden p-2 rounded-full hover:bg-foreground/5 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      <div
        className={cn(
          "lg:hidden overflow-hidden transition-all duration-300 ease-out",
          mobileMenuOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="bg-background/95 backdrop-blur-xl border-t border-border/30 px-6 py-5 space-y-1">
          {[
            { href: "/gallery", label: "Find Farms", desc: "Real permaculture farms near you" },
            { href: "/shops", label: "Shop", desc: "Seeds, produce & plants from growers" },
            { href: "/gallery?tab=tours", label: "Farm Tours", desc: "Walk the land virtually or in person" },
            { href: "/plants", label: "Plants", desc: "Native species & growing guides" },
            { href: "/learn/blog", label: "Stories", desc: "Hear from the growers themselves" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="flex flex-col rounded-xl px-4 py-3 transition-colors hover:bg-foreground/5 no-underline"
            >
              <span className="text-sm font-semibold text-foreground">{item.label}</span>
              <span className="text-xs text-muted-foreground">{item.desc}</span>
            </Link>
          ))}

          {/* Farmer entry - subtle separator */}
          <div className="pt-3 mt-3 border-t border-border/30">
            <p className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              For Farmers
            </p>
            <div className="flex gap-2 px-4">
              {isSignedIn ? (
                <Link
                  href="/canvas"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 py-2.5 text-sm font-medium text-primary no-underline"
                >
                  <Leaf className="h-3.5 w-3.5" />
                  My Farm
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-border/50 py-2.5 text-xs font-medium text-muted-foreground no-underline"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Login
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
