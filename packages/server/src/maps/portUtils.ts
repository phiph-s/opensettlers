import type { CubeCoord, PortType } from '@opensettlers/shared';
import { edgeKey } from '@opensettlers/shared';

const DIRS: CubeCoord[] = [
  { q: 1, r: 0, s: -1 }, { q: 1, r: -1, s: 0 }, { q: 0, r: -1, s: 1 },
  { q: -1, r: 0, s: 1 }, { q: -1, r: 1, s: 0 }, { q: 0, r: 1, s: -1 },
];

function ck(c: CubeCoord): string { return `${c.q},${c.r},${c.s}`; }

function toPixel(c: CubeCoord) {
  return { x: Math.sqrt(3) * (c.q + c.r / 2), y: 1.5 * c.r };
}

/**
 * Compute all perimeter (land→sea) edge pairs, sorted clockwise by angle
 * from the map centroid.
 */
function sortedPerimeter(coords: CubeCoord[]): Array<{ land: CubeCoord; sea: CubeCoord }> {
  const set = new Set(coords.map(ck));
  const px = coords.map(toPixel);
  const cx = px.reduce((s, p) => s + p.x, 0) / coords.length;
  const cy = px.reduce((s, p) => s + p.y, 0) / coords.length;

  const edges: Array<{ land: CubeCoord; sea: CubeCoord; angle: number }> = [];
  for (const coord of coords) {
    const p = toPixel(coord);
    for (const dir of DIRS) {
      const nb: CubeCoord = { q: coord.q + dir.q, r: coord.r + dir.r, s: coord.s + dir.s };
      if (set.has(ck(nb))) continue;
      const np = toPixel(nb);
      edges.push({
        land: coord,
        sea: nb,
        angle: Math.atan2((p.y + np.y) / 2 - cy, (p.x + np.x) / 2 - cx),
      });
    }
  }

  edges.sort((a, b) => a.angle - b.angle);
  return edges;
}

/**
 * Distribute ports of the given types evenly around the map perimeter.
 * Ensures no two ports share the same land hex (avoids stacking on corners).
 */
export function distributePorts(
  coords: CubeCoord[],
  types: PortType[],
): Array<{ type: PortType; edgeKey: string }> {
  const all = sortedPerimeter(coords);
  const step = all.length / types.length;
  const usedLand = new Set<string>();
  const result: Array<{ type: PortType; edgeKey: string }> = [];

  for (let i = 0; i < types.length; i++) {
    let idx = Math.round(i * step) % all.length;
    let tries = 0;
    while (usedLand.has(ck(all[idx]!.land)) && tries < all.length) {
      idx = (idx + 1) % all.length;
      tries++;
    }
    const e = all[idx]!;
    usedLand.add(ck(e.land));
    result.push({ type: types[i]!, edgeKey: edgeKey(e.land, e.sea) });
  }

  return result;
}
