import React from "react";

export default function HeroBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden select-none"
    >
      <svg
        className="absolute inset-0 h-full w-full opacity-15"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 800"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="hero-node-glow-green" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2D5A27" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#2D5A27" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hero-node-glow-indigo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4338CA" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4338CA" stopOpacity="0" />
          </radialGradient>
          <pattern
            id="hero-grid-pattern"
            width="64"
            height="64"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 64 0 L 0 0 0 64"
              fill="none"
              stroke="#1A1A18"
              strokeWidth="0.5"
              strokeOpacity="0.15"
            />
            <circle cx="0" cy="0" r="1.5" fill="#1A1A18" fillOpacity="0.25" />
          </pattern>
        </defs>

        {/* Public Lattice Mesh */}
        <rect width="100%" height="100%" fill="url(#hero-grid-pattern)" />

        {/* Concealed / Protected Value Paths */}
        <g stroke="#2D5A27" strokeWidth="1" strokeOpacity="0.35" strokeDasharray="4 4">
          <path d="M 220,160 L 480,240 L 720,180 L 980,320 L 1260,260" />
          <path d="M 340,480 L 580,380 L 860,460 L 1140,360" />
          <path d="M 480,240 L 580,380" />
          <path d="M 720,180 L 860,460" />
          <path d="M 980,320 L 1140,360" />
        </g>

        {/* Highlighted Private State Nodes */}
        <circle cx="480" cy="240" r="36" fill="url(#hero-node-glow-green)" />
        <circle cx="480" cy="240" r="4" fill="#2D5A27" fillOpacity="0.8" />
        <circle cx="480" cy="240" r="8" stroke="#2D5A27" strokeWidth="1" strokeOpacity="0.6" />

        <circle cx="720" cy="180" r="48" fill="url(#hero-node-glow-indigo)" />
        <circle cx="720" cy="180" r="5" fill="#4338CA" fillOpacity="0.8" />
        <circle cx="720" cy="180" r="12" stroke="#4338CA" strokeWidth="1" strokeOpacity="0.5" />

        <circle cx="860" cy="460" r="40" fill="url(#hero-node-glow-green)" />
        <circle cx="860" cy="460" r="4" fill="#2D5A27" fillOpacity="0.8" />
        <circle cx="860" cy="460" r="9" stroke="#2D5A27" strokeWidth="1" strokeOpacity="0.6" />

        <circle cx="1140" cy="360" r="44" fill="url(#hero-node-glow-indigo)" />
        <circle cx="1140" cy="360" r="5" fill="#4338CA" fillOpacity="0.8" />
        <circle cx="1140" cy="360" r="11" stroke="#4338CA" strokeWidth="1" strokeOpacity="0.5" />

        {/* Faint coordinate markers */}
        <text x="495" y="235" fill="#1A1A18" fillOpacity="0.3" fontSize="9" fontFamily="monospace">STRK20:0x1</text>
        <text x="735" y="175" fill="#1A1A18" fillOpacity="0.3" fontSize="9" fontFamily="monospace">EXEC:0x02</text>
        <text x="875" y="455" fill="#1A1A18" fillOpacity="0.3" fontSize="9" fontFamily="monospace">SHIELD:0x4</text>
      </svg>

      {/* Contrast Scrim overlay to guarantee WCAG AA legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FAFAF8]/70 via-transparent to-[#FAFAF8]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#FAFAF8]/90 via-[#FAFAF8]/40 to-[#FAFAF8]/90" />
    </div>
  );
}
