"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { GLOSSARY, type GlossaryEntry, type GlossaryKey } from "@/lib/glossary";
import { REF_INDEX, refById } from "@/lib/references";

/** A dotted-underlined word that explains itself on hover, focus or tap. */
export function Term({ k, children }: { k: GlossaryKey; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
  const g: GlossaryEntry = GLOSSARY[k];

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <span className="term" ref={ref} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-describedby={open ? id : undefined} aria-expanded={open}
        onClick={() => setOpen(true)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
        {children ?? g.term.toLowerCase()}
      </button>
      {open && (
        <span className="term-pop" role="tooltip" id={id}>
          <b>{g.term}</b>
          {g.def}
          {g.src && <a className="term-src" href={`/methodology#ref-${g.src}`}>Source [{REF_INDEX[g.src]}]: {refById(g.src).authors}, {refById(g.src).year}</a>}
        </span>
      )}
    </span>
  );
}
