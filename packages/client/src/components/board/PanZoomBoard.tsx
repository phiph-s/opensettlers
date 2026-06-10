import React, { useRef, useState, useCallback, useEffect, createContext, useContext } from 'react';

export interface PanZoomTransform { x: number; y: number; scale: number }

export const PanZoomContext = createContext<{
  transform: PanZoomTransform;
  containerRef: React.RefObject<HTMLDivElement | null>;
} | null>(null);

export function usePanZoom() { return useContext(PanZoomContext); }

interface Props { children: React.ReactNode }

const MIN_SCALE = 0.15;
const MAX_SCALE = 8;
const DRAG_THRESHOLD = 6; // px before capture activates

export function PanZoomBoard({ children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<PanZoomTransform>({ x: 0, y: 0, scale: 1 });

  const pointers = useRef(new Map<number, { x: number; y: number; startX: number; startY: number }>());
  const captured = useRef(new Set<number>());
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
    pointers.current.set(e.pointerId, {
      x: e.clientX, y: e.clientY,
      startX: e.clientX, startY: e.clientY,
    });
    if (pointers.current.size === 2) {
      // Pinch start — capture both fingers immediately
      isDragging.current = true;
      for (const id of pointers.current.keys()) {
        if (!captured.current.has(id)) {
          try { (e.currentTarget as Element).setPointerCapture(id); } catch { /* ignore */ }
          captured.current.add(id);
        }
      }
      const [p1, p2] = [...pointers.current.values()] as unknown as [{ x: number; y: number }, { x: number; y: number }];
      lastPinchDist.current = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const ptr = pointers.current.get(e.pointerId);
    if (!ptr) return;

    // Activate capture only after drag threshold (preserves tap/click on children)
    if (!captured.current.has(e.pointerId) && pointers.current.size === 1) {
      const dist = Math.hypot(e.clientX - ptr.startX, e.clientY - ptr.startY);
      if (dist < DRAG_THRESHOLD) {
        pointers.current.set(e.pointerId, { ...ptr, x: e.clientX, y: e.clientY });
        return;
      }
      try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch { /* ignore */ }
      captured.current.add(e.pointerId);
      isDragging.current = true;
    }

    const prev = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, { ...ptr, x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1 && isDragging.current) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
    } else if (pointers.current.size === 2) {
      const [p1, p2] = [...pointers.current.values()] as unknown as [{ x: number; y: number }, { x: number; y: number }];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (lastPinchDist.current > 0) {
        zoomAt((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, dist / lastPinchDist.current);
      }
      lastPinchDist.current = dist;
    }
  }, [zoomAt]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    captured.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      isDragging.current = false;
      lastPinchDist.current = 0;
    } else if (pointers.current.size === 1) {
      // Transitioning from pinch back to single finger — reset start pos so no jump
      const [id, pt] = [...pointers.current.entries()][0]!;
      pointers.current.set(id, { ...pt, startX: pt.x, startY: pt.y });
      lastPinchDist.current = 0;
      isDragging.current = true;
    }
  }, []);

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
    <PanZoomContext.Provider value={{ transform, containerRef }}>
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
        {children}
      </div>
    </PanZoomContext.Provider>
  );
}
