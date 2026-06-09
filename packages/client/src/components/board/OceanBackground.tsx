import React from 'react';

/**
 * Full-screen fixed animated ocean background.
 * Rendered behind everything else (z-index -1).
 */
export function OceanBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, background: '#1a6b9a' }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        style={{ display: 'block' }}
      >
        <defs>
          <pattern
            id="oceanWavesBg"
            x="0" y="0"
            width="120" height="60"
            patternUnits="userSpaceOnUse"
          >
            {/* @ts-ignore — animateTransform is valid SVG */}
            <animateTransform
              attributeName="patternTransform"
              type="translate"
              from="0 0"
              to="-120 0"
              dur="7s"
              repeatCount="indefinite"
            />
            <path d="M 0 22 C 30 12, 90 32, 120 22" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 0 44 C 40 54, 80 34, 120 44" fill="none" stroke="rgba(255,255,255,0.11)" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M 0 10 C 20 6, 100 14, 120 10"  fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M 0 54 C 60 48, 80 60, 120 54"  fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"   strokeLinecap="round" />
          </pattern>
        </defs>
        <rect width="1200" height="800" fill="url(#oceanWavesBg)" />
      </svg>
    </div>
  );
}
