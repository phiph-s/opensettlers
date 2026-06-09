import type { CubeCoord } from '../types/board.js';

export interface Point {
  x: number;
  y: number;
}

const SQRT3 = Math.sqrt(3);

/** Converts cube coord to SVG pixel center (pointy-top orientation) */
export function cubeToPixel(coord: CubeCoord, size: number): Point {
  return {
    x: size * (SQRT3 * coord.q + (SQRT3 / 2) * coord.r),
    y: size * (3 / 2) * coord.r,
  };
}

/** Returns 6 corner points of a pointy-top hex at the given center */
export function hexCorners(center: Point, size: number): Point[] {
  return Array.from({ length: 6 }, (_, i) => {
    const angleDeg = 60 * i - 30;
    const angleRad = (Math.PI / 180) * angleDeg;
    return {
      x: center.x + size * Math.cos(angleRad),
      y: center.y + size * Math.sin(angleRad),
    };
  });
}

/** Returns SVG polygon points string for a hex */
export function hexPolygonPoints(center: Point, size: number): string {
  return hexCorners(center, size)
    .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');
}

/**
 * Returns the pixel position of a vertex given the hex center and vertex direction (0-5).
 * Direction 0 = NE corner (top-right), clockwise.
 */
export function vertexPixel(center: Point, size: number, dir: number): Point {
  const angleDeg = 60 * dir - 30;
  const angleRad = (Math.PI / 180) * angleDeg;
  return {
    x: center.x + size * Math.cos(angleRad),
    y: center.y + size * Math.sin(angleRad),
  };
}

/**
 * Returns the midpoint between two hex centers (for edge rendering).
 */
export function edgeMidpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
