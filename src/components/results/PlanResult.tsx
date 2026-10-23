import { m } from 'motion/react';
import type { Ref } from 'react';
import { CATEGORIES } from '../../../shared/constants';
import type { PlanResponse } from '../../../shared/schemas';
import { CATEGORY_LABELS, formatKg, percentReduction } from '../../format';
import { fadeUp, stagger } from '../../motion/variants';
import { BarChart, type BarDatum } from '../BarChart';
import { ActionTable } from './ActionTable';
import { AgentTrace } from './AgentTrace';
import { KpiCard } from './KpiCard';

const SOURCE_LABELS: Record<PlanResponse['source'], string> = {
  gemini: 'Planned by Gemini agent',
  demo: 'Demo data · deterministic',
  fallback: 'Deterministic fallback',
};

// Module-level formatters keep KpiCard's `format` prop referentially stable.
const tonnes = (kg: number) => (kg / 1000).toFixed(2);
const percent = (value: number) => `${Math.round(value)}`;
const signedTonnes = (t: number) => `${t > 0 ? '+' : t < 0 ? '−' : ''}${Math.abs(t).toFixed(2)}`;

function breakdownBars(plan: PlanResponse): BarDatum[] {
  const { footprint } = plan;
  return CATEGORIES.map((category) => ({
    key: category,
    label: CATEGORY_LABELS[category],
    value: footprint.byCategory[category],
    display: footprint.missing.includes(category) ? 'not given' : formatKg(footprint.byCategory[category]),
    tone: category,
  }));
}

function comparisonBars(plan: PlanResponse): BarDatum[] {
  const { benchmark } = plan;
  return [
    { key: 'now', label: 'You today', value: benchmark.totalTonnes, tone: 'you' },
    { key: 'plan', label: 'With this plan', value: plan.projectedTotalKgPerYear / 1000, tone: 'you' },
    { key: 'india', label: 'India average', value: benchmark.indiaAverageTonnes, tone: 'ref' },
    { key: 'paris', label: 'Paris 2030 target', value: benchmark.parisTargetTonnes, tone: 'ref' },
    { key: 'global', label: 'Global average', value: benchmark.globalAverageTonnes, tone: 'ref' },
  ].map((row) => ({ ...row, display: `${row.value.toFixed(2)} t` }));
}

interface PlanResultProps {
  plan: PlanResponse;
  /** Receives the results heading so focus can move there for screen-reader and keyboard users. */
  ref?: Ref<HTMLHeadingElement>;
}

/** The results dashboard: summary, KPIs, charts, ranked actions and the agent trace. */
export function PlanResult({ plan, ref }: PlanResultProps) {
  const { footprint, benchmark } = plan;

  return (
    <m.section
      className="stack"
      aria-labelledby="results-heading"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      <m.div className="card summary-card" variants={fadeUp}>
        <span className={plan.source === 'gemini' ? 'badge badge-dot' : 'badge badge-dot badge-neutral'}>
          {SOURCE_LABELS[plan.source]}
        </span>
        <h2 id="results-heading" ref={ref} tabIndex={-1}>
          {plan.headline}
        </h2>
        <p className="insight">{plan.insight}</p>
      </m.div>

      <m.dl className="kpis" variants={stagger}>
        <KpiCard label="Current footprint" value={footprint.totalKgPerYear} format={tonnes} unit="t/yr" />
        <KpiCard label="With this plan" value={plan.projectedTotalKgPerYear} format={tonnes} unit="t/yr" />
        <KpiCard
          label="Reduction"
          value={percentReduction(footprint.totalKgPerYear, plan.projectedTotalKgPerYear)}
          format={percent}
          unit="%"
          positive
        />
        <KpiCard label="Gap to Paris target" value={benchmark.gapToParisTonnes} format={signedTonnes} unit="t" />
      </m.dl>

      <div className="grid-2">
        <m.div className="card" variants={fadeUp}>
          <h3 className="card-title">
            Where it comes from <span className="card-subtitle">kg CO₂e / yr</span>
          </h3>
          <BarChart data={breakdownBars(plan)} label="Annual emissions by category" />
          {footprint.missing.length > 0 && (
            <p className="card-footnote">Categories you did not mention are left out, not guessed.</p>
          )}
        </m.div>
        <m.div className="card" variants={fadeUp}>
          <h3 className="card-title">
            How you compare <span className="card-subtitle">t CO₂e / person / yr</span>
          </h3>
          <BarChart data={comparisonBars(plan)} label="Your footprint compared with benchmarks" />
        </m.div>
      </div>

      <m.div className="card" variants={fadeUp}>
        <h3 className="card-title">
          Your action plan <span className="card-subtitle">quantified annual savings</span>
        </h3>
        <ActionTable actions={plan.actions} />
      </m.div>

      <AgentTrace plan={plan} />
    </m.section>
  );
}
