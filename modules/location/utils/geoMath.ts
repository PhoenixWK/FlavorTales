import type { UserCoordinates } from "@/shared/hooks/useUserLocation";

const EARTH_RADIUS_M = 6_371_000;
const toRad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance between two lat/lng points in metres (Haversine formula). */
export function haversineMetres(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Compass bearing (0–360°) clockwise from North from pointA to pointB.
 * 0° = North, 90° = East, 180° = South, 270° = West.
 */
export function bearingDeg(
  [lat1, lng1]: [number, number],
  [lat2, lng2]: [number, number]
): number {
  const dLng = toRad(lng2 - lng1);
  const lat1R = toRad(lat1);
  const lat2R = toRad(lat2);
  const y = Math.sin(dLng) * Math.cos(lat2R);
  const x =
    Math.cos(lat1R) * Math.sin(lat2R) -
    Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Smallest absolute angular difference between two bearings (result: 0–180°). */
export function angleDiffDeg(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Returns true if movement bearing is within 45° of the user→POI bearing.
 * Returns false when movementBearing is null (insufficient GPS history).
 */
export function headingMatch(
  movementBearing: number | null,
  userToPoiBearing: number
): boolean {
  if (movementBearing === null) return false;
  return angleDiffDeg(movementBearing, userToPoiBearing) < 45;
}

/**
 * Computes approximate movement bearing from a sliding window of GPS points.
 * Uses vector from oldest to newest point. Returns null if fewer than 2 points.
 */
export function computeMovementBearing(
  buffer: Pick<UserCoordinates, "latitude" | "longitude">[]
): number | null {
  if (buffer.length < 2) return null;
  const first = buffer[0];
  const last = buffer[buffer.length - 1];
  return bearingDeg(
    [first.latitude, first.longitude],
    [last.latitude, last.longitude]
  );
}
