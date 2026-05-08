import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, MethodIcon } from "./Icons.jsx";
import { BREW_METHODS, adjustRecipe, recommend, resolveGrinder, dialWarning, grinderCapability, snapClicks, formatClicks, quantize } from "../lib/data.js";

function parseStepTime(s) {
  if (!s) return [null, null];
  const parts = s.split("—").map((x) => x.trim());
  const toSec = (str) => {
    const bits = str.split(":").map((n) => parseInt(n, 10));
    if (bits.some(isNaN)) return null;
    if (bits.length === 3) return bits[0] * 3600 + bits[1] * 60 + bits[2];
    if (bits.length === 2) return bits[0] * 60 + bits[1];
    return bits[0];
  };
  const a = toSec(parts[0]);
  const b = parts[1] ? toSec(parts[1]) : a;
  return [a, b];
}
function fmtTime(sec) {
  if (sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function BrewTimer({ steps: allSteps }) {
  const prepSteps = allSteps.filter((s) => s.prep);
  const steps = allSteps.filter((s) => !s.prep);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(null);
  const accumRef = useRef(0);

  useEffect(() => {
    let id;
    if (running) {
      startedAt.current = Date.now();
      id = setInterval(() => {
        setElapsed(accumRef.current + (Date.now() - startedAt.current) / 1000);
      }, 100);
    }
    return () => clearInterval(id);
  }, [running]);

  const start = () => { if (!running) setRunning(true); };
  const pause = () => {
    if (running) {
      accumRef.current += (Date.now() - startedAt.current) / 1000;
      setRunning(false);
      setElapsed(accumRef.current);
    }
  };
  const reset = () => { setRunning(false); accumRef.current = 0; setElapsed(0); };

  const ranges = steps.map((s) => parseStepTime(s.time));
  const activeIdx = ranges.findIndex(([a, b], i) => {
    if (a == null) return false;
    const next = ranges[i + 1];
    const upper = b != null && b > a ? b : next && next[0] != null ? next[0] : a + 60;
    return elapsed >= a && elapsed < upper;
  });
  const totalEnd = ranges.reduce((acc, [a, b]) => Math.max(acc, b ?? a ?? 0), 0);

  return (
    <div className="timer">
      {prepSteps.length > 0 && (
        <div className="prep-section">
          <div className="prep-h">Setup · before you start the timer</div>
          <ul className="prep-list">
            {prepSteps.map((s, i) => (
              <li key={i} className="prep-item">
                <span className="prep-bullet">·</span>
                <span><strong>{s.t}.</strong> {s.d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="timer-clock">
        <div className="timer-display">
          <span className="t-num">{fmtTime(elapsed)}</span>
          {totalEnd > 0 && <span className="t-target">/ {fmtTime(totalEnd)} target</span>}
        </div>
        <div className="timer-bar">
          <div className="timer-bar-fill" style={{ width: `${Math.min(100, totalEnd ? (elapsed / totalEnd) * 100 : 0)}%` }} />
        </div>
      </div>
      <div className="timer-ctrls">
        {!running ? (
          <button className="btn btn-primary btn-sm" onClick={start}>{elapsed > 0 ? "Resume" : "Start brewing"}</button>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={pause}>Pause</button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={reset} disabled={elapsed === 0 && !running}>Reset</button>
      </div>
      <BrewSteps steps={steps} ranges={ranges} activeIdx={running || elapsed > 0 ? activeIdx : -1} elapsed={elapsed} />
    </div>
  );
}

function BrewSteps({ steps, ranges, activeIdx, elapsed }) {
  return (
    <ol className="steps">
      {steps.map((s, i) => {
        const [a] = ranges[i];
        const done = a != null && elapsed > 0 && i < activeIdx && activeIdx !== -1;
        const active = i === activeIdx;
        return (
          <li className={`step ${active ? "step-active" : ""} ${done ? "step-done" : ""}`} key={i}>
            <div className="step-n">{String(i + 1).padStart(2, "0")}</div>
            <div className="step-body">
              <div className="t">{s.t}</div>
              <div className="d">{s.d}</div>
            </div>
            <div className="step-time">{s.time}</div>
          </li>
        );
      })}
    </ol>
  );
}

export function Detail({ coffee, onBack, onChangeMethod, onSaveBrewLog, onEdit, onDelete, requestAi, gear }) {
  const [methodId, setMethodId] = useState(coffee.method);
  const method = BREW_METHODS.find((m) => m.id === methodId) || BREW_METHODS[0];
  const baseRecipe = adjustRecipe(method, coffee);
  const recommendedId = recommend(coffee);

  // Pick a grinder profile from the user's gear field. Honors any custom
  // scale the user pinned in GearView; falls back to a name match (then to
  // Comandante).
  const grinder = useMemo(() => resolveGrinder(gear), [gear?.grinder, gear?.grinderCustom]);
  const capabilityWarning = grinderCapability(grinder, method);

  // Translate the recipe's "22 clicks" baseline (which is on the Comandante
  // 6–36 scale) into this grinder's scale by mapping the relative position.
  const COMANDANTE_RANGE = [6, 36];
  const parseBaseClicks = (s) => {
    const m = String(s || "").match(/([\d.]+)\s*clicks?/i);
    return m ? parseFloat(m[1]) : 22;
  };
  const baseRecipeClicks = parseBaseClicks(baseRecipe.grind);
  const f01 = Math.min(1, Math.max(0, (baseRecipeClicks - COMANDANTE_RANGE[0]) / (COMANDANTE_RANGE[1] - COMANDANTE_RANGE[0])));
  const baseClicks = snapClicks(grinder, grinder.min + f01 * (grinder.max - grinder.min));
  const baseTemp = baseRecipe.temp;

  const [temp, setTemp] = useState(baseTemp);
  const [clicks, setClicks] = useState(baseClicks);
  useEffect(() => { setTemp(baseTemp); setClicks(baseClicks); /* eslint-disable-next-line */ }, [methodId, grinder.id]);

  // Map current clicks to a generic fineness descriptor for any grinder.
  const grindDescriptor = (n) => {
    const span = grinder.max - grinder.min;
    const pct = span <= 0 ? 0.5 : (n - grinder.min) / span;
    if (pct <= 0.18) return "fine — espresso territory";
    if (pct <= 0.40) return "medium-fine — pourover, pulls clarity";
    if (pct <= 0.60) return "medium — balanced, forgiving";
    if (pct <= 0.80) return "medium-coarse — immersion, AeroPress";
    return "coarse — French press, cold brew";
  };

  const clicksDisplay = formatClicks(grinder, clicks);
  const clicksLabel = grinder.unit ? `${clicksDisplay} ${grinder.unit}` : `${clicksDisplay}`;
  const recipe = { ...baseRecipe, temp, grind: `${clicksLabel} · ${grindDescriptor(clicks).split(" — ")[0]}` };
  const warning = dialWarning({ method, grinder, clicks, temp });

  const noteKey = `cb_note_${coffee.id}_${methodId}`;
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState(null);

  useEffect(() => {
    const fromLog = (coffee.brewLog || []).filter((l) => l.method === methodId).slice(-1)[0] || null;
    if (fromLog) {
      setSavedNote(fromLog);
      setNote(fromLog.text || "");
      return;
    }
    try {
      const stored = localStorage.getItem(noteKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSavedNote(parsed);
        setNote(parsed.text || "");
        return;
      }
    } catch {}
    setSavedNote(null);
    setNote("");
  }, [noteKey, coffee.brewLog, methodId]);

  const [tags, setTags] = useState([]);
  const [tasted, setTasted] = useState([]);
  useEffect(() => {
    setTags(savedNote?.tags || []);
    setTasted(savedNote?.tasted || []);
  }, [savedNote]);

  const toggleTag = (t) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const toggleTasted = (t) => setTasted((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const saveNote = async () => {
    const entry = {
      text: note, tags, tasted, savedAt: new Date().toISOString(),
      temp, clicks, method: methodId,
    };
    try { localStorage.setItem(noteKey, JSON.stringify(entry)); } catch {}
    setSavedNote(entry);
    if (onSaveBrewLog) await onSaveBrewLog(coffee.id, entry);
  };

  const TAG_PRESETS = ["Best yet", "Balanced", "Sour", "Bitter", "Weak", "Strong", "Muddy", "Clean"];

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const requestUpdate = async () => {
    if (!requestAi) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const result = await requestAi({
        coffee, method, recipe, temp, clicks, tags, tasted, note,
        grinder,
        grinderRange: { min: grinder.min, max: grinder.max, unit: grinder.unit, step: grinder.step },
      });
      setAiResult(result);
    } catch (e) {
      setAiResult({ error: e.message || "Couldn't get a suggestion — try again in a moment." });
    } finally {
      setAiLoading(false);
    }
  };
  const applyAi = () => {
    if (aiResult?.tempC) setTemp(Math.max(80, Math.min(99, Math.round(aiResult.tempC))));
    if (aiResult?.clicks != null) {
      setClicks(snapClicks(grinder, parseFloat(aiResult.clicks)));
    }
    setAiResult(null);
  };

  const handleMethod = (id) => {
    setMethodId(id);
    onChangeMethod(coffee.id, id);
  };

  return (
    <div className="shell detail">
      <div>
        <button className="back-btn" onClick={onBack} style={{ fontFamily: "Geist" }}>
          <Icon name="arrow-left" size={14} /> Back to shelf
        </button>

        <header className="detail-head">
          <div className="detail-roaster">{coffee.roaster}{coffee.stamp ? ` · ${coffee.stamp}` : ""}</div>
          <h1 className="detail-name">{coffee.name}</h1>

          <div className="detail-meta">
            <div className="meta-item"><div className="l">Origin</div><div className="v">{coffee.origin}</div></div>
            <div className="meta-item"><div className="l">Process</div><div className="v">{coffee.process}</div></div>
            <div className="meta-item"><div className="l">Variety</div><div className="v">{coffee.variety || "—"}</div></div>
            <div className="meta-item"><div className="l">Elevation</div><div className="v">{coffee.elevation || "—"}</div></div>
            <div className="meta-item"><div className="l">Roast</div><div className="v" style={{ textTransform: "capitalize" }}>{coffee.roast}{coffee.decaf ? " · decaf" : ""}</div></div>
            <div className="meta-item"><div className="l">Roasted</div><div className="v">{coffee.roastDate || "—"}</div></div>
          </div>

          <div className="notes">
            {(coffee.notes || []).map((n) => <span className="note-pill" key={n}>{n}</span>)}
          </div>
        </header>

        <div className="section-h">
          <h2>Brew method</h2>
          {recommendedId === methodId ? (
            <button className="btn btn-ghost btn-sm" disabled style={{ color: "var(--forest-700)", cursor: "default", opacity: 1 }}>★ Recommended for this bean</button>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => handleMethod(recommendedId)}>Use recommended</button>
          )}
        </div>

        <div className="method-tabs">
          {BREW_METHODS.map((m) => {
            const incompatible = grinder?.goodFor && !grinder.goodFor.includes(m.id);
            return (
              <button
                key={m.id}
                className={`method-tab ${m.id === methodId ? "active" : ""}`}
                onClick={() => handleMethod(m.id)}
                title={incompatible ? `${grinder.label} isn't ideal for ${m.short}` : ""}
                style={incompatible ? { opacity: 0.6 } : undefined}
              >
                <span className="ico"><MethodIcon id={m.id} size={15} /></span>
                {m.short}
                {incompatible && <span style={{ marginLeft: 4, color: "var(--amber-700)", fontSize: 10 }}>!</span>}
              </button>
            );
          })}
        </div>
        {capabilityWarning && (
          <div className="dial-warn" style={{ marginTop: 12 }}>
            {capabilityWarning}
          </div>
        )}

        <div className="recipe-grid">
          <div className="recipe-cell accent"><div className="l">Dose</div><div><span className="v">{recipe.dose}</span><span className="u">g</span></div></div>
          <div className="recipe-cell"><div className="l">Water</div><div><span className="v">{recipe.water}</span><span className="u">{methodId === "cold" ? "ml" : "g"}</span></div></div>
          <div className="recipe-cell"><div className="l">Ratio</div><div><span className="v">1:{recipe.ratio}</span></div></div>
          <div className="recipe-cell"><div className="l">Temp</div><div><span className="v">{recipe.temp}</span><span className="u">°C</span></div></div>
          <div className="recipe-cell" style={{ gridColumn: "span 2" }}><div className="l">Grind</div><div><span className="v" style={{ fontSize: 24 }}>{recipe.grind}</span></div></div>
          <div className="recipe-cell" style={{ gridColumn: "span 2" }}><div className="l">Total time</div><div><span className="v">{recipe.time}</span></div></div>
        </div>

        <div className="section-h">
          <h2>Cheat sheet</h2>
          <span className="eyebrow">{method.name}</span>
        </div>

        <div className="dial">
          <div className="dial-head">
            <div>
              <div className="dial-title">Dial it in</div>
              <div className="dial-sub">Tweak temp &amp; grind for your kit. Resets when you switch methods.</div>
            </div>
            {(temp !== baseTemp || clicks !== baseClicks) && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setTemp(baseTemp); setClicks(baseClicks); }}>Reset to recipe</button>
            )}
          </div>

          <div className="dial-row">
            <div className="dial-label">
              <span className="l">Water temperature</span>
              <span className="readout">{temp}<small>°C</small></span>
            </div>
            <input type="range" min="80" max="99" step="1" value={temp} onChange={(e) => setTemp(parseInt(e.target.value, 10))} className="slider slider-temp" style={{ "--p": ((temp - 80) / 19) * 100 + "%" }} />
            <div className="dial-scale"><span>80°</span><span>89°</span><span>99°</span></div>
          </div>

          <div className="dial-row">
            <div className="dial-label">
              <span className="l">Grind · <em>{grinder.label}</em></span>
              <span className="readout">{clicksDisplay}<small>{grinder.unit || ""}</small></span>
            </div>
            <input
              type="range"
              min={grinder.min}
              max={grinder.max}
              step={grinder.step}
              value={clicks}
              onChange={(e) => setClicks(snapClicks(grinder, parseFloat(e.target.value)))}
              className="slider"
              style={{ "--p": (((clicks - grinder.min) / (grinder.max - grinder.min)) * 100 || 0) + "%" }}
            />
            <div className="dial-scale"><span>fine</span><span className="grind-desc">{grindDescriptor(clicks)}</span><span>coarse</span></div>
          </div>
          {warning && <div className="dial-warn">{warning}</div>}
        </div>

        <BrewTimer steps={method.steps} key={method.id} />

        <div className="brewnote">
          <div className="brewnote-head">
            <div>
              <div className="dial-title">How did this brew go?</div>
              <div className="dial-sub">
                {savedNote
                  ? `Last note saved ${new Date(savedNote.savedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
                  : "Quick tasting impression — saved per coffee + method."}
              </div>
            </div>
          </div>

          <div className="bn-section">
            <div className="bn-label">Overall</div>
            <div className="tag-row">
              {TAG_PRESETS.map((t) => (
                <button key={t} className={`chip ${tags.includes(t) ? "on" : ""}`} onClick={() => toggleTag(t)}>{t}</button>
              ))}
            </div>
          </div>

          <div className="bn-section">
            <div className="bn-label">Flavors you tasted <span className="bn-hint">— tap any that came through</span></div>
            <div className="tag-row">
              {(coffee.notes || []).map((n) => (
                <button key={n} className={`chip flavor ${tasted.includes(n) ? "on" : ""}`} onClick={() => toggleTasted(n)}>{n}</button>
              ))}
            </div>
          </div>

          <textarea
            className="brewnote-text"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="A few words — body, sweetness, what you'd change next time…"
          />
          <div className="brewnote-actions">
            <span className="brewnote-stamp">{temp}°C · {clicksDisplay} {grinder.unit || ""}</span>
            <div className="bn-btn-row">
              <button
                className="btn btn-ghost btn-sm"
                onClick={requestUpdate}
                disabled={aiLoading || (tags.length === 0 && tasted.length === 0 && !note)}
              >
                {aiLoading ? "Coaching…" : "✦ Update my cheat sheet"}
              </button>
              <button
                className="btn btn-amber btn-sm"
                onClick={saveNote}
                disabled={!note && tags.length === 0 && tasted.length === 0}
              >
                Save note
              </button>
            </div>
          </div>

          {aiResult && (
            <div className="ai-result">
              {aiResult.error ? (
                <div className="ai-error">{aiResult.error}</div>
              ) : (
                <>
                  <div className="ai-head">
                    <span className="ai-mark">✦</span>
                    <span className="ai-title">Suggested next brew</span>
                  </div>
                  <div className="ai-deltas">
                    <div className="ai-delta">
                      <span className="ai-l">Temp</span>
                      <span className="ai-v">{aiResult.tempC}°C</span>
                      <span className="ai-diff">{aiResult.tempC > temp ? `+${aiResult.tempC - temp}` : aiResult.tempC < temp ? `${aiResult.tempC - temp}` : "—"}</span>
                    </div>
                    {(() => {
                      const aiClicks = snapClicks(grinder, parseFloat(aiResult.clicks));
                      const rawDelta = aiClicks - clicks;
                      // Snap to step before formatting so we don't print 0.30000001
                      const snappedDelta = quantize(Math.abs(rawDelta), grinder.step) * Math.sign(rawDelta);
                      const negligible = Math.abs(snappedDelta) < grinder.step / 2;
                      const sign = snappedDelta > 0 ? "+" : "";
                      return (
                        <div className="ai-delta">
                          <span className="ai-l">Grind</span>
                          <span className="ai-v">{formatClicks(grinder, aiClicks)} {grinder.unit || ""}</span>
                          <span className="ai-diff">{negligible ? "—" : `${sign}${formatClicks(grinder, snappedDelta)}`}</span>
                        </div>
                      );
                    })()}
                  </div>
                  <p className="ai-advice">{aiResult.advice}</p>
                  <div className="ai-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setAiResult(null)}>Dismiss</button>
                    <button className="btn btn-amber btn-sm" onClick={applyAi}>Apply to dial</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <aside className="sidebar">
        <div className="panel">
          <h3>Your setup</h3>
          <div className="gear-row"><span className="k">Grinder</span><span className="v">{gear?.grinder || "Comandante C40"}</span></div>
          <div className="gear-row"><span className="k">Brewer</span><span className="v">{method.name}</span></div>
          <div className="gear-row"><span className="k">Scale</span><span className="v">{gear?.scale || "Acaia Pearl"}</span></div>
          <div className="gear-row"><span className="k">Kettle</span><span className="v">{gear?.kettle || "Fellow Stagg EKG"}</span></div>
          <div className="gear-row"><span className="k">Water</span><span className="v">{gear?.water || "Third Wave Profile"}</span></div>
        </div>

        <div className="tip">
          <div className="lbl">Trail tip</div>
          <div className="b">{method.tip}</div>
        </div>

        <div className="panel">
          <h3>Bag info</h3>
          <div className="gear-row"><span className="k">Size</span><span className="v">{coffee.bagSize || "—"}</span></div>
          <div className="gear-row"><span className="k">Roasted</span><span className="v">{coffee.roastDate || "—"}</span></div>
          {coffee.roastDate && (
            <div className="gear-row"><span className="k">Days off roast</span><span className="v">~{Math.round((Date.now() - new Date(coffee.roastDate).getTime()) / 86400000)}d</span></div>
          )}
          <div className="gear-row"><span className="k">Cups remaining</span><span className="v">~{Math.max(0, Math.round(parseInt(coffee.bagSize || "0", 10) / (recipe.dose || 18)))}</span></div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {onEdit && (
            <button className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => onEdit(coffee)}>
              <Icon name="edit" size={14} /> Edit
            </button>
          )}
          {onDelete && (
            <button
              className="btn btn-ghost"
              style={{ flex: 1, justifyContent: "center", color: "var(--amber-700)" }}
              onClick={() => {
                if (confirm(`Remove "${coffee.name}" from your shelf?`)) onDelete(coffee.id);
              }}
            >
              <Icon name="trash" size={14} /> Delete
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
