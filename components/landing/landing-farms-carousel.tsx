"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";

interface Farm {
  id: string;
  name: string;
  description: string | null;
  acres: number | null;
  climate_zone: string | null;
  owner_name: string;
  owner_image: string | null;
  tour_count: number;
  follower_count: number;
  latest_screenshot: string | null;
}

export function LandingFarmsCarousel({ farms }: { farms: Farm[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    updateScrollState();
    return () => el.removeEventListener("scroll", updateScrollState);
  }, []);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {/* Scroll arrows */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm border border-border/50 shadow-lg flex items-center justify-center text-foreground transition-all hover:bg-background hover:scale-105"
          aria-label="Scroll left"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm border border-border/50 shadow-lg flex items-center justify-center text-foreground transition-all hover:bg-background hover:scale-105"
          aria-label="Scroll right"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      )}

      {/* Fade edges */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-12 z-[5]"
        style={{ background: "linear-gradient(to right, hsl(var(--background)), transparent)" }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-12 z-[5]"
        style={{ background: "linear-gradient(to left, hsl(var(--background)), transparent)" }}
      />

      {/* Scrollable cards */}
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto px-6 pb-4 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollPaddingLeft: "1.5rem" }}
      >
        {farms.map((farm, i) => (
          <Link
            key={farm.id}
            href={`/farm/${farm.id}`}
            className="group flex-shrink-0 snap-start relative overflow-hidden rounded-2xl no-underline landing-card-hover"
            style={{
              width: "min(340px, 80vw)",
              aspectRatio: "3/4",
              border: "1px solid hsl(var(--border)/0.4)",
            }}
          >
            <div className="absolute inset-0">
              {farm.latest_screenshot ? (
                <img
                  src={farm.latest_screenshot}
                  alt={farm.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading={i < 3 ? "eager" : "lazy"}
                />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    background: `linear-gradient(${135 + i * 30}deg, hsl(var(--primary)/0.15), hsl(var(--secondary)/0.08))`,
                  }}
                />
              )}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 45%, transparent 100%)" }}
              />
            </div>

            <div className="relative flex h-full flex-col justify-end p-6 text-white">
              {/* Owner avatar */}
              <div className="flex items-center gap-2.5 mb-3">
                {farm.owner_image ? (
                  <img src={farm.owner_image} alt="" className="h-8 w-8 rounded-full object-cover border border-white/20" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-white/15 border border-white/10" />
                )}
                <span className="text-sm font-medium text-white/80">{farm.owner_name}</span>
              </div>

              <h3 className="text-xl font-bold leading-tight mb-1">{farm.name}</h3>

              {farm.description && (
                <p className="text-sm text-white/50 line-clamp-2 leading-relaxed mb-2">
                  {farm.description}
                </p>
              )}

              <div className="flex items-center gap-3 text-xs text-white/40">
                {farm.acres && <span>{farm.acres} acres</span>}
                {farm.climate_zone && <span>{farm.climate_zone}</span>}
                {Number(farm.tour_count) > 0 && (
                  <span className="flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>
                    {farm.tour_count} tour{Number(farm.tour_count) !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
