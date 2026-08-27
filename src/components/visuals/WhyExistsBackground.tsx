import React from "react";

export default function WhyExistsBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden select-none"
    >
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.09]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 600"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="scatter-center" cx="30%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#4338CA" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#2D5A27" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#1A1A18" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Radial mesh center */}
        <rect width="100%" height="100%" fill="url(#scatter-center)" />

        {/* Dispersal/scattering lines radiating from public indexing tracker */}
        <g stroke="#1A1A18" strokeWidth="0.75" strokeOpacity="0.3">
          <line x1="360" y1="300" x2="80" y2="120" strokeDasharray="3 6" />
          <line x1="360" y1="300" x2="160" y2="480" strokeDasharray="2 4" />
          <line x1="360" y1="300" x2="680" y2="100" strokeDasharray="4 8" />
          <line x1="360" y1="300" x2="840" y2="240" strokeDasharray="2 5" />
          <line x1="360" y1="300" x2="760" y2="460" strokeDasharray="3 7" />
          <line x1="360" y1="300" x2="1020" y2="340" strokeDasharray="4 6" />
        </g>

        {/* Dispersed data packet dots */}
        <g fill="#1A1A18" fillOpacity="0.4">
          <circle cx="80" cy="120" r="2.5" />
          <circle cx="160" cy="480" r="2" />
          <circle cx="680" cy="100" r="3" />
          <circle cx="840" cy="240" r="2.5" />
          <circle cx="760" cy="460" r="2" />
          <circle cx="1020" cy="340" r="3" />
          <circle cx="360" cy="300" r="4" fill="#4338CA" fillOpacity="0.7" />
        </g>
      </svg>
      {/* Gentle boundary fade */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FAFAF8] via-transparent to-[#FAFAF8]" />
    </div>
  );
}
