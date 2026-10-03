import type { Geometry } from "geojson";

export type CitySnapshot = {
  city: string; city_en: string; ags: string; mapping_type: string; land_name: string | null;
  latest_month: string; median_rent_sqm: number; p25_rent_sqm: number | null; p75_rent_sqm: number | null;
  index_yoy_pct: number | null; index_5y_pct: number | null; existing_contract_rent_sqm_2022: number | null;
  asking_premium_vs_existing_pct: number | null; income_year: number | null;
  disposable_income_per_resident_eur: number | null; population: number | null;
  reference_monthly_rent_eur: number | null; asking_rent_burden_pct: number | null;
  time_on_market_days_4q: number | null; share_closed_within_week_4q: number | null;
  demand_pressure_score: number | null; pressure_quarter: string | null; sales_to_rent_index_ratio: number | null;
};
export type RentPoint = {
  city: string; city_en: string; period_date: string; median_rent_sqm: number | null; avg_rent_sqm: number | null;
  p25_rent_sqm: number | null; p75_rent_sqm: number | null; nominal_rent_index: number | null;
  real_rent_index: number | null; median_mom_pct: number | null; index_yoy_pct: number | null;
};
export type PressurePoint = {
  city: string; city_en: string; period_date: string; median_rent_sqm: number | null;
  time_on_market_days_4q: number | null; share_closed_within_week_4q: number | null; demand_pressure_score: number | null;
};
export type Forecast = {
  city: string; city_en: string; origin_month: string; horizon_months: number; target_month: string;
  median_rent_now: number; p10_rent_sqm: number; p50_rent_sqm: number; p90_rent_sqm: number; change_p50_pct: number;
  model_version: string;
};
export type Backtest = {
  horizon_months: number; model: string; mape_pct: number; mae_eur_sqm: number; coverage_80_pct: number | null;
  n_forecasts: number; n_origins: number;
};
export type Anomaly = {
  city: string; city_en: string; period_date: string; median_rent_sqm: number; mom_pct: number; market_mom_pct: number;
  excess_pct: number; robust_z: number; is_anomaly: boolean; direction: "spike" | "drop"; severity: string;
};
export type Summary = {
  city: string; text: string; generated_by: string; grounding_rejected_numbers: string[]; generated_at: string;
  facts: Record<string, unknown>;
};
export type KreisAffordability = {
  ags: string; kreis_name: string; land_name: string | null; is_urban_district: boolean; rent_eur_sqm: number;
  income_year: number; disposable_income_per_resident_eur: number; population: number | null;
  reference_monthly_rent_eur: number; rent_burden_pct: number; affordability_index: number;
  income_cagr_5y_pct: number | null; affordability_rank: number;
};
export type KreisSupplyDemand = {
  ags: string; kreis_name: string; land_name: string | null; is_urban_district: boolean;
  market_active_vacancy_pct: number; population: number | null; population_growth_5y_pct: number;
  income_growth_5y_pct: number | null; supply_demand_index: number; market_balance: "tight" | "balanced" | "slack";
  rent_eur_sqm: number | null;
};
export type KreisAskingRent = {
  ags: string; kreis_name: string; rooms: string; rent_eur_sqm: number; national_mean_rent_eur_sqm: number;
  estimated_asking_rent_eur_sqm: number; asking_premium: number; estimate_method: string;
};
export type FinderResult = {
  ags: string; kreis_name: string; land_name: string | null; rent_eur_sqm: number;
  estimated_asking_rent_eur_sqm: number; estimate_method: string; estimated_monthly_rent_eur: number;
  headroom_eur: number; affordability_index: number; population: number | null;
};
export type MortgageRate = {
  period_date: string; rate_pct: number; change_12m_pp: number | null; monthly_payment_reference_loan_eur: number;
};
export type Grid = {
  ags: string; resolution_m: number; x: number[]; y: number[]; rent_eur_sqm: number[]; low_reliability: boolean[];
  outline_3035: { type: string; coordinates: number[][][] | number[][][][] } | null;
};
export type Bezirk = {
  city: string; bezirk_code: string; bezirk_name: string; rent_eur_sqm: number; city_rent_eur_sqm: number;
  vs_city_pct: number; rank_in_city: number;
};
export type Source = { key: string; publisher: string; licence: string; url: string | null };
export type KreisGeo = {
  type: "FeatureCollection";
  features: { type: "Feature"; id: string; properties: { ags: string; name: string }; geometry: Geometry }[];
};
