import Link from "next/link";
import { Leaf, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 mb-6">
              <Leaf className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-6xl font-serif font-bold text-foreground mb-3">
              404
            </h1>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Page not found
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              This part of the garden hasn&apos;t been planted yet.
              The page you&apos;re looking for may have been moved or no longer exists.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
            <Link
              href="/gallery"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              <Search className="h-4 w-4" />
              Explore Farms
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
