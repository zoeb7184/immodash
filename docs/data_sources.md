# Data sources: acquisition and refresh

All raw files live in `data/raw/<source>/` and are committed. `python -m immodash_ingest` tries to
refresh each one from its canonical URL and falls back to the committed copy if the download fails.
The source registry is in `ingestion/immodash_ingest/config.py`.

| Folder | File | How it is obtained | Refresh cadence upstream |
|---|---|---|---|
| `zensus/` | `4000W-0011_de_flat.csv` | Zensus database (ergebnisse.zensus2022.de), table 4000W-0011, region variable *Landkreise u. krsfr. Städte*, export "CSV (flat)". Automated via the GENESIS REST API when `ZENSUS_API_TOKEN` is set (free registration). | One-off (census) |
| `zensus/` | `4000W-0002_de_flat.csv` | Zensus database, table 4000W-0002 (market-active vacancy), Kreise, CSV (flat). | One-off |
| `zensus/` | `4000W-0009_de_flat.csv` | Table 4000W-0009 (rent by floor area, 20 m² bands), Kreise. | One-off |
| `zensus/` | `4000W-0004_de_flat.csv` | Table 4000W-0004 (average rent), region variable *Bezirke (Hamburg und Berlin)*. | One-off |
| `zensus_grid/` | `Zensus2022_Durchschn_Nettokaltmiete.zip` | destatis.de/static/DE/zensus/gitterdaten/ (100 m, 1 km, 10 km grid CSVs, EPSG:3035). | One-off |
| `vgrdl/` | `vgrdl_r2b3_bs2024.xlsx` | statistikportal.de → VGRdL → Kreisergebnisse → Einkommen. Sheets 2.1, 2.4 and 3 are parsed. | Yearly (new *Berechnungsstand* each summer; update the URL in `config.py`) |
| `greix/` | `City_metrics_public.xlsx` | kielinstitut.de GREIX Mietpreisindex page, "Mietpreisdaten (xlsx)". | Quarterly |
| `greix/` | `City_Metrics_rents_sales-…xlsx` | Same page, "Mietpreis- & Transaktionspreisindex (xlsx)". | Quarterly |
| `bundesbank/` | `BBIM1.M.DE.B.A2C.A.R.A.2250.EUR.N.csv` | Bundesbank SDMX REST API, series BBIM1.M.DE.B.A2C.A.R.A.2250.EUR.N (SUD131Z). | Monthly |
| `geo/` | `kreise_vg5000.geojson` | BKG VG5000 (01.01.2021) converted to GeoJSON by github.com/Praesklepios/geoGermany. | Yearly (BKG) |

## Attribution

- © Statistische Ämter des Bundes und der Länder, Deutschland, 2026. Datenlizenz Deutschland –
  Namensnennung – Version 2.0 (Zensus 2022, VGRdL).
- GREIX – German Real Estate Index, Kiel Institut für Weltwirtschaft (data basis: VALUE Marktdaten).
- Deutsche Bundesbank, MFI-Zinsstatistik.
- © GeoBasis-DE / BKG 2021, dl-de/by-2-0.
- Plotly base-map topojson (`dashboard/assets/topojson/`) from the MIT-licensed `sane-topojson`
  package, vendored so maps render without contacting a CDN.

## Not used, and why

- **ImmobilienScout24 / Immowelt scraping**: their terms of service prohibit automated collection,
  and the portals use bot protection. See ADR 0002.
- **RWI-GEO-RED**: microdata are available only for research through the FDZ Ruhr, under a contract.

## OpenStreetMap postcode areas (`data/raw/osm_postcodes/`)

- Source: German postcode (PLZ) boundaries extracted from OpenStreetMap by https://github.com/yetzt/postleitzahlen,
  release 2026.02 (`postleitzahlen.geojson.br`). Licence: ODbL 1.0, © OpenStreetMap contributors.
- Prepared with `python scripts/prepare_postcodes.py ~/Downloads/postleitzahlen.geojson.br` (needs `pip install brotli`):
  keeps the 1,160 postcodes that lie at least 5% inside a Kreis with a GREIX city, simplified to about 5 m.
- Used at ingestion to give every 100 m Zensus grid cell its postcode (point in polygon on the cell centre);
  dbt aggregates them in `fct_postcode_rent`. Postcode areas change rarely, so this is a manual refresh.
- Because `postcodes.json` on the website is derived from OpenStreetMap data, it is shared under the ODbL.
