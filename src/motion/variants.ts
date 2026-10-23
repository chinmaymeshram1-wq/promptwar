/**
 * Shared Motion variants and timings. Micro-interactions sit around 150-250 ms,
 * larger transitions around 250-400 ms. Reduced motion is handled globally by
 * <MotionProvider> (transform animations are skipped; opacity remains).
 */
import type { Transition, Variants } from 'motion/react';

export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const DURATION = {
  micro: 0.18,
  base: 0.28,
  large: 0.38,
} as const;

export const springTap: Transition = { type: 'spring', stiffness: 500, damping: 32 };

/** Page and panel entrance: fade with a small rise. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT } },
  exit: { opacity: 0, y: -4, transition: { duration: DURATION.micro, ease: 'easeIn' } },
};

/** Parent that staggers its fadeUp children. */
export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
};

/** Bar charts grow from the left edge using GPU-friendly scaleX. */
export const barGrow = (ratio: number, index: number): Variants => ({
  hidden: { scaleX: 0 },
  visible: {
    scaleX: ratio,
    transition: { duration: DURATION.large, ease: EASE_OUT, delay: 0.08 + index * 0.04 },
  },
});

export const hoverLift = { y: -2, transition: { duration: DURATION.micro } };
export const tapPress = { scale: 0.98 };
