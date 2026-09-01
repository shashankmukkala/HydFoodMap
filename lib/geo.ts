// Great-circle distance between two lat/lng points, in meters.
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// How close a reviewer's reported location must be to a cafe's pin to
// count as "actually there". Generous on purpose: many cafe pins were
// geocoded from a neighborhood-level address, not an exact building (see
// scripts/geocode-cafes.mjs), and phone GPS itself has real error — a tight
// radius would reject genuine visits, not just fake ones.
export const VISIT_RADIUS_METERS = 300;
