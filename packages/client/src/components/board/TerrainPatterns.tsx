import React from 'react';

/**
 * SVG pattern defs for each land terrain type.
 * Render these inside the <defs> element of the board SVG.
 * patternUnits="userSpaceOnUse" — tile in SVG user coordinates.
 * The hex size prop is 70, so each hex is ~140 units wide.
 */
export function TerrainPatterns() {
  return (
    <>
      {/* ── FOREST ─────────────────────────────────────────────────────
          Layered pine tree silhouettes, dark green palette.
          Tile: 20×24. ~7 trees across a hex. */}
      <pattern id="pat-forest" width="20" height="24" patternUnits="userSpaceOnUse">
        <rect width="20" height="24" fill="#2d6a27" />
        {/* Three triangle layers — classic pine tree */}
        <polygon points="10,0 5,8 15,8"   fill="#1a4518" />
        <polygon points="10,5 3,14 17,14" fill="#245c1e" />
        <polygon points="10,11 1,21 19,21" fill="#1a4518" />
        {/* Trunk */}
        <rect x="9" y="21" width="2" height="4" fill="#5c3820" />
      </pattern>

      {/* ── HILLS (brick) ──────────────────────────────────────────────
          Classic brick-course rows, reddish clay palette.
          Tile: 24×14. */}
      <pattern id="pat-hills" width="24" height="14" patternUnits="userSpaceOnUse">
        <rect width="24" height="14" fill="#c44a1a" />
        {/* Horizontal mortar line */}
        <line x1="0" y1="7" x2="24" y2="7" stroke="#7a2a08" strokeWidth="1.2" />
        {/* Top brick row */}
        <rect x="1"  y="1" width="10" height="5" fill="#b03810" rx="0.5" />
        <rect x="13" y="1" width="10" height="5" fill="#a83210" rx="0.5" />
        {/* Bottom brick row — offset by half brick */}
        <rect x="-5" y="8" width="10" height="5" fill="#aa3812" rx="0.5" />
        <rect x="7"  y="8" width="10" height="5" fill="#b03a12" rx="0.5" />
        <rect x="19" y="8" width="10" height="5" fill="#aa3812" rx="0.5" />
        {/* Vertical mortar seams — top row */}
        <line x1="12" y1="0" x2="12" y2="7"  stroke="#7a2a08" strokeWidth="0.8" />
        {/* Vertical mortar seams — bottom row */}
        <line x1="6"  y1="7" x2="6"  y2="14" stroke="#7a2a08" strokeWidth="0.8" />
        <line x1="18" y1="7" x2="18" y2="14" stroke="#7a2a08" strokeWidth="0.8" />
      </pattern>

      {/* ── FIELDS (wheat) ─────────────────────────────────────────────
          Two offset wheat stalks with diagonal leaf strokes and grain heads.
          Tile: 14×22. */}
      <pattern id="pat-fields" width="14" height="22" patternUnits="userSpaceOnUse">
        <rect width="14" height="22" fill="#d4b44a" />
        {/* — Stalk A at x=4, full height — */}
        <line x1="4" y1="22" x2="4" y2="4"  stroke="#8a6020" strokeWidth="1.4" />
        {/* Leaves */}
        <line x1="4" y1="16" x2="1" y2="12" stroke="#7a5818" strokeWidth="0.9" />
        <line x1="4" y1="16" x2="7" y2="12" stroke="#7a5818" strokeWidth="0.9" />
        <line x1="4" y1="11" x2="1" y2="7"  stroke="#7a5818" strokeWidth="0.9" />
        <line x1="4" y1="11" x2="7" y2="7"  stroke="#7a5818" strokeWidth="0.9" />
        {/* Grain head — tight oval */}
        <ellipse cx="4" cy="3" rx="1.8" ry="3" fill="#9a7028" />
        {/* Grain bristles */}
        <line x1="4" y1="1" x2="3" y2="-1" stroke="#9a7028" strokeWidth="0.7" />
        <line x1="4" y1="1" x2="5" y2="-1" stroke="#9a7028" strokeWidth="0.7" />
        {/* — Stalk B at x=11, shorter (starts mid-tile) — */}
        <line x1="11" y1="22" x2="11" y2="9"  stroke="#8a6020" strokeWidth="1.4" />
        <line x1="11" y1="17" x2="8"  y2="13" stroke="#7a5818" strokeWidth="0.9" />
        <line x1="11" y1="17" x2="14" y2="13" stroke="#7a5818" strokeWidth="0.9" />
        <line x1="11" y1="13" x2="8"  y2="9"  stroke="#7a5818" strokeWidth="0.9" />
        <line x1="11" y1="13" x2="14" y2="9"  stroke="#7a5818" strokeWidth="0.9" />
        {/* Grain head B */}
        <ellipse cx="11" cy="8" rx="1.8" ry="3" fill="#9a7028" />
        <line x1="11" y1="6" x2="10" y2="4" stroke="#9a7028" strokeWidth="0.7" />
        <line x1="11" y1="6" x2="12" y2="4" stroke="#9a7028" strokeWidth="0.7" />
      </pattern>

      {/* ── PASTURE (sheep/grass) ──────────────────────────────────────
          Rolling rounded grass tufts / bumps, bright green palette.
          Tile: 20×14. */}
      <pattern id="pat-pasture" width="20" height="14" patternUnits="userSpaceOnUse">
        <rect width="20" height="14" fill="#7dbb4e" />
        {/* Grassy bumps — darker ellipses rising from ground line */}
        <ellipse cx="4"  cy="13" rx="7" ry="5" fill="#5aa336" />
        <ellipse cx="16" cy="11" rx="6" ry="4" fill="#62b040" />
        <ellipse cx="10" cy="14" rx="5" ry="3" fill="#50992e" />
        {/* Bright highlight spots */}
        <circle cx="3"  cy="9" r="1.4" fill="#96d85e" opacity="0.55" />
        <circle cx="15" cy="8" r="1.1" fill="#96d85e" opacity="0.45" />
        {/* Small grass blade cluster */}
        <line x1="9"  y1="10" x2="8"  y2="6" stroke="#449030" strokeWidth="1" />
        <line x1="10" y1="10" x2="10" y2="5" stroke="#449030" strokeWidth="1" />
        <line x1="11" y1="10" x2="12" y2="6" stroke="#449030" strokeWidth="1" />
      </pattern>

      {/* ── MOUNTAINS (ore) ────────────────────────────────────────────
          Two mountain peaks with snow caps, rock-face crack lines.
          Tile: 30×22. */}
      <pattern id="pat-mountains" width="30" height="22" patternUnits="userSpaceOnUse">
        <rect width="30" height="22" fill="#878787" />
        {/* Far mountain — slightly lighter, behind */}
        <polygon points="21,4 13,20 30,20" fill="#707070" />
        {/* Main mountain */}
        <polygon points="10,2 1,20 19,20"  fill="#5e5e5e" />
        {/* Snow caps */}
        <polygon points="10,2 7,9 13,9"    fill="#e2e2ea" />
        <polygon points="21,4 18,10 24,10" fill="#d8d8e4" />
        {/* Rock-face crack lines on main mountain */}
        <line x1="10" y1="9"  x2="7"  y2="15" stroke="#4a4a4a" strokeWidth="0.8" opacity="0.7" />
        <line x1="10" y1="9"  x2="13" y2="14" stroke="#4a4a4a" strokeWidth="0.8" opacity="0.7" />
        <line x1="6"  y1="15" x2="5"  y2="20" stroke="#4a4a4a" strokeWidth="0.6" opacity="0.5" />
        {/* Far mountain crack */}
        <line x1="21" y1="10" x2="19" y2="16" stroke="#5a5a5a" strokeWidth="0.7" opacity="0.6" />
      </pattern>

      {/* ── DESERT ─────────────────────────────────────────────────────
          Undulating sand ripple curves + scattered pebble dots.
          Tile: 22×14. */}
      <pattern id="pat-desert" width="22" height="14" patternUnits="userSpaceOnUse">
        <rect width="22" height="14" fill="#d9c07a" />
        {/* Sand ripple 1 — shallow S-curve */}
        <path
          d="M 0 4 Q 5.5 1 11 4 Q 16.5 7 22 4"
          fill="none" stroke="#c4a850" strokeWidth="1.2" opacity="0.65"
        />
        {/* Sand ripple 2 */}
        <path
          d="M 0 10 Q 5.5 13 11 10 Q 16.5 7 22 10"
          fill="none" stroke="#c4a850" strokeWidth="1" opacity="0.5"
        />
        {/* Pebble/grain dots */}
        <circle cx="3.5" cy="7" r="0.9" fill="#b49040" opacity="0.55" />
        <circle cx="8"   cy="7" r="0.7" fill="#b49040" opacity="0.45" />
        <circle cx="14"  cy="7" r="0.9" fill="#b49040" opacity="0.55" />
        <circle cx="19"  cy="7" r="0.7" fill="#b49040" opacity="0.45" />
        {/* Occasional larger pebble */}
        <ellipse cx="11" cy="7" rx="1.2" ry="0.8" fill="#c4a050" opacity="0.4" />
      </pattern>
    </>
  );
}
