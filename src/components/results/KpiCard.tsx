import { m } from 'motion/react';
import { fadeUp, hoverLift } from '../../motion/variants';
import { AnimatedNumber } from '../AnimatedNumber';

interface KpiCardProps {
  label: string;
  value: number;
  /** Must be referentially stable (module-level) so the count-up does not restart on re-render. */
  format: (value: number) => string;
  unit: string;
  positive?: boolean;
}

/** One key metric inside a `<dl className="kpis">`, counting up to its real value. */
export function KpiCard({ label, value, format, unit, positive = false }: KpiCardProps) {
  return (
    <m.div className={positive ? 'card kpi kpi-positive' : 'card kpi'} variants={fadeUp} whileHover={hoverLift}>
      <dt>{label}</dt>
      <dd>
        <AnimatedNumber value={value} format={format} />
        <span className="unit">{unit}</span>
      </dd>
    </m.div>
  );
}
