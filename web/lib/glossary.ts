// Plain-language definitions shown when a reader hovers or taps a dotted term.
export const GLOSSARY = {
  "asking-rent": {
    term: "Asking rent",
    def: "The cold rent landlords ask for in new listings, per square metre. It is what you would pay if you signed a lease today, not what existing tenants pay.",
  },
  "cold-rent": {
    term: "Cold rent (Kaltmiete)",
    def: "Rent without heating, water and other running costs (Nebenkosten). Those usually add roughly 2 to 3 € per m² on top.",
    src: "dmb2025",
  },
  "contract-rent": {
    term: "Existing contract rent",
    def: "The average rent people actually paid on their current leases in May 2022, counted in the national census (Zensus 2022). Older leases are often much cheaper than new ones.",
    src: "bbsr-rents",
  },
  kreis: {
    term: "Kreis",
    def: "A German district. There are 400: 294 rural districts (Landkreise) and 106 cities that form their own district (kreisfreie Städte), such as Berlin, Munich or Bielefeld.",
  },
  vacancy: {
    term: "Market-active vacancy",
    def: "The share of flats in apartment buildings that stood empty and could be rented, from the 2022 census. Housing research usually puts the vacancy a market needs for normal moving at 2 to 3%.",
    src: "saxony2022",
  },
  "rent-burden": {
    term: "Rent burden",
    def: "Cold rent for a 60 m² flat as a share of the disposable (after-tax) income of two average residents of that city. Lower is more affordable.",
  },
  affordability: {
    term: "Affordability index",
    def: "100 means the typical German Kreis. 150 means rent takes a third less of local income than typical; 50 means it takes twice as much.",
  },
  "days-on-market": {
    term: "Days on market",
    def: "How long a rental listing stays online before it disappears, averaged over the last four quarters. Fewer days means more competition for each flat.",
  },
  "supply-demand": {
    term: "Supply-demand index",
    def: "Compares population growth (demand) with empty flats (supply). Above +1 the market is tight: people are moving in and almost nothing is free. Below −1 it is slack.",
    src: "bgb556d",
  },
  forecast: {
    term: "Forecast range",
    def: "The model gives a most likely value and an 80% range: in back-tests, 8 out of 10 real outcomes fell inside a range like this one.",
  },
  premium: {
    term: "New-lease premium",
    def: "How much more per m² a new tenant is asked today than the average existing tenant paid in 2022.",
  },
  anomaly: {
    term: "Unusual month",
    def: "A month where the city's rent moved far more than the other cities did that month, judged against its own previous two years. A prompt to look closer, not proof of a price change.",
    src: "iglewicz1993",
  },
  greix: {
    term: "GREIX",
    def: "The German Real Estate Index from the Kiel Institute for the World Economy. It tracks asking rents from listings in 37 large cities, adjusted for flat size and quality.",
    src: "greix-rent",
  },
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;
export type GlossaryEntry = { term: string; def: string; src?: string };
