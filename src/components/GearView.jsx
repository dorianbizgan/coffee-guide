import { useEffect, useState } from "react";
import { Icon } from "./Icons.jsx";
import { GRINDERS, detectGrinder, resolveGrinder, BREW_METHODS } from "../lib/data.js";
import { aiStatus } from "../lib/ai.js";

const GEAR_FIELDS = [
  { k: "scale", l: "Scale", placeholder: "e.g. Acaia Pearl" },
  { k: "kettle", l: "Kettle", placeholder: "e.g. Fellow Stagg EKG" },
  { k: "espresso", l: "Espresso machine", placeholder: "e.g. Decent DE1, Linea Mini" },
  { k: "water", l: "Water profile", placeholder: "e.g. Third Wave Water" },
  { k: "filters", l: "Filters", placeholder: "e.g. Hario tabbed white" },
];

export function GearView({ profile, onSaveProfile, busy }) {
  const [gear, setGear] = useState(profile?.gear || {});
  const [taste, setTaste] = useState(profile?.tastePreferences || "");
  const [aiProvider, setAiProvider] = useState(profile?.aiProvider || "google");
  const [providerStatus, setProviderStatus] = useState({ anthropic: false, openai: false, google: false });
  useEffect(() => { aiStatus().then(setProviderStatus); }, []);
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
          <div className="field">
            <label>Grinder</label>
            <div className="choice-grid">
              {GRINDERS.map((g) => {
                const isActive = !gear.grinderCustom && detectGrinder(gear.grinder).id === g.id;
                return (
                  <div
                    key={g.id}
                    className={`choice ${isActive ? "active" : ""}`}
                    onClick={() => setGear((prev) => {
                      const { grinderCustom, ...rest } = prev;
                      return { ...rest, grinder: g.label };
                    })}
                  >
                    {g.label}
                  </div>
                );
              })}
            </div>
            <input
              value={gear.grinder || ""}
              onChange={(e) => set("grinder", e.target.value)}
              placeholder="…or type a custom grinder"
              style={{ marginTop: 10 }}
            />
            {(() => {
              const resolved = resolveGrinder(gear);
              const isUnknown = resolved.id === "generic" || !!gear.grinderCustom;
              return (
                <>
                  <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 6 }}>
                    Active scale: <strong>{resolved.min}–{resolved.max}{resolved.step < 1 ? " (step " + resolved.step + ")" : ""} {resolved.unit || "settings"}</strong>
                    {gear.grinderCustom ? " · custom" : isUnknown ? " · generic fallback" : " · built-in"}
                  </div>
                  {isUnknown && <CustomScaleEditor gear={gear} setGear={setGear} />}
                </>
              );
            })()}
          </div>
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
          Crema asks the server which providers have an API key configured (✓ = available). If your preferred provider isn't, the client falls back to whichever is.
        </p>
        <div className="choice-grid" style={{ marginTop: 10 }}>
          {[
            { k: "google",    l: "Google Gemini" },
            { k: "anthropic", l: "Anthropic Claude" },
            { k: "openai",    l: "OpenAI GPT-4o" },
          ].map((p) => {
            const available = !!providerStatus[p.k];
            return (
              <div
                key={p.k}
                className={`choice ${aiProvider === p.k ? "active" : ""}`}
                onClick={() => setAiProvider(p.k)}
                style={{ opacity: available ? 1 : 0.55 }}
                title={available ? "Configured on this deployment" : "No API key set in Vercel"}
              >
                <span style={{ marginRight: 8, color: available ? "var(--forest-700)" : "var(--ink-mute)" }}>
                  {available ? "✓" : "○"}
                </span>
                {p.l}
              </div>
            );
          })}
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

// Lets the user pin a numeric scale + brew-method capability list when their
// grinder isn't in our built-in dropdown. Stored on gear.grinderCustom so
// resolveGrinder() in data.js picks it up.
function CustomScaleEditor({ gear, setGear }) {
  const c = gear.grinderCustom || {};
  const setCustom = (patch) => setGear((prev) => ({
    ...prev,
    grinderCustom: { ...(prev.grinderCustom || {}), ...patch },
  }));
  const clearCustom = () => setGear((prev) => {
    const { grinderCustom, ...rest } = prev;
    return rest;
  });
  const goodFor = Array.isArray(c.goodFor) ? c.goodFor : [];
  const toggleMethod = (id) => {
    const next = goodFor.includes(id) ? goodFor.filter((x) => x !== id) : [...goodFor, id];
    setCustom({ goodFor: next });
  };

  return (
    <div className="panel" style={{ marginTop: 12, padding: "14px 16px", background: "var(--paper-3)" }}>
      <div className="bn-label" style={{ marginBottom: 10 }}>Custom scale + capability</div>
      <p style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 0, marginBottom: 12 }}>
        Pin a numeric range so the brew dial uses the right scale, and tick the methods this grinder can actually nail. Crema warns you when you pick a method outside that list.
      </p>
      <div className="form-row">
        <div className="field">
          <label>Min</label>
          <input
            type="number"
            value={c.min ?? ""}
            onChange={(e) => setCustom({ min: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
            placeholder="0"
          />
        </div>
        <div className="field">
          <label>Max</label>
          <input
            type="number"
            value={c.max ?? ""}
            onChange={(e) => setCustom({ max: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
            placeholder="40"
          />
        </div>
        <div className="field">
          <label>Step</label>
          <input
            type="number"
            step="0.01"
            value={c.step ?? ""}
            onChange={(e) => setCustom({ step: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
            placeholder="1"
          />
        </div>
        <div className="field">
          <label>Unit label</label>
          <input
            value={c.unit ?? ""}
            onChange={(e) => setCustom({ unit: e.target.value })}
            placeholder="clicks · notches · settings"
          />
        </div>
      </div>
      <div className="field" style={{ marginTop: 8 }}>
        <label>Methods this grinder can do well</label>
        <div className="choice-grid">
          {BREW_METHODS.map((m) => (
            <div
              key={m.id}
              className={`choice ${goodFor.includes(m.id) ? "active" : ""}`}
              onClick={() => toggleMethod(m.id)}
            >
              {m.short}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 6 }}>
          Leave empty to disable capability warnings.
        </div>
      </div>
      {gear.grinderCustom && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={clearCustom}
          style={{ marginTop: 10 }}
        >
          Clear custom scale (use default)
        </button>
      )}
    </div>
  );
}
