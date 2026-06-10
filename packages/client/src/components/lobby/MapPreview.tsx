import React from 'react';

interface PreviewHex { q: number; r: number; terrain?: string }
interface Props { hexes: PreviewHex[]; width: number; height: number; dark?: boolean }

function hexToPixel(q: number, r: number, size: number) {
  return {
    x: size * Math.sqrt(3) * (q + r / 2),
    y: size * 1.5 * r,
  };
}

function hexCorners(cx: number, cy: number, size: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    pts.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

export function MapPreview({ hexes, width, height, dark = false }: Props) {
  if (!hexes || hexes.length === 0) return null;

  const positions = hexes.map((h) => hexToPixel(h.q, h.r, 1));
  const xs = positions.map((p) => p.x);
  const ys = positions.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const pad = 0.12;
  const scale = Math.min(
    (width * (1 - pad * 2)) / (rangeX + Math.sqrt(3)),
    (height * (1 - pad * 2)) / (rangeY + 2),
  );
  const hexSize = scale;
  const offsetX = width / 2 - ((minX + maxX) / 2) * scale;
  const offsetY = height / 2 - ((minY + maxY) / 2) * scale;

  // Greyscale: light mode → normal=dark, clouds=light, desert=border-only
  //            dark mode  → normal=light, clouds=dark, desert=border-only
  const normalFill  = dark ? '#b0b0b0' : '#787878';
  const cloudFill   = dark ? '#383838' : '#c8c8c8';
  const desertStroke = dark ? '#686868' : '#909090';

  return (
    <svg width={width} height={height} style={{ display: 'block', pointerEvents: 'none' }}>
      {hexes.map((h, i) => {
        const px = hexToPixel(h.q, h.r, hexSize);
        const cx = px.x + offsetX;
        const cy = px.y + offsetY;
        const isDesert = h.terrain === 'desert';
        const isClouds = h.terrain === 'clouds';
        return (
          <polygon
            key={i}
            points={hexCorners(cx, cy, hexSize * 0.9)}
            fill={isDesert ? 'none' : isClouds ? cloudFill : normalFill}
            stroke={isDesert ? desertStroke : 'none'}
            strokeWidth={isDesert ? 1 : 0}
          />
        );
      })}
    </svg>
  );
}
