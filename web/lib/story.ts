// Build-time helpers that shape the snapshot into what the story components need.
import type { RCCity } from "@/components/RentCheck";
import type { TableRow } from "@/components/CityTable";
import { data } from "./data";
import { median } from "./format";

export function forecastBy(h = 12) {
  return Object.fromEntries(data.forecasts().filter((f) => f.horizon_months === h).map((f) => [f.city, f]));
}

export function rentCheckCities(): RCCity[] {
  const f12 = forecastBy(12);
  return data.cities().map((c) => ({
    city: c.city, city_en: c.city_en, slug: c.slug, median: c.median_rent_sqm, p25: c.p25_rent_sqm, p75: c.p75_rent_sqm,
    income: c.disposable_income_per_resident_eur, f12: f12[c.city]?.p50_rent_sqm ?? null,
    f12lo: f12[c.city]?.p10_rent_sqm ?? null, f12hi: f12[c.city]?.p90_rent_sqm ?? null,
  }));
}

export function tableRows(): TableRow[] {
  const f12 = forecastBy(12);
  const sd = Object.fromEntries(data.citySupplyDemand().map((s) => [s.city, s]));
  return data.cities().map((c) => ({
    city: c.city, city_en: c.city_en, slug: c.slug, land: c.land_name, median: c.median_rent_sqm, yoy: c.index_yoy_pct,
    y5: c.index_5y_pct, burden: c.asking_rent_burden_pct, dom: c.time_on_market_days_4q, balance: sd[c.city]?.market_balance ?? null,
    f12: f12[c.city]?.change_p50_pct ?? null,
  }));
}

export function premiumRows() {
  return data.cities().filter((c) => c.existing_contract_rent_sqm_2022 != null).map((c) => ({
    city: c.city, city_en: c.city_en, slug: c.slug, population: c.population,
    existing: c.existing_contract_rent_sqm_2022 as number, asking: c.median_rent_sqm,
    premium: c.asking_premium_vs_existing_pct ?? (100 * c.median_rent_sqm) / (c.existing_contract_rent_sqm_2022 as number) - 100,
  }));
}

export function outlookRows() {
  const f12 = forecastBy(12);
  return data.cities().filter((c) => f12[c.city]).map((c) => ({
    city: c.city, city_en: c.city_en, slug: c.slug, population: c.population, now: f12[c.city].median_rent_now,
    p10: f12[c.city].p10_rent_sqm, p50: f12[c.city].p50_rent_sqm, p90: f12[c.city].p90_rent_sqm,
  }));
}

/** The 2022 rate jump, read from the Bundesbank series: first month above 2% after a sub-1.6% start of year. */
export function rateJump() {
  const r = data.rates();
  const at = (iso: string) => r.find((x) => x.period_date === iso)?.rate_pct ?? null;
  const a = at("2022-01-01"), b = at("2023-01-01");
  if (a == null || b == null) return null;
  return { from: "2022-01-01", to: "2023-01-01", before: a, after: b };
}

export function headline() {
  const cs = data.cities();
  const y5 = cs.map((c) => c.index_5y_pct).filter((v): v is number => v != null);
  const yoy = cs.map((c) => c.index_yoy_pct).filter((v): v is number => v != null);
  const prem = cs.map((c) => c.asking_premium_vs_existing_pct).filter((v): v is number => v != null);
  return {
    n: cs.length,
    medianRent: median(cs.map((c) => c.median_rent_sqm)),
    median5y: median(y5),
    up5y: y5.filter((v) => v > 0).length,
    upYoy: yoy.filter((v) => v > 0).length,
    medianYoy: median(yoy),
    medianPremium: median(prem),
    dearest: [...cs].sort((a, b) => b.median_rent_sqm - a.median_rent_sqm)[0],
    cheapest: [...cs].sort((a, b) => a.median_rent_sqm - b.median_rent_sqm)[0],
    fastest5y: [...cs].sort((a, b) => (b.index_5y_pct ?? -99) - (a.index_5y_pct ?? -99))[0],
  };
}
