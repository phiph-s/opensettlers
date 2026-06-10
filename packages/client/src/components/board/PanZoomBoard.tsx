import React, { useRef, useState, useCallback, useEffect } from 'react';

interface Transform { x: number; y: number; scale: number }
interface Props { children: React.ReactNode }

const MIN_SCALE = 0.2;
const MAX_SCALE = 5;

export function PanZoomBoard({ children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const isDragging = useRef(false);
  const isTouch = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef(0);
  const lastPinchMid = useRef({ x: 0, y: 0 });

  const clamp = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  // Zoom toward a screen-space pivot point
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

  // ── Mouse handlers ────────────────────────────────────────────────────────

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    isTouch.current = false;
    lastPoint.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPoint.current.x;
    const dy = e.clientY - lastPoint.current.y;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
  }, []);

  const onMouseUp = useCallback(() => { isDragging.current = false; }, []);

  // ── Touch handlers (registered as non-passive to allow preventDefault) ───

  const onTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    isTouch.current = true;
    const a = e.touches[0], b = e.touches[1];
    if (e.touches.length === 1 && a) {
      isDragging.current = true;
      lastPoint.current = { x: a.clientX, y: a.clientY };
    } else if (e.touches.length >= 2 && a && b) {
      isDragging.current = false;
      lastPinchDist.current = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      lastPinchMid.current = { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
    }
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const a = e.touches[0], b = e.touches[1];
    if (e.touches.length === 1 && isDragging.current && a) {
      const dx = a.clientX - lastPoint.current.x;
      const dy = a.clientY - lastPoint.current.y;
      lastPoint.current = { x: a.clientX, y: a.clientY };
      setTransform((tr) => ({ ...tr, x: tr.x + dx, y: tr.y + dy }));
    } else if (e.touches.length >= 2 && a && b) {
      const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      const mid = { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
      const el = containerRef.current;
      if (el && lastPinchDist.current > 0) {
        const factor = dist / lastPinchDist.current;
        const pdx = mid.x - lastPinchMid.current.x;
        const pdy = mid.y - lastPinchMid.current.y;
        const rect = el.getBoundingClientRect();
        const px = mid.x - rect.left;
        const py = mid.y - rect.top;
        setTransform((tr) => {
          const newScale = clamp(tr.scale * factor);
          const ratio = newScale / tr.scale;
          return {
            x: px - ratio * (px - tr.x) + pdx,
            y: py - ratio * (py - tr.y) + pdy,
            scale: newScale,
          };
        });
      }
      lastPinchDist.current = dist;
      lastPinchMid.current = mid;
    }
  }, []);

  const onTouchEnd = useCallback((e: TouchEvent) => {
    const a = e.touches[0];
    if (e.touches.length === 0) {
      isDragging.current = false;
    } else if (e.touches.length === 1 && a) {
      isDragging.current = true;
      lastPoint.current = { x: a.clientX, y: a.clientY };
      lastPinchDist.current = 0;
    }
  }, []);

  // ── Wheel zoom ────────────────────────────────────────────────────────────

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12);
  }, [zoomAt]);

  // ── Register non-passive listeners ────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [onWheel, onTouchStart, onTouchMove, onTouchEnd]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%', overflow: 'hidden',
        cursor: isDragging.current && !isTouch.current ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <div style={{
        width: '100%', height: '100%',
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        transformOrigin: '0 0',
        willChange: 'transform',
      }}>
        {children}
      </div>
    </div>
  );
}
