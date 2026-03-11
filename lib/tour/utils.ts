/**
 * PermaTour AI utility functions
 */

/**
 * Generate a URL-safe slug from a string
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}

/**
 * Generate a unique QR code ID for a POI
 */
export function generateQrCodeId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Calculate distance between two GPS coordinates in meters (Haversine formula)
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Detect device type from User-Agent string
 */
export function detectDeviceType(userAgent: string | null): string {
  if (!userAgent) return 'unknown';
  if (/mobile/i.test(userAgent)) return 'mobile';
  if (/tablet|ipad/i.test(userAgent)) return 'tablet';
  return 'desktop';
}

/**
 * Simple rate limiter using in-memory map (per-process)
 * For production, use Redis or similar
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}

/**
 * POI category metadata for icons and colors
 */
export const POI_CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
  garden: { label: 'Garden', icon: 'Flower2', color: '#22c55e' },
  orchard: { label: 'Orchard', icon: 'Apple', color: '#f59e0b' },
  water_feature: { label: 'Water Feature', icon: 'Droplets', color: '#3b82f6' },
  structure: { label: 'Structure', icon: 'Home', color: '#8b5cf6' },
  wildlife: { label: 'Wildlife', icon: 'Bird', color: '#ec4899' },
  compost: { label: 'Compost', icon: 'Recycle', color: '#78716c' },
  greenhouse: { label: 'Greenhouse', icon: 'Warehouse', color: '#14b8a6' },
  food_forest: { label: 'Food Forest', icon: 'TreePine', color: '#15803d' },
  general: { label: 'General', icon: 'MapPin', color: '#6b7280' },
};

/**
 * Build the tour URL for a farm
 */
export function getTourUrl(slug: string, appUrl?: string): string {
  const base = appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base}/tour/${slug}`;
}

/**
 * Build a POI QR URL
 */
export function getPoiQrUrl(farmSlug: string, poiId: string, appUrl?: string): string {
  const base = appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base}/tour/${farmSlug}/poi/${poiId}`;
}
