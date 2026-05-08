import { useEffect, useState, useCallback } from "react";
import { supabase } from "./lib/supabase.js";
import {
  loadCoffees, saveCoffee, deleteCoffee, setFavorite, setMethod,
  appendBrewLog, loadProfile, saveProfile, loadAllBrewLogs,
} from "./lib/db.js";
import { suggestDialTweak, lookupBeanOnline } from "./lib/ai.js";
import { Icon, BrandMark } from "./components/Icons.jsx";
import { EffectsHost } from "./components/Effects.jsx";
import { Login } from "./components/Login.jsx";
import { Dashboard } from "./components/Dashboard.jsx";
import { Detail } from "./components/Detail.jsx";
import { CoffeeForm } from "./components/CoffeeForm.jsx";
import { BrewLogView } from "./components/BrewLogView.jsx";
import { GearView } from "./components/GearView.jsx";
import {
  TweaksPanel, TweakSection, TweakSelect, TweakRadio, useTweaks,
} from "./components/TweaksPanel.jsx";

const TWEAK_DEFAULTS = {
  theme: "default",
  voice: "editorial",
  density: "tight",
  bg: "off",
  iri: "off",
  glow: "off",
  noise: "fine",
  cardHover: "magnetic",
  loader: "ring",
  motion: "bouncy",
};

export default function App() {
  const [user, setUser] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [view, setView] = useState({ name: "dashboard" });
  const [coffees, setCoffees] = useState([]);
  const [coffeesLoaded, setCoffeesLoaded] = useState(false);
  const [logs, setLogs] = useState([]);
  const [profile, setProfileState] = useState({ gear: {}, tastePreferences: "", aiProvider: "anthropic" });
  const [profileBusy, setProfileBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [prefillSearch, setPrefillSearch] = useState("");
  const [userMenu, setUserMenu] = useState(false);
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Bind tweak data attributes onto <html>
  useEffect(() => {
    const r = document.documentElement;
    r.dataset.theme = t.theme === "default" ? "" : t.theme;
    r.dataset.voice = t.voice;
    r.dataset.surface = "paper";
    r.dataset.density = t.density;
    r.dataset.bg = t.bg;
    r.dataset.iri = t.iri;
    r.dataset.glow = t.glow;
    r.dataset.noise = t.noise;
    r.dataset.cardhover = t.cardHover;
    r.dataset.motion = t.motion;
  }, [t.theme, t.voice, t.density, t.bg, t.iri, t.glow, t.noise, t.cardHover, t.motion]);

  // Hydrate user from Supabase session or guest localStorage
  useEffect(() => {
    let mounted = true;

    (async () => {
      const guestRaw = localStorage.getItem("crema-guest-mode");
      if (guestRaw === "1") {
        if (!mounted) return;
        setUser({ mode: "guest", name: "Guest", id: "guest" });
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const session = data?.session;
      if (session?.user) {
        const meta = session.user.user_metadata || {};
        setUser({
          mode: "user",
          id: session.user.id,
          email: session.user.email,
          name: meta.full_name || meta.name || session.user.email?.split("@")[0] || "you",
        });
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!mounted) return;
      if (session?.user) {
        const meta = session.user.user_metadata || {};
        setUser({
          mode: "user",
          id: session.user.id,
          email: session.user.email,
          name: meta.full_name || meta.name || session.user.email?.split("@")[0] || "you",
        });
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  // Load shelf + profile + logs whenever the user changes
  useEffect(() => {
    if (!user) {
      setCoffees([]); setCoffeesLoaded(false); setLogs([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const [shelf, prof, allLogs] = await Promise.all([
        loadCoffees(user),
        loadProfile(user),
        loadAllBrewLogs(user),
      ]);
      if (cancelled) return;
      setCoffees(shelf);
      setProfileState(prof);
      setLogs(allLogs);
      setCoffeesLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const signIn = async ({ mode, name, email, password }) => {
    setAuthBusy(true); setAuthError(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name || email.split("@")[0] } },
        });
        if (error) throw error;
        // Supabase may require email confirmation; if so, surface that.
        const { data: s } = await supabase.auth.getSession();
        if (!s?.session) {
          setAuthError("Account created. Check your email to confirm before signing in.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      localStorage.removeItem("crema-guest-mode");
    } catch (e) {
      setAuthError(e.message || "Sign in failed.");
    } finally {
      setAuthBusy(false);
    }
  };

  const startGuest = () => {
    localStorage.setItem("crema-guest-mode", "1");
    setUser({ mode: "guest", name: "Guest", id: "guest" });
    setView({ name: "dashboard" });
  };

  const signOut = async () => {
    if (user?.mode === "guest") {
      localStorage.removeItem("crema-guest-mode");
    } else {
      try { await Promise.race([supabase.auth.signOut(), new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 3000))]); }
      catch {}
      // Clean up any stale Supabase tokens
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("sb-") || k.includes("supabase")) localStorage.removeItem(k);
      });
    }
    setUser(null);
    setView({ name: "dashboard" });
    setUserMenu(false);
  };

  const open = (id) => setView({ name: "detail", id });
  const back = () => setView({ name: "dashboard" });

  const onAdd = useCallback(async (c) => {
    try {
      const saved = await saveCoffee(user, c);
      const stored = saved && saved.id !== c.id ? saved : c;
      setCoffees((prev) => [...prev, stored]);
      setAdding(false);
      setView({ name: "detail", id: stored.id });
    } catch (e) {
      alert("Couldn't save: " + (e.message || e));
    }
  }, [user]);

  const onEditSave = useCallback(async (c) => {
    try {
      const saved = await saveCoffee(user, c);
      const stored = saved && saved.id ? saved : c;
      setCoffees((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...stored } : x)));
      setEditing(null);
    } catch (e) {
      alert("Couldn't save changes: " + (e.message || e));
    }
  }, [user]);

  const onDelete = useCallback(async (id) => {
    try {
      await deleteCoffee(user, id);
      setCoffees((prev) => prev.filter((c) => c.id !== id));
      setView({ name: "dashboard" });
    } catch (e) {
      alert("Couldn't delete: " + (e.message || e));
    }
  }, [user]);

  const onChangeMethod = useCallback(async (id, method) => {
    setCoffees((prev) => prev.map((c) => (c.id === id ? { ...c, method } : c)));
    try { await setMethod(user, id, method); } catch (e) { console.warn("setMethod", e.message); }
  }, [user]);

  const onToggleFavorite = useCallback(async (id) => {
    let nextValue;
    setCoffees((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      nextValue = !c.favorite;
      return { ...c, favorite: nextValue };
    }));
    try { await setFavorite(user, id, !!nextValue); } catch (e) { console.warn("setFavorite", e.message); }
  }, [user]);

  const onSaveBrewLog = useCallback(async (beanId, entry) => {
    try {
      await appendBrewLog(user, beanId, entry);
      const fresh = await loadAllBrewLogs(user);
      setLogs(fresh);
      setCoffees((prev) => prev.map((c) =>
        c.id === beanId ? { ...c, brewLog: [...(c.brewLog || []), entry] } : c
      ));
    } catch (e) {
      console.warn("appendBrewLog", e.message);
    }
  }, [user]);

  const onSaveProfile = useCallback(async (next) => {
    setProfileBusy(true);
    try {
      await saveProfile(user, next);
      setProfileState(next);
    } catch (e) {
      alert("Couldn't save preferences: " + (e.message || e));
    } finally {
      setProfileBusy(false);
    }
  }, [user]);

  const requestAi = useCallback(async (ctx) => {
    return suggestDialTweak({ ...ctx, preferences: profile.tastePreferences || "" });
  }, [profile.tastePreferences]);

  const onSearchOnline = useCallback(async (query) => {
    setEditing(null);
    setPrefillSearch(query);
    setAdding(true);
  }, []);

  const onAiLookupForForm = useCallback(async (q) => {
    return lookupBeanOnline(q, profile.tastePreferences || "");
  }, [profile.tastePreferences]);

  if (!user) {
    return (
      <>
        <EffectsHost tweaks={t} />
        <Login onSignIn={signIn} onGuest={startGuest} busy={authBusy} error={authError} />
        <TweaksPanel title="Tweaks">
          <TweakSection label="Mood">
            <TweakSelect
              label="Theme"
              value={t.theme}
              onChange={(v) => setTweak("theme", v)}
              options={[
                { value: "default", label: "Forest" },
                { value: "sunrise", label: "Sunrise" },
                { value: "dusk", label: "Dusk" },
                { value: "pixel", label: "Pixel art" },
              ]}
            />
          </TweakSection>
        </TweaksPanel>
      </>
    );
  }

  const current = view.name === "detail" ? coffees.find((c) => c.id === view.id) : null;

  return (
    <div data-screen-label={view.name === "dashboard" ? "01 Shelf" : view.name === "detail" ? "02 Detail" : view.name === "log" ? "03 Brew log" : "04 Gear"}>
      <EffectsHost tweaks={t} />
      <header className="nav">
        <div className="brand" onClick={back}>
          <div className="brand-mark"><BrandMark /></div>
          <div>
            <div className="brand-name">Crema<em>.</em></div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ink-mute)", marginTop: -2 }}>
              Coffee field guide
            </div>
          </div>
        </div>
        <nav className="nav-links">
          <span className={`nav-link ${view.name === "dashboard" ? "active" : ""}`} onClick={() => setView({ name: "dashboard" })}>The shelf</span>
          <span className={`nav-link ${view.name === "log" ? "active" : ""}`} onClick={() => setView({ name: "log" })}>Brew log</span>
          <span className={`nav-link ${view.name === "gear" ? "active" : ""}`} onClick={() => setView({ name: "gear" })}>Gear</span>
          <button className="btn btn-amber btn-sm" onClick={() => { setEditing(null); setAdding(true); }}>
            <Icon name="plus" size={14} /> New brew
          </button>
          <div className="user-chip-wrap">
            <button className="user-chip" onClick={() => setUserMenu((o) => !o)}>
              <span className="user-avatar">{(user.name || "?").slice(0, 1).toUpperCase()}</span>
              <span className="user-name">{(user.name || "you").split(" ")[0]}</span>
              {user.mode === "guest" && <span className="user-badge">Guest</span>}
            </button>
            {userMenu && (
              <>
                <div className="method-menu-bg" onClick={() => setUserMenu(false)} />
                <div className="user-menu">
                  <div className="user-menu-h">
                    <div className="user-menu-name">{user.name}</div>
                    <div className="user-menu-email">{user.email || "Local device only"}</div>
                  </div>
                  <button className="method-menu-item" onClick={() => { setUserMenu(false); setView({ name: "gear" }); }}>Preferences</button>
                  <button className="method-menu-item" onClick={signOut}>{user.mode === "guest" ? "Exit guest mode" : "Sign out"}</button>
                </div>
              </>
            )}
          </div>
        </nav>
      </header>

      {user.mode === "guest" && (
        <div className="guest-banner">
          <div className="shell guest-banner-inner">
            <span><strong>Guest mode.</strong> Your shelf is saved on this device only — sign in to sync across devices.</span>
            <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign in</button>
          </div>
        </div>
      )}

      {!coffeesLoaded && view.name === "dashboard" && (
        <div className="shell" style={{ padding: 32 }}>
          <p style={{ color: "var(--ink-mute)" }}>Loading your shelf…</p>
        </div>
      )}

      {coffeesLoaded && view.name === "dashboard" && (
        <Dashboard
          coffees={coffees}
          onOpen={open}
          onAdd={() => { setEditing(null); setAdding(true); }}
          onChangeMethod={onChangeMethod}
          onToggleFavorite={onToggleFavorite}
          onSearchOnline={onSearchOnline}
          user={user}
        />
      )}

      {view.name === "detail" && current && (
        <Detail
          coffee={current}
          onBack={back}
          onChangeMethod={onChangeMethod}
          onSaveBrewLog={onSaveBrewLog}
          onEdit={(c) => { setAdding(false); setEditing(c); }}
          onDelete={onDelete}
          requestAi={requestAi}
          gear={profile.gear}
        />
      )}

      {view.name === "detail" && !current && (
        <div className="shell" style={{ padding: 32 }}>
          <p>That coffee is no longer on your shelf.</p>
          <button className="btn btn-ghost btn-sm" onClick={back}><Icon name="arrow-left" size={14} /> Back to shelf</button>
        </div>
      )}

      {view.name === "log" && (
        <BrewLogView logs={logs} onOpenBean={(id) => setView({ name: "detail", id })} />
      )}

      {view.name === "gear" && (
        <GearView profile={profile} onSaveProfile={onSaveProfile} busy={profileBusy} />
      )}

      {adding && (
        <CoffeeForm
          mode="add"
          onClose={() => { setAdding(false); setPrefillSearch(""); }}
          onSubmit={(c) => { setPrefillSearch(""); return onAdd(c); }}
          onAiLookup={onAiLookupForForm}
          prefillSearch={prefillSearch}
        />
      )}
      {editing && (
        <CoffeeForm
          mode="edit"
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={onEditSave}
          onAiLookup={onAiLookupForForm}
        />
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Mood">
          <TweakSelect
            label="Theme"
            value={t.theme}
            onChange={(v) => setTweak("theme", v)}
            options={[
              { value: "default", label: "Forest" },
              { value: "sunrise", label: "Sunrise (rose gold)" },
              { value: "dusk", label: "Dusk" },
              { value: "pixel", label: "Pixel art" },
            ]}
          />
        </TweakSection>
        <TweakSection label="Background shader">
          <TweakSelect
            label="Style"
            value={t.bg}
            onChange={(v) => setTweak("bg", v)}
            options={[
              { value: "off", label: "Off" },
              { value: "aurora", label: "Aurora" },
              { value: "mesh", label: "Mesh gradient" },
              { value: "plasma", label: "Plasma" },
              { value: "waves", label: "Wave field" },
              { value: "dots", label: "Halftone" },
            ]}
          />
        </TweakSection>
        <TweakSection label="Iridescence">
          <TweakSelect
            label="Highlights"
            value={t.iri}
            onChange={(v) => setTweak("iri", v)}
            options={[
              { value: "off", label: "Off" },
              { value: "soft", label: "Soft sheen" },
              { value: "vivid", label: "Vivid" },
              { value: "rainbow", label: "Holographic" },
            ]}
          />
          <TweakRadio
            label="Specular glow"
            value={t.glow}
            onChange={(v) => setTweak("glow", v)}
            options={[
              { value: "off", label: "Off" },
              { value: "soft", label: "Soft" },
              { value: "strong", label: "Strong" },
              { value: "iri", label: "Iridescent" },
            ]}
          />
          <TweakRadio
            label="Noise grain"
            value={t.noise}
            onChange={(v) => setTweak("noise", v)}
            options={[
              { value: "off", label: "Off" },
              { value: "fine", label: "Fine" },
              { value: "medium", label: "Heavy" },
            ]}
          />
        </TweakSection>
        <TweakSection label="Card hover">
          <TweakSelect
            label="Effect"
            value={t.cardHover}
            onChange={(v) => setTweak("cardHover", v)}
            options={[
              { value: "flat", label: "Flat" },
              { value: "lift", label: "Lift" },
              { value: "tilt", label: "3D tilt" },
              { value: "iridescent", label: "Iridescent tilt" },
              { value: "glow", label: "Specular glow" },
              { value: "magnetic", label: "Magnetic" },
            ]}
          />
        </TweakSection>
        <TweakSection label="Motion">
          <TweakSelect
            label="Style"
            value={t.motion}
            onChange={(v) => setTweak("motion", v)}
            options={[
              { value: "off", label: "Off (reduced)" },
              { value: "subtle", label: "Subtle" },
              { value: "smooth", label: "Smooth" },
              { value: "playful", label: "Playful" },
              { value: "bouncy", label: "Bouncy" },
            ]}
          />
        </TweakSection>
        <TweakSection label="Voice">
          <TweakRadio
            label="Type personality"
            value={t.voice}
            onChange={(v) => setTweak("voice", v)}
            options={[
              { value: "editorial", label: "Editorial" },
              { value: "modern", label: "Modern" },
              { value: "press", label: "Letterpress" },
            ]}
          />
        </TweakSection>
        <TweakSection label="Rhythm">
          <TweakRadio
            label="Density"
            value={t.density}
            onChange={(v) => setTweak("density", v)}
            options={[
              { value: "tight", label: "Tight" },
              { value: "cozy", label: "Cozy" },
              { value: "airy", label: "Airy" },
            ]}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}
