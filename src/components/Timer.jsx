// Shared brew-timer state lives in App.jsx. This file owns the visual
// surfaces:
//   - useTimerTick(timer): subscribes a component to a 4Hz tick whenever
//     the timer is running, so the displayed elapsed value updates.
//   - elapsedSec(timer): pure helper, total elapsed including the current
//     run segment.
//   - parseStepTime("0:45 — 1:30"): turns a recipe step's time-range
//     string into [startSec, endSec], so the timer can highlight which
//     step is currently active.
//   - <CircularTimer>: compact ring + numeric readout for the dashboard
//     card. Click to start/pause; long-press resets. When a `steps`
//     prop is supplied, the centre shows the active step's name as the
//     clock ticks (with ellipsis if it doesn't fit).
//   - <LinearTimer>: detail-view variant. Wider readout + horizontal
//     progress bar + start/pause/reset trio.
//
// Both surfaces read & write the same state via props (timer, onStart,
// onPause, onReset), so starting the timer on a card updates the detail
// view automatically and vice-versa.
import { useEffect, useState } from "react";

export function elapsedSec(timer) {
  if (!timer || !timer.coffeeId) return 0;
  const segment = timer.running && timer.startedAt ? (Date.now() - timer.startedAt) / 1000 : 0;
  return (timer.accum || 0) + segment;
}

export function useTimerTick(timer, hz = 4) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!timer?.running) return;
    const id = setInterval(() => setTick((n) => n + 1), Math.round(1000 / hz));
    return () => clearInterval(id);
  }, [timer?.running, hz]);
}

export function fmtTimerTime(sec) {
  if (sec < 0 || !isFinite(sec)) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// "0:45 — 1:30" → [45, 90].  "0:28" → [28, 28].  Bad input → [null, null].
export function parseStepTime(s) {
  if (!s) return [null, null];
  const parts = String(s).split("—").map((x) => x.trim());
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

// Given a method's `steps` array and an elapsed-second count, return the
// index of the brewing step that's currently active (or -1 if before/
// after the brew window). Prep steps (s.prep === true) are excluded.
export function activeStepIndex(steps, elapsed) {
  if (!steps || steps.length === 0) return -1;
  const brewing = steps.filter((s) => !s.prep);
  const ranges = brewing.map((s) => parseStepTime(s.time));
  return ranges.findIndex(([a, b], i) => {
    if (a == null) return false;
    const next = ranges[i + 1];
    const upper = b != null && b > a ? b : next && next[0] != null ? next[0] : a + 60;
    return elapsed >= a && elapsed < upper;
  });
}

// SVG arc geometry helpers. `deg` is 0 at 12 o'clock, increasing clockwise.
function polarToCart(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function arcPath(cx, cy, r, startDeg, endDeg) {
  // Guard against degenerate / full-circle paths (the latter would render
  // as a zero-length 'A' arc).
  const span = endDeg - startDeg;
  if (span <= 0.01) return "";
  const safeEnd = span >= 360 ? startDeg + 359.99 : endDeg;
  const start = polarToCart(cx, cy, r, startDeg);
  const end = polarToCart(cx, cy, r, safeEnd);
  const largeArc = safeEnd - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

// Given the method's `steps` and current elapsed seconds, build one entry
// per brewing step describing:
//   - path:    the SVG `d` for the step's full arc (track)
//   - fillPath: the SVG `d` for the currently-filled portion of that arc
//   - state:   'done' | 'active' | 'pending'
//   - startX/Y: the start vertex (used for the divider notches)
// Returns null if the steps don't have parseable durations (caller falls
// back to a single continuous arc).
function buildSegments(steps, elapsed, r, c, circumference) {
  if (!steps || steps.length === 0) return null;
  const brewing = steps.filter((s) => !s.prep);
  if (brewing.length === 0) return null;
  const ranges = brewing.map((s) => parseStepTime(s.time));
  // Resolve each step's duration. If the step has no explicit end, infer
  // it from the next step's start (or +60s as a last-resort fallback).
  const durations = ranges.map(([a, b], i) => {
    if (a == null) return null;
    if (b != null && b > a) return b - a;
    const next = ranges[i + 1];
    return next && next[0] != null ? next[0] - a : 60;
  });
  if (durations.some((d) => d == null || d <= 0)) return null;
  const totalDur = durations.reduce((s, d) => s + d, 0);
  if (totalDur <= 0) return null;

  // Visual gap between segments (in degrees). Keep small so short steps
  // don't disappear.
  const GAP_DEG = brewing.length > 1 ? 2 : 0;

  let cumDur = 0;
  return brewing.map((step, i) => {
    const dur = durations[i];
    const startDeg = (cumDur / totalDur) * 360;
    const endDegRaw = ((cumDur + dur) / totalDur) * 360;
    const endDeg = Math.max(startDeg + 1, endDegRaw - GAP_DEG);
    cumDur += dur;

    const elapsedInStep = Math.max(0, Math.min(dur, elapsed - (cumDur - dur)));
    const fillPct = dur > 0 ? elapsedInStep / dur : 0;
    const fillEndDeg = startDeg + (endDeg - startDeg) * fillPct;

    const state = elapsed >= cumDur ? "done" : elapsedInStep > 0 ? "active" : "pending";

    const startPt = polarToCart(c, c, r, startDeg);

    return {
      path: arcPath(c, c, r, startDeg, endDeg),
      fillPath: arcPath(c, c, r, startDeg, fillEndDeg),
      state,
      startX: startPt.x,
      startY: startPt.y,
    };
  });
}

// Compact circular timer for the dashboard card. ~120px square. Click the
// big ring to start/pause; the small Reset button under the ring discards
// the run. When `steps` is supplied, the centre shows the active step's
// title once the timer is running.
export function CircularTimer({
  timer, coffeeId, methodId, targetSec, steps, onStart, onPause, onReset, size = 116,
}) {
  // Tick only when this card's timer is running (avoids 4Hz re-renders
  // across the whole grid).
  const isMine = timer?.coffeeId === coffeeId && timer?.methodId === methodId;
  useTimerTick(isMine ? timer : null);

  const e = isMine ? elapsedSec(timer) : 0;
  const target = targetSec || 180;  // 3:00 default for visual reference
  const pct = Math.min(1, target ? e / target : 0);
  // After the target is reached, the ring stays full and the colour shifts.
  const past = isMine && target > 0 && e >= target;
  const running = isMine && timer?.running;

  // Decide the small caption under the time:
  //   - not running, no time yet → "Start brewing"
  //   - running before any step  → first step's name (so it reads "Bloom"
  //     as soon as the user taps Start, even at 0:00)
  //   - running inside a step    → that step's name
  //   - after the last step      → "Done"
  //   - paused with time on it   → "Paused"
  let caption = "Start brewing";
  if (running || (isMine && e > 0)) {
    const brewing = (steps || []).filter((s) => !s.prep);
    const idx = activeStepIndex(steps || [], e);
    if (idx >= 0) caption = brewing[idx].t;
    else if (brewing.length && e === 0) caption = brewing[0].t;
    else if (past) caption = "Done";
    else if (brewing.length) caption = brewing[brewing.length - 1].t;
    if (!running && e > 0) caption = "Paused";
  }

  const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
  const onMainClick = (ev) => {
    stop(ev);
    if (running) onPause();
    else onStart(coffeeId, methodId);
  };

  // Use a 100×100 viewBox so the SVG scales with the container's CSS size.
  // Sizing comes from --ctimer-size on .ctimer (so a media query can shrink
  // it on phones without us passing different `size` props).
  const stroke = 6;
  const VBOX = 100;
  const VR = (VBOX - stroke * 2) / 2;
  const VC = VBOX / 2;
  const VCIRC = 2 * Math.PI * VR;
  const VOFF = VCIRC * (1 - pct);

  // Build per-step arc segments from the recipe so the user can see at a
  // glance how long each step takes. `null` if steps don't have parseable
  // time ranges — in that case we fall back to the single continuous
  // progress arc.
  const segs = buildSegments(steps, e, VR, VC, VCIRC);

  return (
    <div className="ctimer" onClick={stop} style={{ "--ctimer-size": `${size}px` }}>
      <button
        type="button"
        className={`ctimer-ring ${running ? "is-running" : ""} ${past ? "is-past" : ""} ${isMine ? "is-mine" : ""}`}
        onClick={onMainClick}
        title={running ? "Pause" : isMine && e > 0 ? "Resume" : "Start brewing"}
        aria-label={running ? "Pause timer" : "Start timer"}
      >
        <svg viewBox={`0 0 ${VBOX} ${VBOX}`} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
          {segs ? (
            <>
              {/* Per-step track arcs. Each step gets a slice of the ring
                  proportional to its duration. Tiny gap between segments
                  makes the divisions visible. */}
              {segs.map((s, i) => (
                <path
                  key={`t-${i}`}
                  d={s.path}
                  fill="none"
                  stroke="var(--line-strong)"
                  strokeWidth={stroke}
                  strokeLinecap="butt"
                  opacity="0.35"
                />
              ))}
              {/* Filled portion: done segments fully, active partially. */}
              {segs.map((s, i) => {
                if (s.state === "pending") return null;
                return (
                  <path
                    key={`f-${i}`}
                    d={s.state === "done" ? s.path : s.fillPath}
                    fill="none"
                    stroke={past ? "var(--amber-500)" : "var(--forest-700)"}
                    strokeWidth={stroke}
                    strokeLinecap="butt"
                    opacity={s.state === "done" ? 0.85 : 1}
                    style={{
                      transition: running ? "d 0.25s linear" : "d 0.18s ease",
                    }}
                  />
                );
              })}
              {/* Tiny notch dots on each segment boundary (small visual
                  anchor so the divisions read clearly even at 92px). */}
              {segs.map((s, i) =>
                i === 0 ? null : (
                  <circle key={`n-${i}`} cx={s.startX} cy={s.startY} r={1.1} fill="var(--paper-2)" />
                ),
              )}
            </>
          ) : (
            <>
              {/* Fallback: single continuous arc (used when the method's
                  step times can't be parsed into durations). */}
              <circle cx={VC} cy={VC} r={VR} fill="none" stroke="var(--line-strong)" strokeWidth={stroke} opacity="0.4" />
              <circle
                cx={VC} cy={VC} r={VR}
                fill="none"
                stroke={past ? "var(--amber-500)" : "var(--forest-700)"}
                strokeWidth={stroke}
                strokeDasharray={VCIRC}
                strokeDashoffset={VOFF}
                strokeLinecap="round"
                style={{ transformOrigin: "50% 50%", transform: "rotate(-90deg)", transition: running ? "stroke-dashoffset 0.25s linear" : "stroke-dashoffset 0.18s ease" }}
              />
            </>
          )}
        </svg>
        <div className="ctimer-center">
          <div className="ctimer-num">{fmtTimerTime(e)}</div>
          {/* Single-line, ellipsis-clipped step label. Width is constrained
              by CSS so even long names like "Pre-heat water" stay inside
              the ring on the 92px phone variant. */}
          <div className="ctimer-step" title={caption}>{caption}</div>
        </div>
        {running && <span className="ctimer-pulse" aria-hidden="true" />}
      </button>
      {isMine && e > 0 && (
        <button type="button" className="ctimer-reset" onClick={(ev) => { stop(ev); onReset(); }} title="Reset timer" aria-label="Reset timer">
          Reset
        </button>
      )}
    </div>
  );
}

// Detail-view variant: same state, wider rectangular readout with a
// horizontal fill bar. Reused by Detail to replace its old self-contained
// BrewTimer's clock+bar block.
export function LinearTimer({
  timer, coffeeId, methodId, targetSec, onStart, onPause, onReset,
}) {
  const isMine = timer?.coffeeId === coffeeId && timer?.methodId === methodId;
  useTimerTick(isMine ? timer : null);
  const e = isMine ? elapsedSec(timer) : 0;
  const target = targetSec || 180;
  const pct = Math.min(100, target ? (e / target) * 100 : 0);
  const running = isMine && timer?.running;

  return (
    <div className="timer-clock">
      <div className="timer-display">
        <span className="t-num">{fmtTimerTime(e)}</span>
        {target > 0 && <span className="t-target">/ {fmtTimerTime(target)} target</span>}
      </div>
      <div className="timer-bar"><div className="timer-bar-fill" style={{ width: `${pct}%` }} /></div>
      <div className="timer-ctrls">
        {!running ? (
          <button className="btn btn-primary btn-sm" onClick={() => onStart(coffeeId, methodId)}>
            {isMine && e > 0 ? "Resume" : "Start brewing"}
          </button>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={onPause}>Pause</button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={onReset} disabled={!isMine || (e === 0 && !running)}>Reset</button>
      </div>
    </div>
  );
}
