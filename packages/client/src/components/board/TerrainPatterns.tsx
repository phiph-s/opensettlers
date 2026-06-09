import React from 'react';

/**
 * Subtle SVG texture patterns for each land terrain type.
 * Each tile is large (sparse) with few semi-transparent elements
 * so the base hex colour dominates.
 */
export function TerrainPatterns() {
  return (
    <>
      {/* ── FOREST: single layered pine, large tile (~3 trees across hex) */}
      <pattern id="pat-forest" width="40" height="46" patternUnits="userSpaceOnUse">
        <rect width="40" height="46" fill="#2d6a27" />
        <polygon points="20,4 11,20 29,20" fill="#163d14" opacity="0.55" />
        <polygon points="20,16 9,33 31,33" fill="#163d14" opacity="0.5"  />
        <rect x="18" y="33" width="4" height="7" fill="#3d2010" opacity="0.45" />
      </pattern>

      {/* ── HILLS: simple brick grid, medium tile */}
      <pattern id="pat-hills" width="30" height="16" patternUnits="userSpaceOnUse">
        <rect width="30" height="16" fill="#c44a1a" />
        {/* Mortar lines only — no filled brick shapes */}
        <line x1="0"  y1="8" x2="30" y2="8"  stroke="#7a2a08" strokeWidth="0.9" opacity="0.45" />
        <line x1="15" y1="0" x2="15" y2="8"   stroke="#7a2a08" strokeWidth="0.7" opacity="0.35" />
        <line x1="0"  y1="8" x2="0"  y2="16"  stroke="#7a2a08" strokeWidth="0.7" opacity="0.35" />
        <line x1="22" y1="8" x2="22" y2="16"  stroke="#7a2a08" strokeWidth="0.7" opacity="0.35" />
      </pattern>

      {/* ── FIELDS: single tall wheat stalk, tall sparse tile */}
      <pattern id="pat-fields" width="22" height="36" patternUnits="userSpaceOnUse">
        <rect width="22" height="36" fill="#d4b44a" />
        <line x1="11" y1="36" x2="11" y2="9" stroke="#8a6020" strokeWidth="1.4" opacity="0.55" />
        <line x1="11" y1="23" x2="7"  y2="18" stroke="#8a6020" strokeWidth="0.9" opacity="0.45" />
        <line x1="11" y1="23" x2="15" y2="18" stroke="#8a6020" strokeWidth="0.9" opacity="0.45" />
        <ellipse cx="11" cy="7" rx="2.5" ry="4.5" fill="#9a7028" opacity="0.5" />
      </pattern>

      {/* ── PASTURE: gentle arc bump at base, wide tile */}
      <pattern id="pat-pasture" width="34" height="20" patternUnits="userSpaceOnUse">
        <rect width="34" height="20" fill="#7dbb4e" />
        <ellipse cx="17" cy="23" rx="18" ry="9" fill="#449030" opacity="0.38" />
      </pattern>

      {/* ── MOUNTAINS: single clean peak + snow, large tile */}
      <pattern id="pat-mountains" width="44" height="32" patternUnits="userSpaceOnUse">
        <rect width="44" height="32" fill="#878787" />
        <polygon points="22,4 7,28 37,28"   fill="#4e4e4e" opacity="0.55" />
        <polygon points="22,4 17,13 27,13"  fill="#dcdce8" opacity="0.65" />
      </pattern>

      {/* ── DESERT: two faint undulating lines, wide tile */}
      <pattern id="pat-desert" width="30" height="18" patternUnits="userSpaceOnUse">
        <rect width="30" height="18" fill="#d9c07a" />
        <path d="M 0 6 Q 7.5 3 15 6 Q 22.5 9 30 6"
          fill="none" stroke="#b49030" strokeWidth="1" opacity="0.4" />
        <path d="M 0 13 Q 7.5 16 15 13 Q 22.5 10 30 13"
          fill="none" stroke="#b49030" strokeWidth="0.8" opacity="0.3" />
      </pattern>
    </>
  );
}
