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

/** Stacked section head: headline, then a short lead. Never side by side. */
export function Head({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="head reveal">
      <h2>{title}</h2>
      {children && <div className="lead">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, unit, say }: { label: string; value: ReactNode; unit?: string; say?: ReactNode }) {
  return (
    <div className="stat">
      <span className="label">{label}</span>
      <span className="value">{value}{unit && <span className="unit">{unit}</span>}</span>
      {say && <span className="say">{say}</span>}
    </div>
  );
}
