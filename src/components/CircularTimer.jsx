// One circular brew-timer chip. Used by both:
//   - the floating <TimerTray /> (small, ~72px, with click-to-open)
//   - <Detail /> (larger, ~220px, embedded in the cheat sheet area)
//
// Renders an SVG ring whose stroke fills clockwise as elapsed/total → 1.
// Inside the ring: current step name (large) + remaining time (small).
// Tap the ring to toggle play/pause, tap the X to dismiss.
import { elapsedSec, currentStepIndex, isDone, realSteps } from "../lib/timers.js";
import { MethodIcon } from "./Icons.jsx";

function fmtTime(sec) {
  if (sec < 0) sec = 0;
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function CircularTimer({
  timer,
  now,
  size = 72,
  variant = "chip",          // "chip" | "large"
  onToggle,
  onDismiss,
  onOpen,
}) {
  const elapsed = elapsedSec(timer, now);
  const total = timer.totalEndSec || 1;
  const pct = Math.min(1, elapsed / total);
  const r = size / 2 - (variant === "large" ? 12 : 5);
  const c = 2 * Math.PI * r;
  const stepIdx = currentStepIndex(timer, now);
  const steps = realSteps(timer);
  const step = stepIdx >= 0 ? steps[stepIdx] : null;
  const remaining = Math.max(0, total - elapsed);
  const done = isDone(timer, now);

  const ringColor = done ? "var(--amber-500)"
                  : timer.state === "running" ? "var(--forest-700)"
                  : "var(--ink-mute)";

  return (
    <div className={`circular-timer ${variant} ${done ? "done" : ""}`}>
      {onOpen && variant === "chip" && (
        <button
          className="ct-open"
          onClick={onOpen}
          aria-label={`Open ${timer.beanName} brew`}
        />
      )}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="ct-svg"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--paper-3)"
          strokeWidth={variant === "large" ? 8 : 5}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={variant === "large" ? 8 : 5}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.25s linear, stroke 0.2s" }}
        />
      </svg>
      <div className="ct-inner">
        {variant === "large" ? (
          <>
            <div className="ct-step-eyebrow">
              {done ? "Done — pull it off" : (step?.t || "Tap to start")}
            </div>
            <div className="ct-time-large">{fmtTime(elapsed)}</div>
            <div className="ct-target">{done ? `+${fmtTime(elapsed - total)} over` : `${fmtTime(remaining)} left`}</div>
            {step && step.d && !done && (
              <div className="ct-step-desc">{step.d}</div>
            )}
          </>
        ) : (
          <>
            <span className="ct-icon"><MethodIcon id={timer.methodId} size={16} /></span>
            <span className="ct-time-small">{fmtTime(remaining)}</span>
            {step && (
              <span className="ct-step-small">{done ? "Done" : step.t}</span>
            )}
          </>
        )}
      </div>

      {variant === "large" && (
        <div className="ct-large-actions">
          <button className="btn btn-primary btn-sm" onClick={() => onToggle?.(timer.id)}>
            {timer.state === "running" ? "Pause" : (elapsed > 0 ? "Resume" : "Start")}
          </button>
          {onDismiss && (
            <button className="btn btn-ghost btn-sm" onClick={() => onDismiss(timer.id)}>
              {done ? "Dismiss" : "Stop"}
            </button>
          )}
        </div>
      )}
      {variant === "chip" && onDismiss && (
        <button
          className="ct-dismiss"
          onClick={(e) => { e.stopPropagation(); onDismiss(timer.id); }}
          aria-label="Dismiss timer"
          title="Dismiss"
        >
          ×
        </button>
      )}
      {variant === "chip" && onToggle && (
        <button
          className="ct-toggle"
          onClick={(e) => { e.stopPropagation(); onToggle(timer.id); }}
          aria-label={timer.state === "running" ? "Pause" : "Start"}
          title={timer.state === "running" ? "Pause" : "Resume"}
        >
          {timer.state === "running" ? "❚❚" : "▶"}
        </button>
      )}
    </div>
  );
}
