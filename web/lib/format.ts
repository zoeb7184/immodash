export const eur = (v: number | null | undefined, d = 2) =>
  v == null ? "n/a" : `${v.toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d })} €`;
export const num = (v: number | null | undefined, d = 0) =>
  v == null ? "n/a" : v.toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d });
export const pct = (v: number | null | undefined, d = 1, sign = false) =>
  v == null ? "n/a" : `${sign && v > 0 ? "+" : ""}${v.toFixed(d)}%`;
export const month = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
export const monthLong = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
export const sqm = (v: number | null | undefined, d = 2) => (v == null ? "n/a" : `${num(v, d)} €/m²`);

/** "1 in 3", "2 in 5" … for shares, so readers don't have to parse decimals. */
export function inN(share: number): string {
  for (const [a, b] of [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 6], [1, 8], [1, 10]]) {
    if (Math.abs(share - a / b) < 0.025) return `${a} in ${b}`;
  }
  return `${Math.round(share * 100)}%`;
}

export const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
