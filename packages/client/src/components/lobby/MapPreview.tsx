import React from 'react';

interface PreviewHex { q: number; r: number; terrain?: string }
interface Props { hexes: PreviewHex[]; width: number; height: number }

const TERRAIN_COLOR: Record<string, string> = {
  clouds:  '#c8dcf8',
  desert:  '#d4c090',
  forest:  '#4a8a4a',
  fields:  '#b8a240',
  pasture: '#6ab040',
  hills:   '#b84820',
  mountains: '#808080',
};
const DEFAULT_LAND = '#4a8a4a';

// Pointy-top hex: pixel position from axial (q, r)
function hexToPixel(q: number, r: number, size: number) {
  return {
    x: size * Math.sqrt(3) * (q + r / 2),
    y: size * 1.5 * r,
  };
}

// Six corner offsets for a pointy-top hex of given size
function hexCorners(cx: number, cy: number, size: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    pts.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

export function MapPreview({ hexes, width, height }: Props) {
  if (!hexes || hexes.length === 0) return null;

  // Compute bounding box at size=1
  const positions = hexes.map((h) => hexToPixel(h.q, h.r, 1));
  const xs = positions.map((p) => p.x);
  const ys = positions.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  // Scale so hex grid fills the container with padding
  const pad = 0.12;
  const scale = Math.min(
    (width * (1 - pad * 2)) / (rangeX + Math.sqrt(3)),
    (height * (1 - pad * 2)) / (rangeY + 2)
  );
  const hexSize = scale;

  const offsetX = width / 2 - ((minX + maxX) / 2) * scale;
  const offsetY = height / 2 - ((minY + maxY) / 2) * scale;

  return (
    <svg width={width} height={height} style={{ display: 'block', pointerEvents: 'none' }}>
      {hexes.map((h, i) => {
        const px = hexToPixel(h.q, h.r, hexSize);
        const cx = px.x + offsetX;
        const cy = px.y + offsetY;
        const fill = h.terrain ? (TERRAIN_COLOR[h.terrain] ?? DEFAULT_LAND) : DEFAULT_LAND;
        return (
          <polygon
            key={i}
            points={hexCorners(cx, cy, hexSize * 0.9)}
            fill={fill}
            stroke="rgba(0,0,0,0.2)"
            strokeWidth={0.5}
          />
        );
      })}
    </svg>
  );
}
