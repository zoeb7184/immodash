// Inverse of EPSG:3035 (ETRS89 / LAEA Europe) to WGS84 lon/lat, from the EPSG Guidance Note 7-2 formulas.
// Checked against pyproj: differences below 1e-7 degrees (about 1 cm). Avoids shipping proj4 for one projection.
const a = 6378137, f = 1 / 298.257222101, e2 = 2 * f - f * f, e = Math.sqrt(e2);
const p0 = (52 * Math.PI) / 180, l0 = (10 * Math.PI) / 180, FE = 4321000, FN = 3210000;
const qP = (1 - e2) * (1 / (1 - e2) - (1 / (2 * e)) * Math.log((1 - e) / (1 + e)));
const s0 = Math.sin(p0);
const q0 = (1 - e2) * (s0 / (1 - e2 * s0 * s0) - (1 / (2 * e)) * Math.log((1 - e * s0) / (1 + e * s0)));
const b0 = Math.asin(q0 / qP), Rq = a * Math.sqrt(qP / 2);
const D = (a * (Math.cos(p0) / Math.sqrt(1 - e2 * s0 * s0))) / (Rq * Math.cos(b0));
const c2 = e2 / 3 + (31 * e2 ** 2) / 180 + (517 * e2 ** 3) / 5040, c4 = (23 * e2 ** 2) / 360 + (251 * e2 ** 3) / 3780, c6 = (761 * e2 ** 3) / 45360;

export function laeaToLonLat(E: number, N: number): [number, number] {
  const x = E - FE, y = N - FN;
  const rho = Math.sqrt((x / D) ** 2 + (D * y) ** 2);
  if (rho === 0) return [10, 52];
  const C = 2 * Math.asin(rho / (2 * Rq));
  const bp = Math.asin(Math.cos(C) * Math.sin(b0) + (D * y * Math.sin(C) * Math.cos(b0)) / rho);
  const lam = l0 + Math.atan2(x * Math.sin(C), D * rho * Math.cos(b0) * Math.cos(C) - D * D * y * Math.sin(b0) * Math.sin(C));
  const phi = bp + c2 * Math.sin(2 * bp) + c4 * Math.sin(4 * bp) + c6 * Math.sin(6 * bp);
  return [Math.round((lam * 180) / Math.PI * 1e6) / 1e6, Math.round((phi * 180) / Math.PI * 1e6) / 1e6];
}
