// First-visit "Add to Home Screen" hint.
//
// On Android Chrome we capture the beforeinstallprompt event, store the
// prompt object, and trigger it with a single tap. On iOS Safari there is
// no programmatic install API — we show a short text instruction pointing
// at the share-sheet → Add to Home Screen flow instead.
//
// We hide the banner when:
//   - user dismisses it
//   - user accepts the Android install
//   - the page is already running standalone (display-mode: standalone)
//   - the user has dismissed within the last 14 days (localStorage)

import { useEffect, useState } from "react";

const KEY = "crema-install-dismissed";
const QUIET_PERIOD_DAYS = 14;

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.matchMedia?.("(display-mode: window-controls-overlay)")?.matches ||
    window.navigator.standalone === true
  );
}

function recentlyDismissed() {
  try {
    const ts = parseInt(localStorage.getItem(KEY) || "0", 10);
    if (!ts) return false;
    return (Date.now() - ts) < QUIET_PERIOD_DAYS * 86400_000;
  } catch { return false; }
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // iPadOS now reports as Macintosh + touch — sniff that too.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [installEvent, setInstallEvent] = useState(null);
  const [variant, setVariant] = useState("ios"); // "ios" | "android"

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return undefined;

    // Android / Chromium path — they emit beforeinstallprompt.
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setInstallEvent(e);
      setVariant("android");
      // Slight delay so the banner appears after the first paint, not on
      // the loading flash.
      setTimeout(() => setShow(true), 1200);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS path — no programmatic install, just check UA + show after a beat.
    if (isIos()) {
      const t = setTimeout(() => {
        if (!isStandalone() && !recentlyDismissed()) setShow(true);
      }, 1500);
      return () => {
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
        clearTimeout(t);
      };
    }
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(KEY, String(Date.now())); } catch {}
    setShow(false);
  };

  const install = async () => {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome === "accepted") dismiss();
    } catch {
      dismiss();
    }
  };

  if (!show) return null;

  return (
    <div className="install-prompt" role="dialog" aria-label="Add Crema to your home screen">
      <div className="install-prompt-body">
        <div className="install-prompt-title">
          <span className="install-prompt-mark">✦</span>
          <strong>Brew faster — install Crema</strong>
        </div>
        <p className="install-prompt-text">
          {variant === "ios" ? (
            <>
              Tap the <strong>Share</strong> button in Safari, then{" "}
              <strong>Add to Home Screen</strong> for full-screen brewing &
              background timer notifications.
            </>
          ) : (
            <>
              Add Crema to your home screen for full-screen brewing & timer
              notifications that fire even when the tab's closed.
            </>
          )}
        </p>
      </div>
      <div className="install-prompt-actions">
        {variant === "android" && (
          <button className="btn btn-amber btn-sm" onClick={install}>Install</button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={dismiss}>Not now</button>
      </div>
    </div>
  );
}
