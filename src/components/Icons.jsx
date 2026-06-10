// Icons + small components shared across views
export const Icon = ({ name, size = 18, stroke = 1.6 }) => {
  const s = {
    width: size,
    height: size,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  switch (name) {
    case "v60":
      return (<svg viewBox="0 0 24 24" {...s}><path d="M4 7h16l-7 11h-2L4 7z"/><path d="M9 7v3"/><path d="M15 7v3"/></svg>);
    case "aero":
      return (<svg viewBox="0 0 24 24" {...s}><rect x="7" y="3" width="10" height="14" rx="1.5"/><path d="M9 17v3h6v-3"/><path d="M7 8h10"/></svg>);
    case "press":
      return (<svg viewBox="0 0 24 24" {...s}><rect x="6" y="4" width="12" height="17" rx="1.5"/><path d="M6 10h12"/><path d="M12 4v-2"/><path d="M9 2h6"/></svg>);
    case "esp":
      return (<svg viewBox="0 0 24 24" {...s}><path d="M5 9h12v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9z"/><path d="M17 11h2a2 2 0 0 1 0 4h-2"/><path d="M8 4v3M12 4v3"/></svg>);
    case "chemex":
      return (<svg viewBox="0 0 24 24" {...s}><path d="M9 3h6v5l4 8a4 4 0 0 1-4 5H9a4 4 0 0 1-4-5l4-8V3z"/><path d="M8 12h8"/></svg>);
    case "moka":
      return (<svg viewBox="0 0 24 24" {...s}><path d="M5 11h11l3-3v6l-3-3"/><path d="M5 11v8a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-8"/><path d="M9 6h6l-1 5h-4z"/></svg>);
    case "cold":
      return (<svg viewBox="0 0 24 24" {...s}><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 9h6M9 13h6M9 17h3"/></svg>);
    case "plus":
      return (<svg viewBox="0 0 24 24" {...s}><path d="M12 5v14M5 12h14"/></svg>);
    case "arrow-left":
      return (<svg viewBox="0 0 24 24" {...s}><path d="M15 18l-6-6 6-6"/></svg>);
    case "arrow-right":
      return (<svg viewBox="0 0 24 24" {...s}><path d="M9 18l6-6-6-6"/></svg>);
    case "x":
      return (<svg viewBox="0 0 24 24" {...s}><path d="M18 6L6 18M6 6l12 12"/></svg>);
    case "filter":
      return (<svg viewBox="0 0 24 24" {...s}><path d="M3 5h18M6 12h12M10 19h4"/></svg>);
    case "leaf":
      return (<svg viewBox="0 0 24 24" {...s}><path d="M5 19c0-9 7-14 15-14 0 8-5 15-14 15-1 0-1-.5-1-1z"/><path d="M5 19l9-9"/></svg>);
    case "thermometer":
      return (<svg viewBox="0 0 24 24" {...s}><path d="M12 14V5a2 2 0 1 1 4 0v9a4 4 0 1 1-4 0z"/></svg>);
    case "scale":
      return (<svg viewBox="0 0 24 24" {...s}><path d="M4 21h16M12 3v18"/><path d="M5 9l3-6 3 6a3 3 0 0 1-6 0z"/><path d="M13 9l3-6 3 6a3 3 0 0 1-6 0z"/></svg>);
    case "edit":
      return (<svg viewBox="0 0 24 24" {...s}><path d="M4 20h4l11-11-4-4L4 16v4z"/></svg>);
    case "trash":
      return (<svg viewBox="0 0 24 24" {...s}><path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M10 11v7M14 11v7"/></svg>);
    case "star":
      return (<svg viewBox="0 0 24 24" {...s}><path d="M12 2.5l3 6.5 7 1-5 4.5 1.5 7-6.5-3.5L5.5 21.5 7 14.5 2 10l7-1z"/></svg>);
    case "search":
      return (<svg viewBox="0 0 24 24" {...s}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></svg>);
    case "list":
      return (<svg viewBox="0 0 24 24" {...s}><path d="M8 6h12M8 12h12M8 18h12"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>);
    case "settings":
      return (<svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>);
    case "cup":
      return (<svg viewBox="0 0 24 24" {...s}><path d="M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V8z"/><path d="M17 10h2a3 3 0 0 1 0 6h-2"/><path d="M8 3c0 1.5 2 1.5 2 3M12 3c0 1.5 2 1.5 2 3"/></svg>);
    case "sparkle":
      return (<svg viewBox="0 0 24 24" {...s}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l2.8 2.8M15.7 15.7l2.8 2.8M18.5 5.5l-2.8 2.8M8.3 15.7l-2.8 2.8"/></svg>);
    case "sun":
      return (<svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>);
    case "moon":
      return (<svg viewBox="0 0 24 24" {...s}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>);
    default:
      return null;
  }
};

export const ContourLines = ({ className }) => (
  <svg className={className} viewBox="0 0 600 400" preserveAspectRatio="none">
    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
      <path
        key={i}
        d={`M0,${60 + i * 40} Q150,${20 + i * 40} 300,${50 + i * 40} T600,${40 + i * 40}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
    ))}
  </svg>
);

export const MethodIcon = ({ id, size = 18 }) => {
  const map = { v60: "v60", aeropress: "aero", french: "press", espresso: "esp", chemex: "chemex", moka: "moka", cold: "cold" };
  return <Icon name={map[id] || "cup"} size={size} />;
};

export const BrandMark = ({ size = 34 }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} fill="none">
    <path d="M20 6c-3.5 3.5-6 6-6 9.5 0 2.4 2.5 4 6 4s6-1.6 6-4c0-3.5-2.5-6-6-9.5z" fill="currentColor" />
    <path d="M20 14c-2.8 2.8-4.6 4.6-4.6 6.8 0 1.8 2 3.2 4.6 3.2s4.6-1.4 4.6-3.2c0-2.2-1.8-4-4.6-6.8z" fill="currentColor" />
    <path d="M20 21c-2 2-3.4 3.4-3.4 5 0 1.4 1.5 2.4 3.4 2.4s3.4-1 3.4-2.4c0-1.6-1.4-3-3.4-5z" fill="currentColor" />
    <path d="M20 27v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
