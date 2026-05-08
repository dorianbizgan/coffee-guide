import { useState } from "react";
import { Icon, BrandMark } from "./Icons.jsx";

export function Login({ onSignIn, onGuest, busy, error }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [mode, setMode] = useState("signin");

  const submit = (e) => {
    e?.preventDefault();
    if (!email || !pw) return;
    onSignIn({ mode, name: name.trim(), email: email.trim(), password: pw });
  };

  return (
    <div className="login-page">
      <div className="login-blob">
        <svg className="b1" viewBox="0 0 400 400"><circle cx="200" cy="200" r="180" fill="oklch(0.86 0.1 70)" /></svg>
        <svg className="b2" viewBox="0 0 400 400"><ellipse cx="200" cy="200" rx="190" ry="160" fill="oklch(0.82 0.06 145)" /></svg>
      </div>
      <div className="login-bg" />

      <header className="login-nav">
        <div className="brand">
          <div className="brand-mark"><BrandMark /></div>
          <div>
            <div className="brand-name">Crema<em>.</em></div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ink-mute)", marginTop: -2 }}>Coffee field guide</div>
          </div>
        </div>
      </header>

      <main className="login-main">
        <section className="login-pitch">
          <div className="eyebrow">Pour with intention</div>
          <h1 className="login-h1">A field guide for<br />your <em>next</em> brew.</h1>
          <p className="login-sub">Log every bag, get a tuned recipe, and keep a cheat sheet on your dashboard. Switch methods on a whim — Crema follows along.</p>
          <ul className="login-feats">
            <li><span className="dot"></span> Recipes that adjust to roast level &amp; process</li>
            <li><span className="dot"></span> Step-by-step timer for every brew method</li>
            <li><span className="dot"></span> Your shelf, gear, and notes — all in one place</li>
          </ul>
        </section>

        <section className="login-card">
          <div className="login-tabs">
            <button className={`login-tab ${mode === "signin" ? "active" : ""}`} onClick={() => setMode("signin")}>Sign in</button>
            <button className={`login-tab ${mode === "signup" ? "active" : ""}`} onClick={() => setMode("signup")}>Create account</button>
          </div>
          <form className="form" onSubmit={submit} style={{ marginTop: 18 }}>
            <div className={`field-collapse ${mode === "signup" ? "open" : ""}`} aria-hidden={mode !== "signup"}>
              <div className="field">
                <label>Your name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Avery Bishop" tabIndex={mode === "signup" ? 0 : -1} />
              </div>
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            </div>
            {error && <div className="login-error" style={{ color: "var(--amber-700)", fontSize: 13, marginTop: -4 }}>{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={busy} style={{ justifyContent: "center", padding: "13px 22px" }}>
              {busy ? "…" : mode === "signin" ? "Sign in to your shelf" : "Create my shelf"}
            </button>
          </form>

          <div className="login-divider"><span>or</span></div>

          <button className="btn btn-ghost" style={{ justifyContent: "center", width: "100%" }} onClick={onGuest}>
            <Icon name="cup" size={14} /> Continue as guest
          </button>
          <p className="login-foot">Guest mode lets you try every feature. Your beans &amp; brews stay only on this device.</p>
        </section>
      </main>
    </div>
  );
}
