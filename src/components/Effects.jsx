// Effects — mouse tracking, mesh-shader backgrounds, loaders, perspective tilt.
// Verbatim port from design's effects.jsx.
import { useEffect, useRef } from "react";

function useMouseVars() {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    let nx = 0.5, ny = 0.4;
    const apply = () => {
      raf = 0;
      root.style.setProperty("--mx", nx.toFixed(4));
      root.style.setProperty("--my", ny.toFixed(4));
    };
    const onMove = (e) => {
      nx = e.clientX / window.innerWidth;
      ny = e.clientY / window.innerHeight;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    apply();
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
}

function useCardTilt(mode) {
  useEffect(() => {
    if (mode === "flat" || mode === "lift" || mode === "glow") return undefined;
    const sel = ".card, .panel, .login-card, .recipe-cell, .timer, .modal";
    const handlers = new WeakMap();
    const attach = (el) => {
      if (handlers.has(el)) return;
      const onMove = (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.setProperty("--tilt-x", ((y - 0.5) * -10).toFixed(2) + "deg");
        el.style.setProperty("--tilt-y", ((x - 0.5) * 12).toFixed(2) + "deg");
        el.style.setProperty("--glow-x", (x * 100).toFixed(1) + "%");
        el.style.setProperty("--glow-y", (y * 100).toFixed(1) + "%");
        el.style.setProperty("--card-active", "1");
      };
      const onLeave = () => {
        el.style.setProperty("--tilt-x", "0deg");
        el.style.setProperty("--tilt-y", "0deg");
        el.style.setProperty("--card-active", "0");
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      handlers.set(el, { onMove, onLeave });
    };
    const detach = (el) => {
      const h = handlers.get(el);
      if (!h) return;
      el.removeEventListener("pointermove", h.onMove);
      el.removeEventListener("pointerleave", h.onLeave);
      el.style.removeProperty("--tilt-x");
      el.style.removeProperty("--tilt-y");
      el.style.removeProperty("--glow-x");
      el.style.removeProperty("--glow-y");
      el.style.removeProperty("--card-active");
      handlers.delete(el);
    };
    const scan = () => document.querySelectorAll(sel).forEach(attach);
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      document.querySelectorAll(sel).forEach(detach);
    };
  }, [mode]);
}

function BackgroundShader({ kind }) {
  const ref = useRef(null);
  useEffect(() => {
    if (kind === "off") return undefined;
    const cvs = ref.current;
    if (!cvs) return undefined;
    const ctx = cvs.getContext("2d");
    let raf = 0;
    const t0 = performance.now();
    const isDark = () => document.documentElement.dataset.theme === "dusk";
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cvs.width = Math.floor(window.innerWidth * dpr);
      cvs.height = Math.floor(window.innerHeight * dpr);
      cvs.style.width = window.innerWidth + "px";
      cvs.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const palettes = {
      light: ["#f8e3b9", "#f1c5a4", "#cfe6c8", "#a8d2b9", "#f6f4ef"],
      dark: ["#3d2c1f", "#5b3b1d", "#1f3a2c", "#3a4a3a", "#1a1410"],
      iri: ["#ffd6a5", "#ffadad", "#caffbf", "#9bf6ff", "#bdb2ff", "#ffc6ff"],
    };

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;
    const mx = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--mx")) || 0.5;
    const my = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--my")) || 0.4;

    const drawAurora = (t) => {
      const w = W(), h = H();
      ctx.clearRect(0, 0, w, h);
      const pal = isDark() ? palettes.dark : palettes.light;
      const pts = 5;
      for (let i = 0; i < pts; i++) {
        const ang = t * 0.00012 + i * 1.7;
        const cx = w * (0.5 + 0.35 * Math.cos(ang)) + (mx() - 0.5) * 120;
        const cy = h * (0.5 + 0.35 * Math.sin(ang * 1.3 + i)) + (my() - 0.5) * 120;
        const r = Math.max(w, h) * (0.55 + 0.1 * Math.sin(t * 0.00018 + i));
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, pal[i % pal.length] + (isDark() ? "cc" : "aa"));
        g.addColorStop(1, pal[i % pal.length] + "00");
        ctx.globalCompositeOperation = isDark() ? "screen" : "multiply";
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const drawMesh = (t) => {
      const w = W(), h = H();
      ctx.clearRect(0, 0, w, h);
      const pal = palettes.iri;
      const cells = 4;
      for (let i = 0; i <= cells; i++) {
        for (let j = 0; j <= cells; j++) {
          const phase = t * 0.0004 + (i + j) * 0.7;
          const cx = (i / cells) * w + Math.sin(phase) * 90 + (mx() - 0.5) * 60;
          const cy = (j / cells) * h + Math.cos(phase * 1.3) * 90 + (my() - 0.5) * 60;
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.32);
          const c = pal[(i * cells + j) % pal.length];
          g.addColorStop(0, c + (isDark() ? "60" : "90"));
          g.addColorStop(1, c + "00");
          ctx.globalCompositeOperation = isDark() ? "screen" : "multiply";
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
        }
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const drawPlasma = (t) => {
      const w = W(), h = H();
      ctx.clearRect(0, 0, w, h);
      const tt = t * 0.0004;
      const blobs = [
        { hue: 60, sx: 0.55, sy: 0.5, ph: 0.0 },
        { hue: 200, sx: 0.45, sy: 0.55, ph: 1.7 },
        { hue: 320, sx: 0.5, sy: 0.45, ph: 3.1 },
        { hue: 140, sx: 0.6, sy: 0.6, ph: 4.9 },
      ];
      const baseR = Math.max(w, h) * 1.1;
      for (const b of blobs) {
        const ang = tt + b.ph;
        const cx = w * (b.sx + 0.32 * Math.cos(ang) + (mx() - 0.5) * 0.25);
        const cy = h * (b.sy + 0.32 * Math.sin(ang * 1.2) + (my() - 0.5) * 0.25);
        const r = baseR * (0.85 + 0.18 * Math.sin(ang * 0.7));
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        const lt = isDark() ? 38 : 82;
        const ch = isDark() ? 0.16 : 0.12;
        g.addColorStop(0, `oklch(${lt}% ${ch} ${b.hue} / ${isDark() ? 0.7 : 0.6})`);
        g.addColorStop(0.55, `oklch(${lt}% ${ch} ${b.hue} / ${isDark() ? 0.25 : 0.2})`);
        g.addColorStop(1, `oklch(${lt}% ${ch} ${b.hue} / 0)`);
        ctx.globalCompositeOperation = isDark() ? "screen" : "multiply";
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const drawDots = (t) => {
      const w = W(), h = H();
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = isDark() ? "rgba(255,235,200,0.18)" : "rgba(60,40,15,0.22)";
      const step = 28;
      const tt = t * 0.0006;
      for (let y = 0; y < h + step; y += step) {
        for (let x = 0; x < w + step; x += step) {
          const u = x / w, v = y / h;
          const dx = u - mx();
          const dy = v - my();
          const dist = Math.sqrt(dx * dx + dy * dy);
          const r = 1.4 + Math.sin(tt + x * 0.01 + y * 0.01) * 0.8 + Math.max(0, 0.5 - dist) * 4;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const drawWaves = (t) => {
      const w = W(), h = H();
      ctx.clearRect(0, 0, w, h);
      const lines = 24;
      ctx.lineWidth = 1;
      for (let i = 0; i < lines; i++) {
        const yBase = (i / lines) * h;
        ctx.beginPath();
        const hue = (i / lines) * 360;
        const lt = isDark() ? 30 : 78;
        ctx.strokeStyle = `oklch(${lt}% 0.08 ${hue} / ${isDark() ? 0.4 : 0.55})`;
        for (let x = 0; x <= w; x += 8) {
          const u = x / w;
          const y = yBase
            + Math.sin(u * 6 + t * 0.001 + i * 0.4) * 18
            + Math.sin(u * 14 + t * 0.0007 + i) * 8
            + (mx() - 0.5) * 20 * Math.sin(u * 4 + i);
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };

    const drawers = { aurora: drawAurora, mesh: drawMesh, plasma: drawPlasma, dots: drawDots, waves: drawWaves };
    const tick = (now) => {
      const fn = drawers[kind];
      if (fn) fn(now - t0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [kind]);

  if (kind === "off") return null;
  return <canvas ref={ref} className="bg-shader" />;
}

function SpecularGlow({ level }) {
  if (level === "off") return null;
  return <div className={`spec-glow spec-${level}`} />;
}

function Sparkles({ on }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!on) return undefined;
    const cvs = ref.current;
    if (!cvs) return undefined;
    const ctx = cvs.getContext("2d");
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      cvs.width = Math.floor(window.innerWidth * dpr);
      cvs.height = Math.floor(window.innerHeight * dpr);
      cvs.style.width = window.innerWidth + "px";
      cvs.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    const N = 60;
    const stars = Array.from({ length: N }, () => ({
      x: Math.random(), y: Math.random(),
      ph: Math.random() * Math.PI * 2,
      sp: 1 + Math.random() * 2,
      hue: 40 + Math.random() * 320,
      sz: 0.6 + Math.random() * 1.4,
    }));
    const tick = (now) => {
      const w = window.innerWidth, h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      const mxN = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--mx")) || 0.5;
      const myN = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--my")) || 0.5;
      const tt = now * 0.001;
      for (const s of stars) {
        const dx = mxN - s.x, dy = myN - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const tw = (Math.sin(tt * s.sp + s.ph) + 1) / 2;
        const proximity = Math.max(0, 1 - dist * 1.6);
        const a = (0.15 + tw * 0.55) * (0.4 + proximity * 0.9);
        const px = s.x * w;
        const py = s.y * h;
        const r = (s.sz + tw * 1.4) * (1 + proximity * 1.5);
        ctx.fillStyle = `oklch(0.95 0.18 ${s.hue} / ${a})`;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        if (tw > 0.85) {
          ctx.strokeStyle = `oklch(0.98 0.1 ${s.hue} / ${a * 0.7})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(px - r * 2.5, py); ctx.lineTo(px + r * 2.5, py);
          ctx.moveTo(px, py - r * 2.5); ctx.lineTo(px, py + r * 2.5);
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [on]);
  if (!on) return null;
  return <canvas ref={ref} className="sparkles" />;
}

export function Loader({ kind = "ring", label }) {
  let body = null;
  switch (kind) {
    case "pour":
      body = (
        <div className="ldr-pour">
          <div className="ldr-pour-cup" />
          <div className="ldr-pour-stream" />
          <div className="ldr-pour-drips">
            {[0, 1, 2].map((i) => <span key={i} style={{ animationDelay: `${i * 0.25}s` }} />)}
          </div>
        </div>
      ); break;
    case "bloom":
      body = (
        <div className="ldr-bloom">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} style={{ transform: `rotate(${i * 45}deg)`, animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      ); break;
    case "ring":
      body = (
        <div className="ldr-ring">
          <svg viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40 86" strokeLinecap="round" />
          </svg>
        </div>
      ); break;
    case "dots":
      body = (
        <div className="ldr-dots">
          {[0, 1, 2].map((i) => <span key={i} style={{ animationDelay: `${i * 0.16}s` }} />)}
        </div>
      ); break;
    case "mesh":
      body = (
        <div className="ldr-mesh">
          <span className="m1" /><span className="m2" /><span className="m3" />
        </div>
      ); break;
    case "ribbon":
      body = (
        <div className="ldr-ribbon">
          <svg viewBox="0 0 80 24" preserveAspectRatio="none">
            <path d="M0 12 Q 10 4 20 12 T 40 12 T 60 12 T 80 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      ); break;
    case "bars":
      body = (
        <div className="ldr-bars">
          {[0, 1, 2, 3].map((i) => <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />)}
        </div>
      ); break;
    default:
      body = null;
  }
  return (
    <div className="ldr">
      {body}
      {label && <div className="ldr-label">{label}</div>}
    </div>
  );
}

export function EffectsHost({ tweaks }) {
  useMouseVars();
  useCardTilt(tweaks.cardHover);
  return (
    <>
      <BackgroundShader kind={tweaks.bg} />
      <SpecularGlow level={tweaks.glow} />
      <Sparkles on={tweaks.iri !== "off"} />
    </>
  );
}
