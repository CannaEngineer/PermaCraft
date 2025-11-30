/**
 * Generate a GeoJSON polygon representing a circle
 * @param center [lng, lat] coordinates
 * @param radiusInMeters radius in meters
 * @param points number of points to use (more = smoother circle)
 */
export function createCirclePolygon(
  center: [number, number],
  radiusInMeters: number,
  points: number = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: number[][] = [];
  const distanceX = radiusInMeters / (111320 * Math.cos((center[1] * Math.PI) / 180));
  const distanceY = radiusInMeters / 110574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([center[0] + x, center[1] + y]);
  }

  // Close the polygon
  coords.push(coords[0]);

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
  };
}
