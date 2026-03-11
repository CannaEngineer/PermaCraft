"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

interface LandingNavProps {
  isSignedIn: boolean;
}

export function LandingNav({ isSignedIn }: LandingNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-serif text-xl font-bold tracking-tight text-foreground no-underline hover:no-underline"
        >
          Permaculture.Studio
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          <Link
            href="/gallery"
            className="rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-muted no-underline text-foreground"
          >
            Discover
          </Link>
          <Link
            href="/plants"
            className="rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-muted no-underline text-foreground"
          >
            Plants
          </Link>
          <Link
            href="/shops"
            className="rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-muted no-underline text-foreground"
          >
            Shops
          </Link>
          <Link
            href="/learn/blog"
            className="rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-muted no-underline text-foreground"
          >
            Blog
          </Link>
          <div className="ml-2 flex items-center gap-2">
            {isSignedIn ? (
              <Link
                href="/dashboard"
                className="rounded-full px-5 py-2 text-sm font-medium no-underline bg-primary text-primary-foreground"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-muted no-underline text-foreground"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="rounded-full px-5 py-2 text-sm font-medium no-underline bg-primary text-primary-foreground"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile hamburger */}
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

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-lg px-6 py-4 space-y-1">
          <Link
            href="/gallery"
            onClick={() => setMobileMenuOpen(false)}
            className="block rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-muted no-underline text-foreground"
          >
            Discover Farms
          </Link>
          <Link
            href="/plants"
            onClick={() => setMobileMenuOpen(false)}
            className="block rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-muted no-underline text-foreground"
          >
            Plant Catalog
          </Link>
          <Link
            href="/shops"
            onClick={() => setMobileMenuOpen(false)}
            className="block rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-muted no-underline text-foreground"
          >
            Farm Shops
          </Link>
          <Link
            href="/learn/blog"
            onClick={() => setMobileMenuOpen(false)}
            className="block rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-muted no-underline text-foreground"
          >
            Blog
          </Link>
          <div className="pt-2 border-t border-border/50 mt-2 space-y-1">
            {isSignedIn ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-full px-4 py-3 text-sm font-medium text-center no-underline bg-primary text-primary-foreground"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-muted no-underline text-foreground"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-full px-4 py-3 text-sm font-medium text-center no-underline bg-primary text-primary-foreground"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
