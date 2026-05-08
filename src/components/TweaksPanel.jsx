// Simplified TweaksPanel — lifted from the design's tweaks-panel.jsx but
// stripped of the Claude Design editor host protocol. Persists to localStorage
// and exposes the same Section/Select/Radio/Toggle controls.
import { useEffect, useRef, useState, useCallback } from "react";

const TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-panel.collapsed{width:auto;height:auto}
  .twk-launch{position:fixed;right:16px;bottom:16px;z-index:2147483646;
    width:38px;height:38px;border-radius:99px;border:.5px solid rgba(0,0,0,.12);
    background:rgba(250,249,247,.85);-webkit-backdrop-filter:blur(20px);
    backdrop-filter:blur(20px);box-shadow:0 6px 20px rgba(0,0,0,.18);
    display:flex;align-items:center;justify-content:center;cursor:pointer;
    color:#29261b;font:600 14px/1 ui-sans-serif,system-ui,sans-serif}
  .twk-launch:hover{transform:scale(1.05)}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:default;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:pointer;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}
  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}
  .twk-field{appearance:none;width:100%;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none;cursor:pointer}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}
  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:pointer;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere;transition:background .15s}
  .twk-seg button[data-on="1"]{background:rgba(255,255,255,.9);
    box-shadow:0 1px 2px rgba(0,0,0,.12)}
`;

function injectStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById("twk-style")) return;
  const s = document.createElement("style");
  s.id = "twk-style";
  s.textContent = TWEAKS_STYLE;
  document.head.appendChild(s);
}

export function useTweaks(defaults, storageKey = "crema-tweaks") {
  const [values, setValues] = useState(() => {
    if (typeof localStorage === "undefined") return defaults;
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch {
      return defaults;
    }
  });
  const setTweak = useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === "object" && keyOrEdits !== null
      ? keyOrEdits
      : { [keyOrEdits]: val };
    setValues((prev) => {
      const next = { ...prev, ...edits };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [storageKey]);
  return [values, setTweak];
}

export function TweaksPanel({ title = "Tweaks", children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const ref = useRef(null);
  useEffect(() => { injectStyle(); }, []);
  if (!open) {
    return (
      <button className="twk-launch" onClick={() => setOpen(true)} title="Tweak appearance" aria-label="Open appearance tweaks">
        ✦
      </button>
    );
  }
  return (
    <div className="twk-panel" ref={ref}>
      <div className="twk-hd">
        <b>{title}</b>
        <button className="twk-x" onClick={() => setOpen(false)} aria-label="Close">×</button>
      </div>
      <div className="twk-body">{children}</div>
    </div>
  );
}

export function TweakSection({ label, children }) {
  return (
    <>
      <div className="twk-sect">{label}</div>
      {children}
    </>
  );
}

export function TweakSelect({ label, value, options, onChange }) {
  return (
    <div className="twk-row">
      <div className="twk-lbl"><span>{label}</span></div>
      <select className="twk-field" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function TweakRadio({ label, value, options, onChange }) {
  return (
    <div className="twk-row">
      <div className="twk-lbl"><span>{label}</span></div>
      <div className="twk-seg">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            data-on={value === o.value ? "1" : "0"}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TweakToggle({ label, value, onChange }) {
  return (
    <div className="twk-row twk-row-h" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <span className="twk-lbl"><span>{label}</span></span>
      <button
        type="button"
        className="twk-toggle"
        data-on={value ? "1" : "0"}
        onClick={() => onChange(!value)}
        style={{
          position: "relative", width: 32, height: 18, border: 0, borderRadius: 999,
          background: value ? "#34c759" : "rgba(0,0,0,.15)", cursor: "pointer", padding: 0,
        }}
      >
        <i style={{
          position: "absolute", top: 2, left: 2, width: 14, height: 14, borderRadius: "50%",
          background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.25)",
          transform: value ? "translateX(14px)" : "translateX(0)", transition: "transform .15s",
        }}/>
      </button>
    </div>
  );
}
