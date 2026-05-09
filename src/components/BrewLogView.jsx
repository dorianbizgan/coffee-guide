import { useEffect, useMemo, useState } from "react";
import { Icon, MethodIcon } from "./Icons.jsx";
import { BREW_METHODS } from "../lib/data.js";

export function BrewLogView({ logs, onOpenBean }) {
  const [filterMethod, setFilterMethod] = useState("all");

  const filtered = useMemo(() => {
    if (filterMethod === "all") return logs;
    return logs.filter((l) => l.method === filterMethod);
  }, [logs, filterMethod]);

  return (
    <div className="shell">
      <section className="hero">
        <div>
          <div className="eyebrow">Brew log</div>
          <h1>Every cup, <em>annotated</em>.</h1>
          <p className="hero-sub">
            {logs.length === 0
              ? "Log a tasting note from any coffee detail page to start your brew log."
              : `${logs.length} note${logs.length === 1 ? "" : "s"} saved across your shelf.`}
          </p>
        </div>
      </section>

      <section className="filter-row">
        <div className="chips">
          <button className={`chip ${filterMethod === "all" ? "active" : ""}`} onClick={() => setFilterMethod("all")}>All methods</button>
          {BREW_METHODS.map((m) => (
            <button key={m.id} className={`chip ${filterMethod === m.id ? "active" : ""}`} onClick={() => setFilterMethod(m.id)}>
              {m.short}
            </button>
          ))}
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
        {filtered.map((l, i) => (
          <article key={i} className="panel" style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
            <div style={{
              width: 46, height: 46, borderRadius: 10, background: "var(--paper-3)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-soft)", flexShrink: 0,
            }}>
              <MethodIcon id={l.method} size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                  <button
                    onClick={() => onOpenBean && onOpenBean(l.beanId)}
                    style={{
                      border: 0, background: "transparent", padding: 0,
                      font: "inherit", color: "var(--ink)", cursor: "pointer",
                      fontFamily: "var(--font-display)", fontSize: 22, lineHeight: 1.1,
                      textAlign: "left", overflowWrap: "anywhere",
                    }}
                  >
                    {l.beanName}
                  </button>
                  <div className="card-roaster" style={{ marginTop: 2 }}>{l.beanRoaster}</div>
                </div>
                <div className="brewnote-stamp" style={{ flexShrink: 0 }}>{l.temp}°C · {l.clicks} clicks</div>
              </div>
              {l.text && <p style={{ marginTop: 10, marginBottom: 0, color: "var(--ink-soft)" }}>{l.text}</p>}
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(l.tags || []).map((t) => <span key={t} className="chip on" style={{ pointerEvents: "none" }}>{t}</span>)}
                {(l.tasted || []).map((t) => <span key={`t-${t}`} className="chip flavor on" style={{ pointerEvents: "none" }}>{t}</span>)}
              </div>
              <div className="eyebrow" style={{ marginTop: 10, fontSize: 10 }}>
                {new Date(l.savedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </div>
            </div>
          </article>
        ))}
        {filtered.length === 0 && logs.length > 0 && (
          <div style={{ padding: 32, textAlign: "center", color: "var(--ink-mute)" }}>
            No {BREW_METHODS.find((m) => m.id === filterMethod)?.short} notes yet.
          </div>
        )}
      </section>
    </div>
  );
}
