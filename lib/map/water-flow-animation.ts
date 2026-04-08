import maplibregl from 'maplibre-gl';

/**
 * Animate arrow symbols along flow paths to visualize water movement direction
 *
 * Throttled to ~30fps (every other frame) since the 1px-per-frame offset
 * is visually identical at 30fps vs 60fps, but uses half the GPU cycles.
 * Automatically stops when the target layer is removed from the map.
 *
 * @param map - MapLibre map instance
 * @param layerId - ID of the symbol layer containing arrows
 */
export function animateFlowArrows(map: maplibregl.Map, layerId: string) {
  let offset = 0;
  let animationFrame: number;
  let cancelled = false;
  let frameCount = 0;

  function animate() {
    if (cancelled) return;

    // Stop if the layer was removed — no point burning frames
    if (!map.getLayer(layerId)) {
      return;
    }

    frameCount++;

    // Throttle to ~30fps: only update on every other frame
    if (frameCount % 2 === 0) {
      offset = (offset + 1) % 200;
      map.setLayoutProperty(layerId, 'icon-offset', [0, -offset]);
    }

    animationFrame = requestAnimationFrame(animate);
  }

  animate();

  return () => {
    cancelled = true;
    cancelAnimationFrame(animationFrame);
  };
}
