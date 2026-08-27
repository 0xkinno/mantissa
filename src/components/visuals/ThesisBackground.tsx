import React from "react";

export default function ThesisBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden select-none"
    >
      <svg
        className="absolute inset-0 h-full w-full opacity-10"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 500"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="plane-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2D5A27" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#4338CA" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Concentric / Overlapping Arcs */}
        <g stroke="#1A1A18" strokeWidth="1" strokeOpacity="0.4">
          <ellipse cx="600" cy="550" rx="350" ry="200" fill="none" strokeDasharray="6 4" />
          <ellipse cx="600" cy="550" rx="550" ry="320" fill="none" />
          <ellipse cx="600" cy="550" rx="750" ry="440" fill="none" strokeDasharray="3 6" />
          <ellipse cx="600" cy="550" rx="950" ry="560" fill="none" strokeOpacity="0.2" />
        </g>

        {/* Translucent Privacy Layer Planes */}
        <polygon
          points="200,420 500,280 1000,340 700,480"
          fill="url(#plane-grad-1)"
          stroke="#2D5A27"
          strokeWidth="0.75"
          strokeOpacity="0.3"
        />
        <polygon
          points="260,360 560,220 1060,280 760,420"
          fill="none"
          stroke="#4338CA"
          strokeWidth="0.75"
          strokeOpacity="0.25"
          strokeDasharray="4 4"
        />

        {/* Tangent baseline */}
        <line x1="100" y1="460" x2="1100" y2="460" stroke="#1A1A18" strokeWidth="0.5" strokeOpacity="0.3" />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-b from-[#FAFAF8] via-transparent to-[#FAFAF8]" />
    </div>
  );
}
