import { useMemo, useState } from "react";
import { Icon, MethodIcon } from "./Icons.jsx";
import { BREW_METHODS, adjustRecipe } from "../lib/data.js";
import { CircularTimer } from "./Timer.jsx";
import { resolveGrinder, convertClicks, formatClicks } from "../lib/grinders.js";

// Convert a "3:00" / "0:28" / "16:00:00" recipe time into seconds for the
// timer's target. Lets the ring sweep around the right amount per method.
function recipeTimeToSeconds(s) {
  if (!s) return 180;
  const bits = String(s).split(":").map((n) => parseInt(n, 10)).filter((n) => !isNaN(n));
  if (bits.length === 3) return bits[0] * 3600 + bits[1] * 60 + bits[2];
  if (bits.length === 2) return bits[0] * 60 + bits[1];
  if (bits.length === 1) return bits[0];
  return 180;
}

export function Dashboard({ coffees, onOpen, onAdd, onChangeMethod, onToggleFavorite, onSearchOnline, user, gear, timer, onTimerStart, onTimerPause, onTimerReset }) {
  // Resolve once per render. Cards inherit it via a closure rather than
  // each running its own resolution.
  const grinderScale = resolveGrinder(gear?.grinder, gear?.grinderScale);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let list = coffees;
    if (filter === "fav") list = list.filter((c) => c.favorite);
    else if (filter !== "all") list = list.filter((c) => c.roast === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((c) =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.roaster || "").toLowerCase().includes(q) ||
        (c.origin || "").toLowerCase().includes(q) ||
        (c.process || "").toLowerCase().includes(q) ||
        (c.notes || []).some((n) => (n || "").toLowerCase().includes(q))
      );
    }
    return list;
  }, [coffees, filter, query]);

  const totalBrews = useMemo(() => coffees.reduce((acc, c) => acc + ((c.brewLog && c.brewLog.length) || 0), 0), [coffees]);
  const lastAdd = coffees.length > 0 ? coffees[coffees.length - 1].roastDate : "—";
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="shell">
      <section className="hero">
        <div>
          <div className="eyebrow">
            {user && user.mode === "guest"
              ? "Guest shelf · local to this device"
              : new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <h1>{greeting}, <em>{user ? (user.name || "you").split(" ")[0] : "you"}</em>.</h1>
          <p className="hero-sub">
            {coffees.length === 0
              ? "Your shelf is empty — log your first bag to get a tuned recipe."
              : `${coffees.length} bean${coffees.length === 1 ? "" : "s"} on the shelf — freshest is ${coffees[coffees.length - 1].name}. Pull a card to see its cheat sheet, or log something new.`}
          </p>
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="num">{coffees.length.toString().padStart(2, "0")}</div>
            <div className="lbl">Beans on shelf</div>
          </div>
          <div className="hero-stat">
            <div className="num">{totalBrews}</div>
            <div className="lbl">Cups logged</div>
          </div>
          <div className="hero-stat">
            <div className="num">{lastAdd && lastAdd !== "—" ? lastAdd.slice(5).replace("-", "/") : "—"}</div>
            <div className="lbl">Last roast date</div>
          </div>
        </div>
      </section>

      <section className="filter-row">
        <div className="chips">
          {[
            { k: "all", l: "All beans" },
            { k: "fav", l: "★ Favorites" },
            { k: "light", l: "Light" },
            { k: "medium-light", l: "Medium-light" },
            { k: "medium", l: "Medium" },
            { k: "medium-dark", l: "Medium-dark" },
            { k: "dark", l: "Dark" },
          ].map((c) => (
            <button key={c.k} className={`chip ${filter === c.k ? "active" : ""}`} onClick={() => setFilter(c.k)}>{c.l}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="dash-search" style={{
            display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 40,
            border: "1px solid var(--line)", borderRadius: "var(--radius)",
            background: "var(--paper-2)", color: "var(--ink-soft)",
          }}>
            <Icon name="search" size={14} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && query.trim() && filtered.length === 0 && onSearchOnline) onSearchOnline(query.trim()); }}
              placeholder="Search shelf or roasters…"
              style={{ border: 0, outline: 0, background: "transparent", color: "inherit", font: "inherit", width: 200 }}
            />
          </div>
          <button className="btn btn-primary" onClick={onAdd}>
            <Icon name="plus" size={16} /> Log a coffee
          </button>
        </div>
      </section>

      <section className="grid">
        {filtered.map((c) => (
          <CoffeeCard
            key={c.id}
            coffee={c}
            onOpen={() => onOpen(c.id)}
            onChangeMethod={(mid) => onChangeMethod(c.id, mid)}
            onToggleFavorite={() => onToggleFavorite(c.id)}
            grinderScale={grinderScale}
            timer={timer}
            onTimerStart={onTimerStart}
            onTimerPause={onTimerPause}
            onTimerReset={onTimerReset}
          />
        ))}
        <button className="card-add" onClick={onAdd}>
          <div>
            <div className="plus">+</div>
            <div className="lbl">Log a new coffee</div>
          </div>
        </button>
        {filtered.length === 0 && coffees.length > 0 && (
          <div style={{ gridColumn: "1 / -1", padding: 32, textAlign: "center", color: "var(--ink-mute)" }}>
            No matches for “{query}” in this filter.
            {onSearchOnline && query.trim() && (
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-amber btn-sm" onClick={() => onSearchOnline(query.trim())}>
                  Search online for “{query.trim()}”
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function CoffeeCard({ coffee, onOpen, onChangeMethod, onToggleFavorite, grinderScale, timer, onTimerStart, onTimerPause, onTimerReset }) {
  const [openMenu, setOpenMenu] = useState(false);
  const method = BREW_METHODS.find((m) => m.id === coffee.method) || BREW_METHODS[0];
  const recipe = adjustRecipe(method, coffee);
  const stop = (e) => e.stopPropagation();
  const pick = (e, id) => { e.stopPropagation(); onChangeMethod(id); setOpenMenu(false); };
  const targetSec = recipeTimeToSeconds(recipe.time);
  // Translate recipe's Comandante-reference clicks to the user's grinder.
  const displayClicks = grinderScale ? convertClicks(recipe.clicks, grinderScale) : recipe.clicks;

  return (
    <article className="card" style={{ "--accent": coffee.accent, alignItems: "stretch", borderRadius: "18px" }} onClick={onOpen}>
      <div className="card-stamp">
        <span>{(coffee.stamp || "Single Origin").split(" · ").map((l, i) => <div key={i}>{l}</div>)}</span>
      </div>
      {/* Circular brew timer fills the empty top-right region under the stamp.
          State is shared with App / Detail so starting the timer here keeps
          ticking when the user opens the full cheat sheet. */}
      <div className="card-timer-slot" onClick={stop}>
        <CircularTimer
          timer={timer}
          coffeeId={coffee.id}
          methodId={method.id}
          targetSec={targetSec}
          steps={method.steps}
          onStart={onTimerStart}
          onPause={onTimerPause}
          onReset={onTimerReset}
          size={120}
        />
      </div>
      <div className="card-roaster">{coffee.roaster}</div>
      <h2 className="card-name">{coffee.name}</h2>
      <div className="card-origin">
        <span>{coffee.origin}</span>
        <span className="dot" />
        <span>{coffee.process}</span>
      </div>
      <div className="card-tags">
        <span className="tag tag-forest">{coffee.roast}</span>
        {(coffee.notes || []).slice(0, 2).map((n) => <span key={n} className="tag">{n}</span>)}
      </div>
      <div className="card-divider" />
      <div className="card-grind">
        <div className="card-grind-main">
          <div className="l">Grind · {grinderScale?.name || "Comandante C40"}</div>
          <div className="v">
            {formatClicks(displayClicks, grinderScale)}
            {grinderScale?.fmt === "decimal-1" ? null : <span className="u"> clicks</span>}
            <span className="grind-desc"> · {recipe.grind}</span>
          </div>
        </div>
      </div>
      <div className="card-cheat">
        <div className="cheat-item"><div className="v">{recipe.dose}<span className="mono" style={{ fontSize: 11, opacity: 0.6 }}>g</span></div><div className="l">Dose</div></div>
        <div className="cheat-item"><div className="v">1:{recipe.ratio}</div><div className="l">Ratio</div></div>
        <div className="cheat-item"><div className="v">{recipe.temp}<span className="mono" style={{ fontSize: 11, opacity: 0.6 }}>°</span></div><div className="l">Temp</div></div>
        <div className="cheat-item"><div className="v">{recipe.time}</div><div className="l">Time</div></div>
      </div>
      <div className="card-foot">
        <button
          className={`card-fav ${coffee.favorite ? "is-fav" : ""}`}
          onClick={(e) => { stop(e); onToggleFavorite(); }}
          title={coffee.favorite ? "Unfavorite" : "Favorite"}
          aria-label="Toggle favorite"
          style={{
            border: 0, background: "transparent",
            color: coffee.favorite ? "var(--amber-500)" : "var(--ink-mute)",
            cursor: "pointer", padding: 6, lineHeight: 0,
            marginRight: 6,
          }}
        >
          <Icon name="star" size={18} stroke={coffee.favorite ? 0 : 1.6} />
        </button>
        <div className="method-switch" onClick={stop}>
          <button className={`method-badge-btn ${openMenu ? "open" : ""}`} onClick={(e) => { stop(e); setOpenMenu((o) => !o); }}>
            <span className="method-icon"><MethodIcon id={method.id} /></span>
            {method.short}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2, opacity: 0.6, transform: openMenu ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
              <path d="M2 4l3 3 3-3" />
            </svg>
          </button>
          {openMenu && (
            <>
              <div className="method-menu-bg" onClick={(e) => { stop(e); setOpenMenu(false); }} />
              <div className="method-menu" onClick={stop}>
                <div className="method-menu-h">Switch brew method</div>
                {BREW_METHODS.map((m) => (
                  <button key={m.id} className={`method-menu-item ${m.id === method.id ? "active" : ""}`} onClick={(e) => pick(e, m.id)}>
                    <span className="method-icon"><MethodIcon id={m.id} size={14} /></span>
                    <span>{m.short}</span>
                    {m.id === method.id && <span className="check">✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <span
          className="open-hint"
          onClick={stop}
          style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-mute)", letterSpacing: "0.1em", cursor: "pointer" }}
          onClickCapture={(e) => { e.stopPropagation(); onOpen && onOpen(); }}
        >
          OPEN →
        </span>
      </div>
    </article>
  );
}
