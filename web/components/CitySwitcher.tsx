"use client";

import { useRouter } from "next/navigation";

export function CitySwitcher({ cities, current }: { cities: { slug: string; city_en: string }[]; current: string }) {
  const router = useRouter();
  return (
    <select aria-label="Switch city" value={current} onChange={(e) => router.push(`/cities/${e.target.value}`)}
      style={{ minHeight: 34, padding: "4px 10px", borderRadius: 999, fontSize: 13 }}>
      {[...cities].sort((a, b) => a.city_en.localeCompare(b.city_en)).map((c) => <option key={c.slug} value={c.slug}>{c.city_en}</option>)}
    </select>
  );
}
