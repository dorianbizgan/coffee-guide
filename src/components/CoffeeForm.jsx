// Multi-step modal form, shared by "Add" and "Edit". Initial design from
// addform.jsx; we extend it to also handle existing-coffee edits.
import { useEffect, useRef, useState } from "react";
import { Icon, MethodIcon } from "./Icons.jsx";
import { BREW_METHODS, recommend, searchBeans, ACCENTS } from "../lib/data.js";

const ROAST_OPTIONS = [
  { k: "light", l: "Light" },
  { k: "medium-light", l: "Med-light" },
  { k: "medium", l: "Medium" },
  { k: "medium-dark", l: "Med-dark" },
  { k: "dark", l: "Dark" },
];

const PROCESS_OPTIONS = ["Washed", "Natural", "Honey", "Anaerobic Natural", "Pulped Natural"];

function notesAsString(value) {
  if (Array.isArray(value)) return value.join(", ");
  return value || "";
}

export function CoffeeForm({ onClose, onSubmit, onAiLookup, initial, mode = "add", prefillSearch = "", defaultGrinder = "" }) {
  const [step, setStep] = useState(0);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [data, setData] = useState(() => ({
    name: initial?.name || "",
    roaster: initial?.roaster || "",
    origin: initial?.origin || "",
    process: initial?.process || "Washed",
    roast: initial?.roast || "medium",
    notes: notesAsString(initial?.notes),
    elevation: initial?.elevation || "",
    variety: initial?.variety || "",
    bagSize: initial?.bagSize || "250g",
    roastDate: initial?.roastDate || new Date().toISOString().slice(0, 10),
    // Default to the user's global grinder if set — falling back to the
    // recipe reference (Comandante C40) only when no global is configured
    // yet. This keeps the add-coffee form consistent with what the user
    // sees on Detail's dial.
    grinder: initial?.grinder || defaultGrinder || "Comandante C40",
    brewer: initial?.method || "v60",
    _search: prefillSearch || "",
  }));

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  // If we mounted with a pre-filled search query (the dashboard "search online"
  // CTA), auto-fire the AI lookup once. The flag prevents re-running on rerender.
  const autoLookupFired = useRef(false);
  useEffect(() => {
    if (autoLookupFired.current) return;
    if (mode === "add" && prefillSearch && onAiLookup && data._search === prefillSearch) {
      autoLookupFired.current = true;
      handleAiLookup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillSearch, mode]);

  const handleAiLookup = async () => {
    if (!onAiLookup || !data._search?.trim()) return;
    setAiBusy(true); setAiError(null);
    try {
      const result = await onAiLookup(data._search.trim());
      if (result) {
        setData((d) => ({
          ...d,
          name: result.name || d.name,
          roaster: result.roaster || d.roaster,
          origin: result.origin || d.origin,
          process: result.process || d.process,
          roast: result.roast || d.roast,
          variety: result.variety || d.variety,
          elevation: result.elevation || d.elevation,
          notes: notesAsString(result.notes),
          // Honor the AI's classification so espresso blends route to
          // espresso even when the form would otherwise default to v60.
          brewer: result.intendedMethod || d.brewer,
          _intendedMethod: result.intendedMethod || null,
          _search: "",
        }));
      } else {
        setAiError("No matching coffee found online. Try a more specific search.");
      }
    } catch (e) {
      setAiError(e.message || "Lookup failed.");
    } finally {
      setAiBusy(false);
    }
  };

  const submit = () => {
    const accent = initial?.accent || ACCENTS[Math.floor(Math.random() * ACCENTS.length)];
    const recommendedId = recommend({ roast: data.roast, process: data.process, name: data.name, roaster: data.roaster, intendedMethod: data._intendedMethod });
    const stamp = initial?.stamp || ("Logged · " + new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }));
    onSubmit({
      ...(initial || {}),
      id: initial?.id || ("c" + Date.now()),
      name: data.name || "Untitled lot",
      roaster: data.roaster || "Home roast",
      origin: data.origin || "Unknown origin",
      process: data.process,
      roast: data.roast,
      notes: data.notes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      elevation: data.elevation || "—",
      variety: data.variety || "—",
      roastDate: data.roastDate,
      bagSize: data.bagSize,
      method: initial?.method || data.brewer || recommendedId,
      accent,
      stamp,
      favorite: initial?.favorite || false,
      grinder: data.grinder,
    });
  };

  const titles = mode === "edit"
    ? ["Bean details", "Roast & flavors", "Brew setup"]
    : ["What's in the bag?", "How is it processed?", "Your setup"];
  const subs = mode === "edit"
    ? [
        "Update the bean info — origin, variety, roaster.",
        "Tune roast level and process so the recipe stays accurate.",
        "Confirm gear & default brew method.",
      ]
    : [
        "Tell us about the coffee. Roaster info is on the front of the bag.",
        "These details tune your recipe — we'll adjust temp and grind based on roast.",
        "Confirm your gear so we can match the right brew method.",
      ];

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><Icon name="x" size={14} /></button>

        <div className="eyebrow" style={{ marginBottom: 8 }}>
          {mode === "edit" ? "Edit · " : ""}Step {step + 1} of 3
        </div>
        <h2>{titles[step]}</h2>
        <p className="modal-sub">{subs[step]}</p>

        {step === 0 && (
          <div className="form">
            <div className="bean-search">
              <label className="bean-search-label">Search a bean (optional)</label>
              <div className="bean-search-input">
                <Icon name="search" size={16} />
                <input
                  value={data._search}
                  onChange={(e) => set("_search", e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAiLookup(); } }}
                  placeholder="Try “Onyx”, “Yirgacheffe”, “Sey”…"
                />
                {onAiLookup && data._search?.length >= 2 && (
                  <button
                    type="button"
                    className="btn btn-amber btn-sm"
                    onClick={handleAiLookup}
                    disabled={aiBusy}
                    style={{ marginLeft: 8 }}
                  >
                    {aiBusy ? "Searching…" : "✦ Online"}
                  </button>
                )}
              </div>
              {aiError && <div style={{ color: "var(--amber-700)", fontSize: 12, marginTop: 6 }}>{aiError}</div>}
              {data._search && data._search.length >= 2 && (
                <div className="bean-results">
                  {searchBeans(data._search).length === 0 ? (
                    <div className="bean-empty">No catalog matches — fill in below or try “✦ Online”.</div>
                  ) : (
                    searchBeans(data._search).map((b, i) => (
                      <button
                        key={i}
                        type="button"
                        className="bean-result"
                        onClick={() => setData((d) => ({
                          ...d,
                          name: b.name, roaster: b.roaster, origin: b.origin,
                          process: b.process, roast: b.roast, variety: b.variety,
                          elevation: b.elevation, notes: b.notes, _search: "",
                        }))}
                      >
                        <div className="bean-result-main">
                          <div className="bean-result-name">{b.name}</div>
                          <div className="bean-result-meta">{b.roaster} · {b.origin}</div>
                        </div>
                        <span className="bean-result-roast">{b.roast}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="field">
                <label>Coffee name</label>
                <input value={data.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Kayon Mountain" />
              </div>
              <div className="field">
                <label>Roaster</label>
                <input value={data.roaster} onChange={(e) => set("roaster", e.target.value)} placeholder="e.g. Onyx Coffee Lab" />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Origin</label>
                <input value={data.origin} onChange={(e) => set("origin", e.target.value)} placeholder="Region, Country" />
              </div>
              <div className="field">
                <label>Variety</label>
                <input value={data.variety} onChange={(e) => set("variety", e.target.value)} placeholder="e.g. Heirloom, Bourbon" />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Elevation</label>
                <input value={data.elevation} onChange={(e) => set("elevation", e.target.value)} placeholder="e.g. 1,950 m" />
              </div>
              <div className="field">
                <label>Bag size</label>
                <input value={data.bagSize} onChange={(e) => set("bagSize", e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="form">
            <div className="field">
              <label>Roast level</label>
              <div className="choice-grid">
                {ROAST_OPTIONS.map((r) => (
                  <div key={r.k} className={`choice ${data.roast === r.k ? "active" : ""}`} onClick={() => set("roast", r.k)}>
                    <span className="ico">
                      <span style={{
                        width: 12, height: 12, borderRadius: "50%",
                        background: ["oklch(0.78 0.08 70)", "oklch(0.65 0.1 60)", "oklch(0.5 0.09 55)", "oklch(0.38 0.07 50)", "oklch(0.25 0.05 40)"][ROAST_OPTIONS.findIndex((x) => x.k === r.k)],
                        display: "block",
                      }} />
                    </span>
                    {r.l}
                  </div>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Process</label>
              <div className="choice-grid">
                {PROCESS_OPTIONS.map((p) => (
                  <div key={p} className={`choice ${data.process === p ? "active" : ""}`} onClick={() => set("process", p)}>{p}</div>
                ))}
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Tasting notes (comma separated)</label>
                <input value={data.notes} onChange={(e) => set("notes", e.target.value)} placeholder="jasmine, peach, honey" />
              </div>
              <div className="field">
                <label>Roast date</label>
                <input type="date" value={data.roastDate} onChange={(e) => set("roastDate", e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="form">
            <div className="field">
              <label>{mode === "edit" ? "Default brewer" : "Preferred brewer (we'll recommend, you can change later)"}</label>
              <div className="choice-grid">
                {BREW_METHODS.map((m) => (
                  <div key={m.id} className={`choice ${data.brewer === m.id ? "active" : ""}`} onClick={() => set("brewer", m.id)}>
                    <span className="ico"><MethodIcon id={m.id} size={16} /></span>
                    {m.short}
                  </div>
                ))}
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Grinder</label>
                <input value={data.grinder} onChange={(e) => set("grinder", e.target.value)} />
              </div>
              <div className="field">
                <label>Scale</label>
                <input defaultValue="Acaia Pearl" />
              </div>
            </div>
            <div className="tip" style={{ marginTop: 8 }}>
              <div className="lbl">Recommendation preview</div>
              <div className="b">
                Based on a {data.roast} roast with {data.process}, we'll suggest{" "}
                <strong style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>
                  {BREW_METHODS.find((m) => m.id === recommend({ roast: data.roast, process: data.process })).name}
                </strong>{" "}
                — you can switch any time.
              </div>
            </div>
          </div>
        )}

        <div className="form-foot">
          <div className="form-progress">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`dot-step ${i === step ? "active" : ""}`} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>Back</button>}
            {step < 2 ? (
              <button className="btn btn-primary" onClick={() => setStep(step + 1)}>
                Continue <Icon name="arrow-right" size={14} />
              </button>
            ) : (
              <button className="btn btn-amber" onClick={submit}>
                {mode === "edit" ? "Save changes" : "Add to shelf"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
