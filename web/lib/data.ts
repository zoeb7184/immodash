// Build-time data access. The site is statically exported: every page is rendered from the JSON
// snapshot in public/data (written by scripts/export_static.py from the FastAPI contracts).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  Anomaly, Backtest, Bezirk, CitySnapshot, Forecast, KreisAffordability, KreisAskingRent, KreisGeo,
  KreisSupplyDemand, MortgageRate, PressurePoint, RentPoint, Source, Summary,
} from "./types";

const DIR = join(process.cwd(), "public", "data");
const cache = new Map<string, unknown>();

const fold = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss");

/** English names in the source drop umlauts ("Dusseldorf"); show the German spelling when that is all that differs. */
function displayNames<T>(rows: T): T {
  if (!Array.isArray(rows)) return rows;
  for (const r of rows as { city?: string; city_en?: string }[]) {
    if (r && typeof r.city === "string" && typeof r.city_en === "string" && r.city !== r.city_en && fold(r.city) === r.city_en) r.city_en = r.city;
  }
  return rows;
}

function read<T>(name: string): T {
  if (!cache.has(name)) cache.set(name, displayNames(JSON.parse(readFileSync(join(DIR, name), "utf-8"))));
  return cache.get(name) as T;
}

export type CityWithSlug = CitySnapshot & { slug: string };
export type CitySD = {
  city: string; city_en: string; ags: string; market_active_vacancy_pct: number | null; population_growth_5y_pct: number | null;
  supply_demand_index: number | null; market_balance: string | null; time_on_market_days_4q: number | null;
  demand_pressure_score: number | null;
};
export type Meta = { generated_at: string; latest_month: string; files: number; bytes: number; summaries_by_llm: number };

export const data = {
  meta: () => read<Meta>("meta.json"),
  cities: () => read<CityWithSlug[]>("cities.json"),
  monthly: () => read<RentPoint[]>("monthly.json"),
  forecasts: () => read<Forecast[]>("forecasts.json"),
  backtest: () => read<Backtest[]>("backtest.json"),
  anomalies: () => read<Anomaly[]>("anomalies.json"),
  pressure: () => read<PressurePoint[]>("market-pressure.json"),
  rates: () => read<MortgageRate[]>("mortgage-rates.json"),
  affordability: () => read<KreisAffordability[]>("kreise-affordability.json"),
  supplyDemand: () => read<KreisSupplyDemand[]>("kreise-supply-demand.json"),
  citySupplyDemand: () => read<CitySD[]>("cities-supply-demand.json"),
  askingRents: () => read<KreisAskingRent[]>("kreise-asking-rents.json"),
  bezirke: () => read<Bezirk[]>("bezirke.json"),
  sources: () => read<Source[]>("sources.json"),
  geo: () => read<KreisGeo>("geo-kreise.json"),
  summary: (slug: string) => read<Summary>(`summaries/${slug}.json`),
};
