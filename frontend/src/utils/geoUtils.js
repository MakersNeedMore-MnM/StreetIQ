/**
 * Pure geospatial utility functions for StreetIQ navigation and hazard alerting.
 * All coordinates are represented as [latitude, longitude].
 */

const EARTH_RADIUS_METERS = 6371000;
const EPSILON = 1e-7;

/**
 * Validates whether an input is a valid [latitude, longitude] pair.
 * Latitude must be within [-90, 90] and longitude within [-180, 180].
 *
 * @param {*} coord
 * @returns {boolean}
 */
function isValidCoordinate(coord) {
  if (!Array.isArray(coord) || coord.length < 2) return false;
  const [lat, lon] = coord;
  if (typeof lat !== 'number' || typeof lon !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lon < -180 || lon > 180) return false;
  return true;
}

/**
 * Calculates the great-circle distance between two coordinates using the Haversine formula.
 *
 * @param {[number, number]} coordA - [latitude, longitude] of origin
 * @param {[number, number]} coordB - [latitude, longitude] of destination
 * @returns {number | null} Distance in meters, or null if coordinates are invalid
 */
export function calculateDistance(coordA, coordB) {
  if (!isValidCoordinate(coordA) || !isValidCoordinate(coordB)) {
    return null;
  }

  const [lat1, lon1] = coordA;
  const [lat2, lon2] = coordB;

  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const sinDeltaPhi2 = Math.sin(deltaPhi / 2);
  const sinDeltaLambda2 = Math.sin(deltaLambda / 2);

  const a =
    sinDeltaPhi2 * sinDeltaPhi2 +
    Math.cos(phi1) * Math.cos(phi2) * sinDeltaLambda2 * sinDeltaLambda2;

  // Protect against numerical inaccuracies exceeding the valid domain of sqrt / asin
  const clampedA = Math.min(Math.max(a, 0), 1);
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculates the initial compass bearing from coordA to coordB in degrees.
 * Returns a normalized value in [0, 360).
 *
 * @param {[number, number]} coordA - [latitude, longitude] of starting point
 * @param {[number, number]} coordB - [latitude, longitude] of target point
 * @returns {number | null} Bearing in degrees [0, 360), or null if invalid / identical points
 */
export function calculateBearing(coordA, coordB) {
  if (!isValidCoordinate(coordA) || !isValidCoordinate(coordB)) {
    return null;
  }

  const [lat1, lon1] = coordA;
  const [lat2, lon2] = coordB;

  // Return null for identical or practically identical coordinates
  if (Math.abs(lat1 - lat2) < EPSILON && Math.abs(lon1 - lon2) < EPSILON) {
    return null;
  }

  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  // If both x and y are virtually 0, bearing is indeterminate
  if (Math.abs(x) < EPSILON && Math.abs(y) < EPSILON) {
    return null;
  }

  const initialBearingRadians = Math.atan2(y, x);
  const initialBearingDegrees = (initialBearingRadians * 180) / Math.PI;

  // Normalize to [0, 360)
  return ((initialBearingDegrees % 360) + 360) % 360;
}

/**
 * Determines whether targetBearing lies within the forward viewing cone of currentHeading.
 * Correctly accounts for circular modular wrap-around at the 0 / 360 degree boundary.
 *
 * @param {number} currentHeading - Current vehicle heading in degrees [0, 360)
 * @param {number} targetBearing - Compass bearing toward hazard in degrees [0, 360)
 * @param {number} [maxAngleDiff=45] - Maximum angular tolerance in degrees (default 45)
 * @returns {boolean} True if the hazard is within the forward cone, otherwise false
 */
export function isAhead(currentHeading, targetBearing, maxAngleDiff = 45) {
  if (
    typeof currentHeading !== 'number' ||
    typeof targetBearing !== 'number' ||
    typeof maxAngleDiff !== 'number' ||
    !Number.isFinite(currentHeading) ||
    !Number.isFinite(targetBearing) ||
    !Number.isFinite(maxAngleDiff)
  ) {
    return false;
  }

  if (maxAngleDiff < 0) {
    return false;
  }

  // Normalize inputs to [0, 360)
  const normHeading = ((currentHeading % 360) + 360) % 360;
  const normBearing = ((targetBearing % 360) + 360) % 360;

  // Compute smallest circular difference
  const diff = Math.abs(normHeading - normBearing);
  const angularDifference = Math.min(diff, 360 - diff);

  return angularDifference <= maxAngleDiff;
}
