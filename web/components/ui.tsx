// Server-safe building blocks for the layout.
import type { ReactNode } from "react";

export function Figure({ title, sub, children, source, howto, numbers, controls, id }: {
  title: ReactNode; sub?: ReactNode; children: ReactNode; source?: ReactNode; howto?: ReactNode; numbers?: ReactNode;
  controls?: ReactNode; id?: string;
}) {
  return (
    <figure className="figure reveal" id={id}>
      <div className="figure-head">
        <div>
          <p className="figure-title">{title}</p>
          {sub && <p className="figure-sub">{sub}</p>}
        </div>
        {controls}
      </div>
      <div className="figure-body">{children}</div>
      {source && <figcaption className="figure-foot">Source: {source}</figcaption>}
      {howto && (
        <details className="howto">
          <summary>How to read this chart</summary>
          <div className="body">{howto}</div>
        </details>
      )}
      {numbers && (
        <details className="numbers">
          <summary>Show the numbers</summary>
          <div className="tablewrap" style={{ maxHeight: 420, overflowY: "auto", marginTop: 8 }}>{numbers}</div>
        </details>
      )}
    </figure>
  );
}

export function Takeaway({ children, label = "What this means" }: { children: ReactNode; label?: string }) {
  return (
    <aside className="takeaway reveal">
      <div className="t-label">{label}</div>
      <p>{children}</p>
    </aside>
  );
}

/** Section head: headline, then a short lead. Stacked on small screens; on wide screens the lead sits beside the
 *  headline so the line is used instead of leaving the right half of the page empty. */
export function Head({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className={`head reveal${children ? " has-lead" : ""}`}>
      <h2>{title}</h2>
      {children && <div className="lead">{children}</div>}
    </div>
  );
}

/** A key figure set as a sentence row: the number at reading scale, then a bold lead-in and the explanation. */
export function Stat({ label, value, unit, say }: { label: string; value: ReactNode; unit?: string; say?: ReactNode }) {
  return (
    <li className="stat">
      <span className="value">{value}{unit && <span className="unit">{unit}</span>}</span>
      <span className="txt"><b>{label}.</b>{say && <> {say}</>}</span>
    </li>
  );
}

/** Inner-page hero: title and lead on the left, the page's key facts on the right (stacked below on small screens). */
export function PageHero({ title, lead, facts, label = "Key figures" }: { title: ReactNode; lead: ReactNode; facts?: ReactNode; label?: string }) {
  return (
    <header className="hero page-hero">
      <div className={`wrap${facts ? " page-hero-grid" : ""}`}>
        <div>
          <h1 className="enter">{title}</h1>
          <p className="lead enter">{lead}</p>
        </div>
        {facts && <aside className="hero-facts enter" aria-label={label}><ul className="stats one">{facts}</ul></aside>}
      </div>
    </header>
  );
}
