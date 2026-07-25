import * as Location from 'expo-location';

export interface GeoLocation {
  lat: number;
  lon: number;
  tzone: number;
}

// Default fallback: New York City
const DEFAULT_LOCATION: GeoLocation = {
  lat: 40.7128,
  lon: -74.006,
  tzone: -5,
};

/**
 * Estimate timezone offset from longitude (rough but usable when no other source).
 * This gives ~1h accuracy — adequate for astrology calculations.
 */
function estimateTimezone(lon: number): number {
  return Math.round(lon / 15);
}

/**
 * Get the user's current location with permission handling.
 * Returns DEFAULT_LOCATION if permission denied or unavailable.
 */
export async function getUserLocation(): Promise<GeoLocation> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('[Location] Permission denied, using default');
      return DEFAULT_LOCATION;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });

    return {
      lat: parseFloat(location.coords.latitude.toFixed(4)),
      lon: parseFloat(location.coords.longitude.toFixed(4)),
      tzone: estimateTimezone(location.coords.longitude),
    };
  } catch (error) {
    console.log('[Location] Error getting location:', error);
    return DEFAULT_LOCATION;
  }
}

/**
 * Build a GeoLocation from profile data or fall back to defaults.
 */
export function getProfileLocation(
  birthLat: number | null | undefined,
  birthLon: number | null | undefined,
): GeoLocation {
  if (
    birthLat != null && birthLon != null &&
    isFinite(birthLat) && isFinite(birthLon) &&
    birthLat >= -90 && birthLat <= 90 &&
    birthLon >= -180 && birthLon <= 180
  ) {
    return {
      lat: birthLat,
      lon: birthLon,
      tzone: estimateTimezone(birthLon),
    };
  }
  return DEFAULT_LOCATION;
}

export { DEFAULT_LOCATION };
