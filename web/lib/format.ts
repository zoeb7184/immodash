export const eur = (v: number | null | undefined, d = 2) =>
  v == null ? "–" : `${v.toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d })} €`;
export const num = (v: number | null | undefined, d = 0) =>
  v == null ? "–" : v.toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d });
export const pct = (v: number | null | undefined, d = 1, sign = false) =>
  v == null ? "–" : `${sign && v > 0 ? "+" : ""}${v.toFixed(d)}%`;
export const month = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
