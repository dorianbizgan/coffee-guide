import { useState } from "react";
import { Icon } from "./Icons.jsx";

const GEAR_FIELDS = [
  { k: "grinder", l: "Grinder", placeholder: "e.g. Comandante C40" },
  { k: "scale", l: "Scale", placeholder: "e.g. Acaia Pearl" },
  { k: "kettle", l: "Kettle", placeholder: "e.g. Fellow Stagg EKG" },
  { k: "espresso", l: "Espresso machine", placeholder: "e.g. Decent DE1, Linea Mini" },
  { k: "water", l: "Water profile", placeholder: "e.g. Third Wave Water" },
  { k: "filters", l: "Filters", placeholder: "e.g. Hario tabbed white" },
];

export function GearView({ profile, onSaveProfile, busy }) {
  const [gear, setGear] = useState(profile?.gear || {});
  const [taste, setTaste] = useState(profile?.tastePreferences || "");
  const [aiProvider, setAiProvider] = useState(profile?.aiProvider || "anthropic");
  const set = (k, v) => setGear((g) => ({ ...g, [k]: v }));
  const dirty =
    JSON.stringify(gear) !== JSON.stringify(profile?.gear || {}) ||
    taste !== (profile?.tastePreferences || "") ||
    aiProvider !== (profile?.aiProvider || "anthropic");

  const save = async () => {
    await onSaveProfile({
      ...profile,
      gear,
      tastePreferences: taste,
      aiProvider,
    });
  };

  return (
    <div className="shell">
      <section className="hero">
        <div>
          <div className="eyebrow">Gear &amp; preferences</div>
          <h1>Your <em>setup</em>, dialed.</h1>
          <p className="hero-sub">Crema uses your kit + taste preferences when it suggests next-brew tweaks. Update anytime.</p>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h3>Equipment</h3>
        <div className="form" style={{ marginTop: 10 }}>
          {GEAR_FIELDS.reduce((rows, f, i) => {
            const ri = Math.floor(i / 2);
            (rows[ri] = rows[ri] || []).push(f);
            return rows;
          }, []).map((row, i) => (
            <div className="form-row" key={i}>
              {row.map((f) => (
                <div className="field" key={f.k}>
                  <label>{f.l}</label>
                  <input value={gear[f.k] || ""} onChange={(e) => set(f.k, e.target.value)} placeholder={f.placeholder} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h3>Taste preferences</h3>
        <p style={{ color: "var(--ink-mute)", fontSize: 13, marginTop: 4 }}>
          A short paragraph about what you like — used when the AI suggests dial tweaks or fetches a starting recipe.
        </p>
        <textarea
          className="brewnote-text"
          rows={4}
          value={taste}
          onChange={(e) => setTaste(e.target.value)}
          placeholder="e.g. I like bright, fruit-forward light roasts. Espresso 18g in / 45g out / 30s, 8 bar with 10s preinfusion. V60: 24g/400g (1:16.7), 48g bloom for 45s."
        />
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h3>AI provider</h3>
        <p style={{ color: "var(--ink-mute)", fontSize: 13, marginTop: 4 }}>
          The deployer covers the cost — pick which provider Crema should call. Not all may be configured.
        </p>
        <div className="choice-grid" style={{ marginTop: 10 }}>
          {[
            { k: "anthropic", l: "Anthropic Claude" },
            { k: "openai", l: "OpenAI GPT-4o" },
            { k: "google", l: "Google Gemini" },
          ].map((p) => (
            <div key={p.k} className={`choice ${aiProvider === p.k ? "active" : ""}`} onClick={() => setAiProvider(p.k)}>
              {p.l}
            </div>
          ))}
        </div>
      </section>

      <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button className="btn btn-amber" onClick={save} disabled={!dirty || busy}>
          {busy ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </div>
  );
}
