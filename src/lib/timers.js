// Shared brew-timer store. Lives at the App level so timers persist across
// view changes (Dashboard ↔ Detail ↔ Brew log) and so multiple concurrent
// brews can run side-by-side (e.g. cold brew steeping while you pull an
// espresso). Persisted to localStorage so a refresh doesn't lose state.
//
// Each timer keeps its own copy of the method's steps so changing a coffee's
// method partway through a running brew doesn't yank the steps out from
// under the timer.
//
//   useBrewTimers() returns { timers, now, create, pause, resume, reset,
//                              dismiss, markNotified }
//   `now` is a Date.now() snapshot that ticks while any timer is running so
//   subscribed components re-render. Read elapsed via elapsedSec(t, now).

import { useCallback, useEffect, useState } from "react";

const KEY = "crema-timers-v1";
const TICK_MS = 250;

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

export function computeTotalEnd(steps) {
  let max = 0;
  for (const s of steps) {
    if (s.prep) continue;
    const [a, b] = parseStepTime(s.time);
    if (b != null && b > max) max = b;
    else if (a != null && a > max) max = a;
  }
  return max;
}

export function elapsedSec(timer, now = Date.now()) {
  if (!timer) return 0;
  const accum = (timer.accumulatedMs || 0) / 1000;
  if (timer.state === "running" && timer.startedAt) {
    return accum + (now - timer.startedAt) / 1000;
  }
  return accum;
}

export function isDone(timer, now = Date.now()) {
  return !!timer && timer.totalEndSec > 0 && elapsedSec(timer, now) >= timer.totalEndSec;
}

// Index into the non-prep steps. -1 if no step is currently active.
export function currentStepIndex(timer, now = Date.now()) {
  if (!timer) return -1;
  const elapsed = elapsedSec(timer, now);
  const realSteps = (timer.steps || []).filter((s) => !s.prep);
  for (let i = 0; i < realSteps.length; i++) {
    const [a, b] = parseStepTime(realSteps[i].time);
    if (a == null) continue;
    const next = realSteps[i + 1];
    const nextStart = next ? parseStepTime(next.time)[0] : null;
    const upper = b != null && b > a ? b : nextStart != null ? nextStart : a + 60;
    if (elapsed >= a && elapsed < upper) return i;
  }
  // Past the last step → return the last index so the chip stays informative.
  return Math.max(-1, realSteps.length - 1);
}

export function realSteps(timer) {
  return (timer?.steps || []).filter((s) => !s.prep);
}

export function useBrewTimers() {
  const [timers, setTimers] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  const [now, setNow] = useState(() => Date.now());

  // Persist on every mutation. Cheap because it's just JSON of a few
  // small timer objects.
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(timers)); } catch {}
  }, [timers]);

  // Single shared interval — only running while at least one timer is
  // unpaused. The interval re-renders all subscribers via setNow.
  useEffect(() => {
    const anyRunning = Object.values(timers).some((t) => t.state === "running");
    if (!anyRunning) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [timers]);

  const create = useCallback((bean, method) => {
    const id = `${bean.id}__${method.id}__${Date.now()}`;
    const totalEndSec = computeTotalEnd(method.steps);
    setTimers((prev) => ({
      ...prev,
      [id]: {
        id,
        beanId: bean.id,
        beanName: bean.name,
        methodId: method.id,
        methodName: method.name,
        steps: method.steps,
        totalEndSec,
        startedAt: Date.now(),
        accumulatedMs: 0,
        state: "running",
        notifiedAt: null,
        createdAt: Date.now(),
      },
    }));
    return id;
  }, []);

  // Toggle: if running → pause, if paused → resume.
  const toggle = useCallback((id) => {
    setTimers((prev) => {
      const t = prev[id];
      if (!t) return prev;
      if (t.state === "running") {
        const accumulatedMs = (t.accumulatedMs || 0) + (Date.now() - t.startedAt);
        return { ...prev, [id]: { ...t, state: "paused", accumulatedMs } };
      }
      return { ...prev, [id]: { ...t, state: "running", startedAt: Date.now() } };
    });
  }, []);

  const reset = useCallback((id) => {
    setTimers((prev) => {
      const t = prev[id];
      if (!t) return prev;
      return { ...prev, [id]: { ...t, state: "paused", accumulatedMs: 0, startedAt: null, notifiedAt: null } };
    });
  }, []);

  const dismiss = useCallback((id) => {
    setTimers((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const markNotified = useCallback((id) => {
    setTimers((prev) => {
      const t = prev[id];
      if (!t) return prev;
      return { ...prev, [id]: { ...t, notifiedAt: Date.now() } };
    });
  }, []);

  // Find the first timer matching a bean+method (used by Detail to surface
  // any in-progress brew for the bean it's showing).
  const findFor = useCallback((beanId, methodId) => {
    return Object.values(timers).find((t) => t.beanId === beanId && t.methodId === methodId) || null;
  }, [timers]);

  return { timers, now, create, toggle, reset, dismiss, markNotified, findFor };
}
