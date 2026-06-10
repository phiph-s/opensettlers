import React, { useRef, useState, useCallback, useEffect } from 'react';

interface Transform { x: number; y: number; scale: number }
interface Props { children: React.ReactNode }

const MIN_SCALE = 0.2;
const MAX_SCALE = 5;

export function PanZoomBoard({ children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });

  // Active pointer positions (supports multi-touch pinch)
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const lastSingle = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef(0);
  const isDragging = useRef(false);

  const clamp = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const zoomAt = useCallback((pivotX: number, pivotY: number, factor: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = pivotX - rect.left;
    const py = pivotY - rect.top;
    setTransform((t) => {
      const newScale = clamp(t.scale * factor);
      const ratio = newScale / t.scale;
      return { x: px - ratio * (px - t.x), y: py - ratio * (py - t.y), scale: newScale };
    });
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      isDragging.current = true;
      lastSingle.current = { x: e.clientX, y: e.clientY };
    } else if (pointers.current.size === 2) {
      isDragging.current = false;
      const [p1, p2] = [...pointers.current.values()] as [{ x: number; y: number }, { x: number; y: number }];
      lastPinchDist.current = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1 && isDragging.current) {
      const dx = e.clientX - lastSingle.current.x;
      const dy = e.clientY - lastSingle.current.y;
      lastSingle.current = { x: e.clientX, y: e.clientY };
      setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
    } else if (pointers.current.size === 2) {
      const [p1, p2] = [...pointers.current.values()] as [{ x: number; y: number }, { x: number; y: number }];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (lastPinchDist.current > 0) {
        zoomAt((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, dist / lastPinchDist.current);
      }
      lastPinchDist.current = dist;
    }
  }, [zoomAt]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      isDragging.current = false;
      lastPinchDist.current = 0;
    } else if (pointers.current.size === 1) {
      isDragging.current = true;
      const remaining = [...pointers.current.values()][0]!;
      lastSingle.current = { x: remaining.x, y: remaining.y };
      lastPinchDist.current = 0;
    }
  }, []);

  // Wheel zoom — registered non-passive so preventDefault works
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12);
  }, [zoomAt]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%', overflow: 'hidden',
        cursor: isDragging.current ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div style={{
        width: '100%', height: '100%',
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        transformOrigin: '0 0',
      }}>
        {children}
      </div>
    </div>
  );
}
