/**
 * Layer-aware click guard utility
 *
 * Provides a simple function to check if a feature's layers are locked,
 * without requiring direct access to React context.
 */

/**
 * Check if a feature can be clicked based on its layer lock state
 *
 * This function can be called from click handlers to determine if interaction
 * should be allowed. It safely handles missing layer data.
 *
 * @param featureLayerIds - JSON string array of layer IDs from feature.properties.layer_ids
 * @param isLayerLockedFn - Function that checks if a layer ID is locked (from context)
 * @returns true if click is allowed, false if any layer is locked
 */
export function canInteractWithFeature(
  featureLayerIds: string | null | undefined,
  isLayerLockedFn: ((layerId: string) => boolean) | null
): boolean {
  // If no layer checking function provided, allow interaction (backwards compatible)
  if (!isLayerLockedFn) {
    return true;
  }

  // If feature has no layer assignments, allow interaction
  if (!featureLayerIds) {
    return true;
  }

  try {
    const layerIds = JSON.parse(featureLayerIds);

    // If not an array or empty, allow interaction
    if (!Array.isArray(layerIds) || layerIds.length === 0) {
      return true;
    }

    // Check if any of the feature's layers are locked
    // If all layers are locked, prevent interaction
    const allLocked = layerIds.every((layerId: string) => isLayerLockedFn(layerId));
    return !allLocked;
  } catch (e) {
    // If JSON parsing fails, allow interaction as fallback
    return true;
  }
}

/**
 * Extract layer check function from context safely
 *
 * This helper wraps context access in a try-catch to handle cases where
 * the LayerProvider is not available in the component tree.
 *
 * Usage in a component:
 * ```typescript
 * const checkLayerLock = extractLayerChecker();
 * // Later in click handler:
 * if (!canInteractWithFeature(feature.properties.layer_ids, checkLayerLock)) {
 *   return; // Feature is locked
 * }
 * ```
 *
 * @returns Function to check if layer is locked, or null if context unavailable
 */
export function extractLayerChecker(): ((layerId: string) => boolean) | null {
  try {
    // Dynamic import to avoid circular dependencies
    const { useLayerContext } = require('@/contexts/layer-context');
    const context = useLayerContext();
    return context.isLayerLocked;
  } catch (e) {
    // LayerProvider not in tree, that's okay
    return null;
  }
}
