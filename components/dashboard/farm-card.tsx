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

interface FarmWithScreenshot extends Farm {
  latest_screenshot?: string | null;
}

interface FarmCardProps {
  farm: FarmWithScreenshot;
}

export function FarmCard({ farm }: FarmCardProps) {
  return (
    <Link href={`/farm/${farm.id}`}>
      <Card className="hover:border-primary transition-colors cursor-pointer h-full bg-card hover:bg-accent overflow-hidden">
        {farm.latest_screenshot ? (
          <div className="relative w-full h-48 bg-muted">
            <img
              src={farm.latest_screenshot}
              alt={`${farm.name} map preview`}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Hide image if it fails to load
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="relative w-full h-48 bg-muted flex items-center justify-center">
            <MapIcon className="h-16 w-16 text-muted-foreground/30" />
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
          <p className="text-sm text-muted-foreground line-clamp-2">
            {farm.description || "No description"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
