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
  const [aiProvider, setAiProvider] = useState(profile?.aiProvider || "google");
  // When the user switches grinders we show an inline confirm modal
  // asking whether to retranslate every saved recipe to the new scale
  // (rather than just changing future recipes). Stash the in-flight save
  // payload here while the user answers.
  const [pendingSwap, setPendingSwap] = useState(null);
  const [toast, setToast] = useState("");
  const set = (k, v) => setGear((g) => ({ ...g, [k]: v }));
  const dirty =
    JSON.stringify(gear) !== JSON.stringify(profile?.gear || {}) ||
    taste !== (profile?.tastePreferences || "") ||
    aiProvider !== (profile?.aiProvider || "google");

  // Build the fully-formed next-profile object once, used by all save
  // paths (no-grinder-change, migrate-yes, migrate-no).
  const buildNext = () => ({
    ...profile,
    gear,
    tastePreferences: taste,
    aiProvider,
  });

  const save = async () => {
    const oldGrinder = (profile?.gear?.grinder || "").trim();
    const newGrinder = (gear?.grinder || "").trim();
    const grinderChanged = oldGrinder !== newGrinder;
    // Only prompt when the user actually had a grinder before AND swapped
    // to a different non-empty one. First-time set has nothing to migrate.
    if (grinderChanged && oldGrinder && newGrinder) {
      setPendingSwap({ from: oldGrinder, to: newGrinder, next: buildNext() });
      return;
    }
    await onSaveProfile(buildNext());
    setToast(grinderChanged && newGrinder ? `Saved. New recipes will use ${newGrinder}.` : "Preferences saved.");
    setTimeout(() => setToast(""), 3000);
  };

  const confirmMigrate = async (migrate) => {
    const { next, from, to } = pendingSwap;
    setPendingSwap(null);
    await onSaveProfile(next, { migrateOverrides: migrate });
    setToast(
      migrate
        ? `Saved recipes recalibrated from ${from} to ${to}.`
        : `Saved. Existing recipes stay on ${from}; new recipes will use ${to}.`,
    );
    setTimeout(() => setToast(""), 4500);
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
            { k: "google", l: "Google Gemini  ·  free tier" },
            { k: "anthropic", l: "Anthropic Claude" },
            { k: "openai", l: "OpenAI GPT-4o" },
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

      {/* Toast — short confirmation after a non-prompt save. */}
      {toast && (
        <div className="gear-toast" role="status">{toast}</div>
      )}

      {/* Grinder-change confirm modal. Triggered only when the user swapped
          from one named grinder to another — there's nothing to migrate
          when they're setting it for the first time. Nested inside the
          .modal-bg overlay so clicks on the dim background dismiss it
          but clicks inside the modal don't. */}
      {pendingSwap && (
        <div className="modal-bg" onClick={() => setPendingSwap(null)}>
          <div
            className="modal grinder-swap-modal"
            role="dialog"
            aria-labelledby="grinder-swap-h"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Cancel"
              onClick={() => setPendingSwap(null)}
            >×</button>
            <h2 id="grinder-swap-h">Switching grinder</h2>
            <p style={{ color: "var(--ink-mute)", marginTop: 6 }}>
              You changed from <em>{pendingSwap.from}</em> to <em>{pendingSwap.to}</em>.
              Your existing recipes have dial values saved in the old grinder's units.
            </p>
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              <button className="btn btn-amber" onClick={() => confirmMigrate(true)}>
                Update Scale for All Recipes
              </button>
              <button className="btn btn-ghost" onClick={() => confirmMigrate(false)}>
                Keep saved recipes as-is — only new ones use {pendingSwap.to}
              </button>
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 14 }}>
              Updating recalibrates every saved per-coffee dial value through the new grinder's anchor points.
              You can always tweak a coffee's dial individually after.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
