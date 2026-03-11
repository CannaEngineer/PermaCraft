"use client";

import { useEffect, useRef, useState } from "react";

interface LandingHeroClientProps {
  totalFarms: number;
  totalSpecies: number;
  totalTours: number;
  totalFarmers: number;
}

function AnimatedCounter({ target, label, suffix = "" }: { target: number; label: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (target === 0 || hasAnimated.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1200;
          const startTime = performance.now();
          const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutQuart(progress);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  if (target === 0) return null;

  return (
    <div ref={ref} className="flex flex-col items-center">
      <span className="text-2xl font-bold tabular-nums text-foreground">
        {count.toLocaleString()}{suffix}
      </span>
      <span className="text-xs text-muted-foreground/60 mt-0.5">{label}</span>
    </div>
  );
}

export function LandingHeroClient({ totalFarms, totalSpecies, totalTours, totalFarmers }: LandingHeroClientProps) {
  const hasAnyStats = totalFarms > 0 || totalSpecies > 0 || totalTours > 0;

  if (!hasAnyStats) return null;

  return (
    <div
      className="landing-fade-up mt-16 flex flex-wrap items-center justify-center gap-10"
      style={{ animationDelay: "0.9s" }}
    >
      <AnimatedCounter target={totalFarms} label="Farms" />
      <div className="h-8 w-px bg-border/30 hidden sm:block" />
      <AnimatedCounter target={totalSpecies} label="Plant Species" suffix="+" />
      <div className="h-8 w-px bg-border/30 hidden sm:block" />
      <AnimatedCounter target={totalTours} label="Virtual Tours" />
      <div className="h-8 w-px bg-border/30 hidden sm:block" />
      <AnimatedCounter target={totalFarmers} label="Farmers" />
    </div>
  );
}
