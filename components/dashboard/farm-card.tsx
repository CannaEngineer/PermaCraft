"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MapIcon } from "lucide-react";
import type { Farm } from "@/lib/db/schema";
import { FarmVitals } from "@/components/farm/farm-vitals";

interface PlantingWithSpecies {
  id: string;
  species_id: string;
  common_name?: string;
  permaculture_functions?: string | null;
}

interface FarmWithScreenshot extends Farm {
  latest_screenshot?: string | null;
  plantings?: PlantingWithSpecies[];
}

interface FarmCardProps {
  farm: FarmWithScreenshot;
}

export function FarmCard({ farm }: FarmCardProps) {
  return (
    <Link href={`/farm/${farm.id}`}>
      <Card className="card-interactive overflow-hidden animate-fade-in">
        {farm.latest_screenshot ? (
          <div className="relative w-full h-48 bg-muted overflow-hidden">
            <img
              src={farm.latest_screenshot}
              alt={`${farm.name} map preview`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                // Hide image if it fails to load
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="relative w-full h-48 bg-gradient-spring flex items-center justify-center">
            <MapIcon className="h-16 w-16 text-primary/20 transition-transform duration-300 group-hover:scale-110" />
          </div>
        )}
        <CardHeader>
          <CardTitle className="font-serif">{farm.name}</CardTitle>
          <CardDescription>
            {farm.acres ? `${farm.acres} acres` : "Size not set"}
            {farm.climate_zone && ` • Zone ${farm.climate_zone}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {farm.description || "No description"}
          </p>

          {/* Farm Vitals - Compact View */}
          {farm.plantings && farm.plantings.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Farm Vitals
              </div>
              <FarmVitals plantings={farm.plantings} compact />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
