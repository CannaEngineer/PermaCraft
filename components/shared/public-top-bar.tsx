"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Leaf, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { isRouteActive } from "@/lib/nav/navigation";

export function PublicTopBar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navItems = [
    { href: "/gallery", label: "Explore Farms", short: "Farms" },
    { href: "/gallery?tab=tours", label: "Tours", short: "Tours", matchPath: "/tour" },
    { href: "/plants", label: "Plant Database", short: "Plants" },
    { href: "/learn/blog", label: "Blog", short: "Blog" },
    { href: "/shops", label: "Farm Shops", short: "Shops" },
  ];

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-background/90 backdrop-blur-xl border-b border-border/40 shadow-sm"
          : "bg-background/80 backdrop-blur-lg border-b border-border/30"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-serif text-xl font-bold tracking-tight text-foreground no-underline hover:no-underline"
        >
          <Leaf className="h-5 w-5 text-primary" />
          <span className="hidden sm:inline">Permaculture.Studio</span>
          <span className="sm:hidden">P.Studio</span>
        </Link>

        {/* Desktop nav - visitor focused */}
        <div className="hidden lg:flex items-center gap-0.5">
          {navItems.map((item) => {
            const active = isRouteActive(pathname, item.href) || (item.matchPath && isRouteActive(pathname, item.matchPath));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-all no-underline",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                )}
              >
                {item.short}
              </Link>
            );
          })}
        </div>

        {/* Farmer entry - subtle */}
        <div className="hidden lg:flex items-center gap-2">
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-muted-foreground/60 no-underline transition-all hover:text-foreground hover:bg-foreground/5"
            title="Farmer login"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Farmer Login</span>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden p-2 rounded-full hover:bg-foreground/5 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      <div
        className={cn(
          "lg:hidden overflow-hidden transition-all duration-300 ease-out",
          mobileMenuOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="bg-background/95 backdrop-blur-xl border-t border-border/30 px-6 py-4 space-y-1">
          {navItems.map((item) => {
            const active = isRouteActive(pathname, item.href) || (item.matchPath && isRouteActive(pathname, item.matchPath));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "block rounded-xl px-4 py-3 text-sm font-medium transition-colors no-underline",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-foreground/5"
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="pt-3 mt-2 border-t border-border/30 flex gap-2">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-border/50 py-2.5 text-xs font-medium text-muted-foreground no-underline"
            >
              <Eye className="h-3.5 w-3.5" />
              Login
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
