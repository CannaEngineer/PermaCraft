import maplibregl from 'maplibre-gl';

/**
 * Animate arrow symbols along flow paths to visualize water movement direction
 *
 * This creates a continuous animation where arrows appear to "flow" along the path
 * by incrementally offsetting their position.
 *
 * @param map - MapLibre map instance
 * @param layerId - ID of the symbol layer containing arrows
 */
export function animateFlowArrows(map: maplibregl.Map, layerId: string) {
  let offset = 0;
  let animationFrame: number;

  function animate() {
    // Increment offset (cycles every 200px to create seamless loop)
    offset = (offset + 1) % 200;

    // Update icon offset if layer exists
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'icon-offset', [0, -offset]);
    }

    // Continue animation loop
    animationFrame = requestAnimationFrame(animate);
  }

  // Start animation
  animate();

  // Return cleanup function
  return () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  };
}
