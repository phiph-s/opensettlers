import React from 'react';

export function TerrainPatterns() {
  return (
    <>
      {/* FOREST: two staggered pine trees per tile — offset by (40, 46) */}
      <pattern id="pat-forest" width="80" height="92" patternUnits="userSpaceOnUse">
        <rect width="80" height="92" fill="#2d6a27" />
        {/* Tree 1 — upper-left */}
        <polygon points="20,4 11,20 29,20" fill="#163d14" opacity="0.55" />
        <polygon points="20,16 9,33 31,33" fill="#163d14" opacity="0.50" />
        <rect x="18" y="33" width="4" height="7" fill="#3d2010" opacity="0.45" />
        {/* Tree 2 — lower-right (staggered) */}
        <polygon points="60,50 51,66 69,66" fill="#163d14" opacity="0.55" />
        <polygon points="60,62 49,79 71,79" fill="#163d14" opacity="0.50" />
        <rect x="58" y="79" width="4" height="7" fill="#3d2010" opacity="0.45" />
      </pattern>

      {/* HILLS: brick mortar grid */}
      <pattern id="pat-hills" width="30" height="16" patternUnits="userSpaceOnUse">
        <rect width="30" height="16" fill="#c44a1a" />
        <line x1="0"  y1="8" x2="30" y2="8"  stroke="#7a2a08" strokeWidth="0.9" opacity="0.45" />
        <line x1="15" y1="0" x2="15" y2="8"   stroke="#7a2a08" strokeWidth="0.7" opacity="0.35" />
        <line x1="0"  y1="8" x2="0"  y2="16"  stroke="#7a2a08" strokeWidth="0.7" opacity="0.35" />
        <line x1="22" y1="8" x2="22" y2="16"  stroke="#7a2a08" strokeWidth="0.7" opacity="0.35" />
      </pattern>

      {/* FIELDS: two wheat stalks per tile — right column staggered down by half */}
      <pattern id="pat-fields" width="44" height="72" patternUnits="userSpaceOnUse">
        <rect width="44" height="72" fill="#d4b44a" />
        {/* Stalk 1 — left column, upper row */}
        <line x1="11" y1="36" x2="11" y2="9"  stroke="#8a6020" strokeWidth="1.4" opacity="0.55" />
        <line x1="11" y1="23" x2="7"  y2="18" stroke="#8a6020" strokeWidth="0.9" opacity="0.45" />
        <line x1="11" y1="23" x2="15" y2="18" stroke="#8a6020" strokeWidth="0.9" opacity="0.45" />
        <ellipse cx="11" cy="7"  rx="2" ry="4.5" fill="#9a7028" opacity="0.5" />
        {/* Stalk 2 — right column, lower row */}
        <line x1="33" y1="72" x2="33" y2="45" stroke="#8a6020" strokeWidth="1.4" opacity="0.55" />
        <line x1="33" y1="59" x2="29" y2="54" stroke="#8a6020" strokeWidth="0.9" opacity="0.45" />
        <line x1="33" y1="59" x2="37" y2="54" stroke="#8a6020" strokeWidth="0.9" opacity="0.45" />
        <ellipse cx="33" cy="43" rx="2" ry="4.5" fill="#9a7028" opacity="0.5" />
      </pattern>

      {/* PASTURE: rolling hills — organic bezier curves, larger than old semicircle */}
      <pattern id="pat-pasture" width="60" height="44" patternUnits="userSpaceOnUse">
        <rect width="60" height="44" fill="#7dbb4e" />
        <path d="M 0,32 C 8,14 18,18 24,26 C 30,34 36,18 44,20 C 50,22 56,30 60,32 L 60,44 L 0,44 Z"
          fill="#449030" opacity="0.42" />
        <path d="M 0,32 C 8,14 18,18 24,26 C 30,34 36,18 44,20 C 50,22 56,30 60,32"
          fill="none" stroke="#5cd040" strokeWidth="1.2" opacity="0.18" />
      </pattern>

      {/* MOUNTAINS: connected range — three peaks sharing a common base ridge */}
      <pattern id="pat-mountains" width="88" height="52" patternUnits="userSpaceOnUse">
        <rect width="88" height="52" fill="#878787" />
        {/* Mountain range silhouette */}
        <polygon points="0,52 0,38 14,16 28,36 44,4 60,30 72,15 88,38 88,52"
          fill="#4e4e4e" opacity="0.55" />
        {/* Shadow faces — left side of each peak */}
        <polygon points="0,38 14,16 10,23"   fill="#2a2a2a" opacity="0.22" />
        <polygon points="28,36 44,4 37,17"   fill="#2a2a2a" opacity="0.18" />
        <polygon points="60,30 72,15 68,22"  fill="#2a2a2a" opacity="0.18" />
        {/* Snow caps */}
        <polygon points="14,16 10,23 18,23"  fill="#dcdce8" opacity="0.50" />
        <polygon points="44,4 37,17 51,17"   fill="#dcdce8" opacity="0.65" />
        <polygon points="72,15 68,22 76,22"  fill="#dcdce8" opacity="0.50" />
      </pattern>

      {/* DESERT: undulating dune lines */}
      <pattern id="pat-desert" width="30" height="18" patternUnits="userSpaceOnUse">
        <rect width="30" height="18" fill="#d9c07a" />
        <path d="M 0 6 Q 7.5 3 15 6 Q 22.5 9 30 6"
          fill="none" stroke="#b49030" strokeWidth="1" opacity="0.4" />
        <path d="M 0 13 Q 7.5 16 15 13 Q 22.5 10 30 13"
          fill="none" stroke="#b49030" strokeWidth="0.8" opacity="0.3" />
      </pattern>

      {/* CLOUDS: soft puffball clouds on sky blue — terrain hidden until explored */}
      <pattern id="pat-clouds" width="80" height="60" patternUnits="userSpaceOnUse">
        <rect width="80" height="60" fill="#c0d8f4" />
        {/* Cloud 1 — upper-left */}
        <ellipse cx="18" cy="20" rx="12" ry="7"  fill="rgba(255,255,255,0.75)" />
        <ellipse cx="10" cy="22" rx="7"  ry="5"  fill="rgba(255,255,255,0.60)" />
        <ellipse cx="26" cy="23" rx="8"  ry="5"  fill="rgba(255,255,255,0.60)" />
        {/* Cloud 2 — lower-right */}
        <ellipse cx="58" cy="42" rx="14" ry="8"  fill="rgba(255,255,255,0.70)" />
        <ellipse cx="47" cy="45" rx="8"  ry="5"  fill="rgba(255,255,255,0.55)" />
        <ellipse cx="68" cy="45" rx="9"  ry="5.5" fill="rgba(255,255,255,0.55)" />
        {/* Subtle shadow on underside */}
        <ellipse cx="18" cy="25" rx="11" ry="3"  fill="rgba(180,200,230,0.30)" />
        <ellipse cx="58" cy="48" rx="13" ry="3"  fill="rgba(180,200,230,0.25)" />
      </pattern>

      {/* GOLD: gleaming coins on dark amber — free resource selection */}
      <pattern id="pat-gold" width="60" height="52" patternUnits="userSpaceOnUse">
        <rect width="60" height="52" fill="#b8860b" />
        {/* Radial shimmer */}
        <circle cx="30" cy="26" r="22" fill="rgba(255,220,60,0.12)" />
        {/* Coin 1 — upper-left */}
        <circle cx="16" cy="16" r="9" fill="#e8c030" />
        <circle cx="16" cy="16" r="9" fill="none" stroke="#c8980a" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="6" fill="none" stroke="rgba(255,255,180,0.4)" strokeWidth="0.8" />
        <text x="16" y="20" textAnchor="middle" fontSize="8" fill="#8a5a00" fontWeight="bold">✦</text>
        {/* Coin 2 — lower-right */}
        <circle cx="44" cy="36" r="9" fill="#e8c030" />
        <circle cx="44" cy="36" r="9" fill="none" stroke="#c8980a" strokeWidth="1.5" />
        <circle cx="44" cy="36" r="6" fill="none" stroke="rgba(255,255,180,0.4)" strokeWidth="0.8" />
        <text x="44" y="40" textAnchor="middle" fontSize="8" fill="#8a5a00" fontWeight="bold">✦</text>
        {/* Glint highlights */}
        <circle cx="12" cy="12" r="2" fill="rgba(255,255,220,0.7)" />
        <circle cx="40" cy="32" r="2" fill="rgba(255,255,220,0.7)" />
      </pattern>
    </>
  );
}
