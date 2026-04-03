/**
 * useGeolocation — High-accuracy GPS hook for field mapping
 *
 * Provides real-time device GPS coordinates with accuracy tracking.
 * Supports both one-shot capture and continuous tracking modes.
 *
 * Mobile-first design for in-field use cases:
 * - Drop a pin where you're standing
 * - Track your position as you walk a boundary
 * - Mark soil test locations, plantings, infrastructure
 *
 * Uses the Web Geolocation API with high-accuracy mode enabled.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface GeolocationPosition {
  /** Latitude in decimal degrees */
  lat: number;
  /** Longitude in decimal degrees */
  lng: number;
  /** Accuracy radius in meters */
  accuracy: number;
  /** Altitude in meters (if available) */
  altitude: number | null;
  /** Altitude accuracy in meters (if available) */
  altitudeAccuracy: number | null;
  /** Device heading in degrees (0-360, if available) */
  heading: number | null;
  /** Device speed in m/s (if available) */
  speed: number | null;
  /** Timestamp of the reading */
  timestamp: number;
}

export type GeolocationErrorCode =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'NOT_SUPPORTED';

export interface GeolocationError {
  code: GeolocationErrorCode;
  message: string;
}

export interface UseGeolocationOptions {
  /** Enable high accuracy mode (GPS vs cell/wifi). Default: true */
  enableHighAccuracy?: boolean;
  /** Maximum age of cached position in ms. Default: 0 (always fresh) */
  maximumAge?: number;
  /** Timeout for position request in ms. Default: 15000 */
  timeout?: number;
  /** Start tracking immediately on mount. Default: false */
  watchOnMount?: boolean;
}

export interface UseGeolocationReturn {
  /** Current position (null until first fix) */
  position: GeolocationPosition | null;
  /** Current error state */
  error: GeolocationError | null;
  /** Whether a position request is in progress */
  loading: boolean;
  /** Whether continuous tracking is active */
  tracking: boolean;
  /** Whether the browser supports geolocation */
  supported: boolean;
  /** Get a single position fix */
  getCurrentPosition: () => Promise<GeolocationPosition>;
  /** Start continuous position tracking */
  startTracking: () => void;
  /** Stop continuous position tracking */
  stopTracking: () => void;
  /** Clear current position and error */
  reset: () => void;
}

function mapGeolocationError(error: GeolocationPositionError): GeolocationError {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        code: 'PERMISSION_DENIED',
        message: 'Location access denied. Please enable location permissions in your browser settings.',
      };
    case error.POSITION_UNAVAILABLE:
      return {
        code: 'POSITION_UNAVAILABLE',
        message: 'Unable to determine your location. Make sure GPS is enabled.',
      };
    case error.TIMEOUT:
      return {
        code: 'TIMEOUT',
        message: 'Location request timed out. Try moving to an area with better GPS signal.',
      };
    default:
      return {
        code: 'POSITION_UNAVAILABLE',
        message: error.message || 'Unknown geolocation error.',
      };
  }
}

function toGeolocationPosition(pos: globalThis.GeolocationPosition): GeolocationPosition {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    altitude: pos.coords.altitude,
    altitudeAccuracy: pos.coords.altitudeAccuracy,
    heading: pos.coords.heading,
    speed: pos.coords.speed,
    timestamp: pos.timestamp,
  };
}

export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const {
    enableHighAccuracy = true,
    maximumAge = 0,
    timeout = 15000,
    watchOnMount = false,
  } = options;

  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [loading, setLoading] = useState(false);
  const [tracking, setTracking] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const supported = typeof window !== 'undefined' && 'geolocation' in navigator;

  const positionOptions: PositionOptions = {
    enableHighAccuracy,
    maximumAge,
    timeout,
  };

  const getCurrentPosition = useCallback((): Promise<GeolocationPosition> => {
    if (!supported) {
      const err: GeolocationError = {
        code: 'NOT_SUPPORTED',
        message: 'Geolocation is not supported by this browser.',
      };
      setError(err);
      return Promise.reject(err);
    }

    setLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const geoPos = toGeolocationPosition(pos);
          setPosition(geoPos);
          setError(null);
          setLoading(false);
          resolve(geoPos);
        },
        (err) => {
          const geoErr = mapGeolocationError(err);
          setError(geoErr);
          setLoading(false);
          reject(geoErr);
        },
        positionOptions,
      );
    });
  }, [supported, enableHighAccuracy, maximumAge, timeout]);

  const startTracking = useCallback(() => {
    if (!supported || watchIdRef.current !== null) return;

    setError(null);
    setTracking(true);
    setLoading(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const geoPos = toGeolocationPosition(pos);
        setPosition(geoPos);
        setError(null);
        setLoading(false);
      },
      (err) => {
        const geoErr = mapGeolocationError(err);
        setError(geoErr);
        setLoading(false);
      },
      positionOptions,
    );
  }, [supported, enableHighAccuracy, maximumAge, timeout]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    setLoading(false);
  }, []);

  const reset = useCallback(() => {
    stopTracking();
    setPosition(null);
    setError(null);
    setLoading(false);
  }, [stopTracking]);

  // Auto-start tracking if requested
  useEffect(() => {
    if (watchOnMount && supported) {
      startTracking();
    }
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [watchOnMount, supported, startTracking]);

  return {
    position,
    error,
    loading,
    tracking,
    supported,
    getCurrentPosition,
    startTracking,
    stopTracking,
    reset,
  };
}
