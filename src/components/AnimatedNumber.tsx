import { useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

const DURATION_MS = 600;
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

interface AnimatedNumberProps {
  value: number;
  /** Must be a stable reference (module-level) so the animation does not restart on every render. */
  format: (value: number) => string;
}

/**
 * Counts up to a real value by writing to the DOM directly, so it causes no React re-renders.
 * A short requestAnimationFrame tween keeps Motion's full animation engine out of the main bundle.
 * Assistive tech reads only the final value.
 */
export function AnimatedNumber({ value, format }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduceMotion) {
      node.textContent = format(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      node.textContent = format(value * easeOutCubic(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, format, reduceMotion]);

  return (
    <>
      <span ref={ref} aria-hidden="true">
        {format(value)}
      </span>
      <span className="visually-hidden">{format(value)}</span>
    </>
  );
}
