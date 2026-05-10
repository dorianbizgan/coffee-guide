// Shared brew-timer state lives in App.jsx. This file owns the visual
// surfaces:
//   - useTimerTick(timer): subscribes a component to a 4Hz tick whenever
//     the timer is running, so the displayed elapsed value updates.
//   - elapsedSec(timer): pure helper, total elapsed including the current
//     run segment.
//   - <CircularTimer>: compact ring + numeric readout for the dashboard
//     card. Click to start/pause; long-press resets.
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

// Compact circular timer for the dashboard card. ~120px square. Click the
// big ring to start/pause; the small Reset button under the ring discards
// the run.
export function CircularTimer({
  timer, coffeeId, methodId, targetSec, onStart, onPause, onReset, size = 116,
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

  // SVG geometry: a stroked circle with stroke-dasharray driving the fill.
  const stroke = 6;
  const r = (size - stroke * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - pct);

  const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
  const onMainClick = (ev) => {
    stop(ev);
    if (running) onPause();
    else onStart(coffeeId, methodId);
  };

  // Use a 100×100 viewBox so the SVG scales with the container's CSS size.
  // Sizing comes from --ctimer-size on .ctimer (so a media query can shrink
  // it on phones without us passing different `size` props).
  const VBOX = 100;
  const VR = (VBOX - stroke * 2) / 2;
  const VC = VBOX / 2;
  const VCIRC = 2 * Math.PI * VR;
  const VOFF = VCIRC * (1 - pct);

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
          {/* Track */}
          <circle cx={VC} cy={VC} r={VR} fill="none" stroke="var(--line-strong)" strokeWidth={stroke} opacity="0.4" />
          {/* Progress (rotated −90deg so it starts at 12 o'clock) */}
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
        </svg>
        <div className="ctimer-center">
          <div className="ctimer-num">{fmtTimerTime(e)}</div>
          <div className="ctimer-target">{running || e > 0 ? `/ ${fmtTimerTime(target)}` : "Start brewing"}</div>
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
