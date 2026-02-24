"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export function PublicTopBar() {
  const pathname = usePathname();
  const isBlogActive = pathname?.startsWith("/learn/blog");
  const isPlantsActive = pathname?.startsWith("/plants");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-serif text-xl font-bold tracking-tight no-underline hover:no-underline"
          style={{ color: "hsl(var(--foreground))" }}
        >
          Permaculture.Studio
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/learn/blog"
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors no-underline ${
              isBlogActive ? "bg-muted" : "hover:bg-muted"
            }`}
            style={{ color: "hsl(var(--foreground))" }}
          >
            Blog
          </Link>
          <Link
            href="/plants"
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors no-underline ${
              isPlantsActive ? "bg-muted" : "hover:bg-muted"
            }`}
            style={{ color: "hsl(var(--foreground))" }}
          >
            Plants
          </Link>
          <Link
            href="/login"
            className="rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-muted no-underline"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="rounded-full px-4 py-2 text-sm font-medium no-underline"
            style={{
              backgroundColor: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
            }}
          >
            Get Started
          </Link>
        </div>

        {/* Mobile hamburger button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
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

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-lg px-6 py-4 space-y-2">
          <Link
            href="/learn/blog"
            onClick={() => setMobileMenuOpen(false)}
            className={`block rounded-lg px-4 py-3 text-sm font-medium transition-colors no-underline ${
              isBlogActive ? "bg-muted" : "hover:bg-muted"
            }`}
            style={{ color: "hsl(var(--foreground))" }}
          >
            Blog
          </Link>
          <Link
            href="/plants"
            onClick={() => setMobileMenuOpen(false)}
            className={`block rounded-lg px-4 py-3 text-sm font-medium transition-colors no-underline ${
              isPlantsActive ? "bg-muted" : "hover:bg-muted"
            }`}
            style={{ color: "hsl(var(--foreground))" }}
          >
            Plants
          </Link>
          <Link
            href="/login"
            onClick={() => setMobileMenuOpen(false)}
            className="block rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-muted no-underline"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Sign In
          </Link>
          <Link
            href="/register"
            onClick={() => setMobileMenuOpen(false)}
            className="block rounded-full px-4 py-3 text-sm font-medium text-center no-underline"
            style={{
              backgroundColor: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
            }}
          >
            Get Started
          </Link>
        </div>
      )}
    </nav>
  );
}
