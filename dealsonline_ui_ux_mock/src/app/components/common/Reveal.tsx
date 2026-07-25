import { useEffect, useRef, useState } from 'react';
import {
  m,
  useInView,
  useReducedMotion,
  animate,
  type Variants,
} from 'motion/react';
import type { ReactNode } from 'react';

/* Restrained motion helpers — see HOMEPAGE_AUDIT.md "Motion budget".
   transform/opacity only, run once, fully gated by prefers-reduced-motion. */

// Mirrors --ease-out-premium / --motion-* in theme.css.
const EASE = [0.16, 1, 0.3, 1] as const;
const REVEAL = 0.4;
const STAGGER = 0.07;
const VIEWPORT = { once: true, margin: '0px 0px -10% 0px' } as const;

/** Single element: fades + rises into place once when scrolled into view. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 12,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: REVEAL, ease: EASE, delay }}
    >
      {children}
    </m.div>
  );
}

/** Container that staggers its <RevealItem> children once on view. */
export function RevealGroup({
  children,
  className,
  stagger = STAGGER,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <m.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      variants={{ show: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </m.div>
  );
}

/** Child of <RevealGroup>. */
export function RevealItem({
  children,
  className,
  y = 12,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  const variants: Variants = {
    hidden: { opacity: 0, y },
    show: { opacity: 1, y: 0, transition: { duration: REVEAL, ease: EASE } },
  };
  return (
    <m.div className={className} variants={variants}>
      {children}
    </m.div>
  );
}

/** Counts a number up/down once when scrolled into view. `format` renders it. */
export function CountUp({
  from,
  to,
  className,
  format,
  duration = 0.75,
}: {
  from: number;
  to: number;
  className?: string;
  format: (n: number) => string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, VIEWPORT);
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? to : from);

  useEffect(() => {
    if (reduce) {
      setValue(to);
      return;
    }
    if (!inView) return;
    const controls = animate(from, to, {
      duration,
      ease: EASE,
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, reduce, from, to, duration]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
