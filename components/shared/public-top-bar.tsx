"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PublicTopBar() {
  const pathname = usePathname();
  const isBlogActive = pathname?.startsWith("/learn/blog");

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
        <div className="flex items-center gap-3">
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
      </div>
    </nav>
  );
}
