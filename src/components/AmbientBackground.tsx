/**
 * Decorative ambient layer: slow canopy-light glows and a few drifting leaves.
 * Pure CSS animations on transform/opacity (compositor-only, no JS frame loop),
 * hidden from assistive tech and switched off under prefers-reduced-motion.
 */
import type { CSSProperties } from 'react';

const LEAVES = [
  { left: '12%', size: 18, duration: 26, delay: -4, sway: 40 },
  { left: '34%', size: 14, duration: 32, delay: -18, sway: -50 },
  { left: '58%', size: 22, duration: 29, delay: -9, sway: 60 },
  { left: '76%', size: 16, duration: 35, delay: -25, sway: -40 },
  { left: '90%', size: 12, duration: 30, delay: -13, sway: 30 },
] as const;

export function AmbientBackground() {
  return (
    <div className="ambient" aria-hidden="true">
      <span className="ambient-glow glow-a" />
      <span className="ambient-glow glow-b" />
      {LEAVES.map((leaf, index) => (
        <span
          key={index}
          className="ambient-leaf"
          style={
            {
              left: leaf.left,
              '--leaf-size': `${leaf.size}px`,
              '--leaf-duration': `${leaf.duration}s`,
              '--leaf-delay': `${leaf.delay}s`,
              '--leaf-sway': `${leaf.sway}px`,
            } as CSSProperties
          }
        >
          <svg viewBox="0 0 24 24" width="100%" height="100%">
            <path d="M5 19C5 10 11 4 21 3c-1 10-7 16-16 16Z" fill="currentColor" />
            <path d="M5 19c3-5 7-9 12-12" fill="none" stroke="var(--bg)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </span>
      ))}
    </div>
  );
}
