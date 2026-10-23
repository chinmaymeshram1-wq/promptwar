import { m } from 'motion/react';
import { barGrow } from '../motion/variants';

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  /** Text shown at the end of the row (and read by screen readers). */
  display: string;
  /** Suffix of a `.tone-*` class in styles/results.css. */
  tone: string;
}

/** Horizontal bar chart. Values are real data; bars are decorative and the text carries the meaning. */
export function BarChart({ data, label }: { data: readonly BarDatum[]; label: string }) {
  const max = Math.max(1e-9, ...data.map((d) => d.value));
  return (
    <ul className="bars" aria-label={label}>
      {data.map((d, index) => (
        <li key={d.key} className="bar-row">
          <span className="bar-label">{d.label}</span>
          <span className="bar-track" aria-hidden="true">
            <m.span
              className={`bar-fill tone-${d.tone}`}
              variants={barGrow(d.value / max, index)}
              initial="hidden"
              animate="visible"
            />
          </span>
          <span className="bar-value">{d.display}</span>
        </li>
      ))}
    </ul>
  );
}
