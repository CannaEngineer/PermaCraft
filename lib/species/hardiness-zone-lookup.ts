/**
 * USDA Hardiness Zone Lookup
 *
 * Two-step lookup:
 * 1. Reverse geocode lat/lng → US ZIP code via Nominatim
 * 2. ZIP → zone via phzmapi.org
 * 3. Latitude fallback when APIs unavailable
 */

export interface HardinessZoneResult {
  zone: string;
  temperature_range: string | null;
  source: 'phzmapi' | 'latitude_estimate';
}

/**
 * Look up USDA hardiness zone for a lat/lng coordinate.
 * Uses Nominatim reverse geocoding → phzmapi.org, with latitude fallback.
 */
export async function lookupHardinessZone(
  lat: number,
  lng: number
): Promise<HardinessZoneResult> {
  try {
    // Step 1: Reverse geocode to get ZIP code
    const zip = await reverseGeocodeToZip(lat, lng);
    if (zip) {
      // Step 2: Look up zone from ZIP
      const zoneData = await lookupZoneFromZip(zip);
      if (zoneData) {
        return {
          zone: zoneData.zone,
          temperature_range: zoneData.temperature_range,
          source: 'phzmapi',
        };
      }
    }
  } catch (error) {
    console.warn('Hardiness zone API lookup failed, using latitude fallback:', error);
  }

  // Step 3: Latitude fallback
  return {
    zone: estimateZoneFromLatitude(lat),
    temperature_range: null,
    source: 'latitude_estimate',
  };
}

/**
 * Reverse geocode lat/lng → US ZIP code via Nominatim (free, no key)
 */
async function reverseGeocodeToZip(lat: number, lng: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'PermacultureStudio/1.0 (permaculture.studio)',
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const postcode = data?.address?.postcode;
  if (!postcode) return null;

  // Handle ZIP+4 format (e.g., "12345-6789") → take first 5
  const zip5 = postcode.split('-')[0].trim();
  return /^\d{5}$/.test(zip5) ? zip5 : null;
}

/**
 * Look up hardiness zone from ZIP code via phzmapi.org (free, no key)
 */
async function lookupZoneFromZip(
  zip: string
): Promise<{ zone: string; temperature_range: string } | null> {
  const url = `https://phzmapi.org/${zip}.json`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (!data?.zone) return null;

  return {
    zone: data.zone,
    temperature_range: data.temperature_range || null,
  };
}

/**
 * Estimate USDA hardiness zone from latitude alone.
 * Rough static estimation for when APIs are unavailable.
 * Only valid for the contiguous US.
 */
export function estimateZoneFromLatitude(lat: number): string {
  // Approximate mapping for contiguous US latitudes
  if (lat >= 48) return '3';
  if (lat >= 46) return '4';
  if (lat >= 44) return '5';
  if (lat >= 42) return '5';
  if (lat >= 40) return '6';
  if (lat >= 38) return '7';
  if (lat >= 36) return '7';
  if (lat >= 34) return '8';
  if (lat >= 32) return '8';
  if (lat >= 30) return '9';
  if (lat >= 28) return '9';
  if (lat >= 26) return '10';
  if (lat >= 24) return '11';
  return '12';
}
