// Server-safe building blocks for the editorial layout.
import type { ReactNode } from "react";

export function Figure({ title, sub, children, source, howto, numbers, controls, id }: {
  title: ReactNode; sub?: ReactNode; children: ReactNode; source?: ReactNode; howto?: ReactNode; numbers?: ReactNode;
  controls?: ReactNode; id?: string;
}) {
  return (
    <figure className="figure reveal" id={id} style={{ marginInline: 0 }}>
      <div className="figure-head">
        <div>
          <p className="figure-title">{title}</p>
          {sub && <p className="figure-sub">{sub}</p>}
        </div>
        {controls}
      </div>
      <div className="figure-body">{children}</div>
      {source && <figcaption className="figure-foot"><span>Source: {source}</span></figcaption>}
      {howto && (
        <details className="howto">
          <summary>How to read this chart</summary>
          <div className="body">{howto}</div>
        </details>
      )}
      {numbers && (
        <details className="numbers">
          <summary>Show the numbers</summary>
          <div className="tablewrap" style={{ maxHeight: 420, overflowY: "auto", marginTop: 6 }}>{numbers}</div>
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

export function Chapter({ n, title, children, intro, id }: { n?: string; title: ReactNode; intro?: ReactNode; children?: ReactNode; id?: string }) {
  return (
    <section className="chapter" id={id}>
      <div className="wrap">
        <div className="read reveal">
          {n && <div className="chapter-num">{n}</div>}
          <h2>{title}</h2>
          {intro && <div className="prose">{intro}</div>}
        </div>
        {children}
      </div>
    </section>
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
