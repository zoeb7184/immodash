import { REF_INDEX, refById } from "@/lib/references";

/** Numbered citation: [n] links to the full reference on the methodology page. */
export function Cite({ id }: { id: string | string[] }) {
  const ids = Array.isArray(id) ? id : [id];
  return (
    <sup className="cite">
      {ids.map((k) => {
        const r = refById(k);
        if (!r) throw new Error(`Unknown reference ${k}`);
        return (
          <a key={k} href={`/methodology#ref-${k}`} title={`${r.authors} (${r.year}). ${r.title}`} aria-label={`Reference ${REF_INDEX[k]}: ${r.authors}, ${r.year}`}>
            [{REF_INDEX[k]}]
          </a>
        );
      })}
    </sup>
  );
}
