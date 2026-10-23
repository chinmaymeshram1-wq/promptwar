import { AnimatePresence, m } from 'motion/react';
import { useId, useState, type Ref } from 'react';
import { CATEGORIES } from '../../shared/constants';
import type { PlanResponse } from '../../shared/schemas';
import { CATEGORY_LABELS, COST_LABELS, EFFORT_LABELS, formatKg, percentReduction } from '../format';
import { DURATION, EASE_OUT, fadeUp, hoverLift, stagger } from '../motion/variants';
import { AnimatedNumber } from './AnimatedNumber';
import { BarChart, type BarDatum } from './BarChart';
import { ChevronIcon } from './icons';
import { WorkflowTimeline, type WorkflowStep } from './WorkflowTimeline';

const SOURCE_LABELS: Record<PlanResponse['source'], string> = {
  gemini: 'Planned by Gemini agent',
  demo: 'Demo data · deterministic',
  fallback: 'Deterministic fallback',
};

// Module-level formatters keep AnimatedNumber's `format` prop referentially stable.
const tonnes = (kg: number) => (kg / 1000).toFixed(2);
const percent = (value: number) => `${Math.round(value)}`;
const signedTonnes = (t: number) => `${t > 0 ? '+' : t < 0 ? '−' : ''}${Math.abs(t).toFixed(2)}`;

interface KpiProps {
  label: string;
  value: number;
  format: (n: number) => string;
  unit: string;
  positive?: boolean;
}

function Kpi({ label, value, format, unit, positive }: KpiProps) {
  return (
    <m.div className={`card kpi ${positive ? 'kpi-positive' : ''}`} variants={fadeUp} whileHover={hoverLift}>
      <dt>{label}</dt>
      <dd>
        <AnimatedNumber value={value} format={format} />
        <span className="unit">{unit}</span>
      </dd>
    </m.div>
  );
}

const tokenFormatter = new Intl.NumberFormat('en-IN');

/** One-line, measured efficiency summary: tool calls, latency, model calls, tokens and cache status. */
export function traceSummary(plan: PlanResponse): string {
  const parts = [`${plan.steps.length} tool calls`];
  if (plan.cached) parts.push('served from cache, 0 tokens');
  else {
    parts.push(`${(plan.latencyMs / 1000).toFixed(1)} s`);
    if (plan.usage)
      parts.push(`${plan.usage.modelCalls} model calls`, `${tokenFormatter.format(plan.usage.totalTokens)} tokens`);
  }
  if (plan.model) parts.push(plan.model);
  return parts.join(' · ');
}

function AgentTrace({ plan }: { plan: PlanResponse }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const steps: WorkflowStep[] = plan.steps.map((step, index) => ({
    key: `${index}-${step.tool}`,
    title: <code>{step.tool}</code>,
    detail: step.summary,
    status: step.ok ? 'completed' : 'failed',
    meta: `${step.durationMs} ms`,
  }));

  return (
    <m.section className="card" variants={fadeUp} aria-label="Agent trace">
      <button
        type="button"
        className="disclosure"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span>
          How the agent worked <span className="card-subtitle">{traceSummary(plan)}</span>
        </span>
        <ChevronIcon />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            id={panelId}
            className="disclosure-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DURATION.base, ease: EASE_OUT }}
          >
            <div>
              <WorkflowTimeline steps={steps} label="Agent tool calls" />
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.section>
  );
}

interface PlanResultProps {
  plan: PlanResponse;
  /** Receives the results heading so focus can move there for screen-reader and keyboard users. */
  ref?: Ref<HTMLHeadingElement>;
}

export function PlanResult({ plan, ref }: PlanResultProps) {
  const { footprint, benchmark } = plan;
  const reduction = percentReduction(footprint.totalKgPerYear, plan.projectedTotalKgPerYear);

  const breakdown: BarDatum[] = CATEGORIES.map((category) => ({
    key: category,
    label: CATEGORY_LABELS[category],
    value: footprint.byCategory[category],
    display: footprint.missing.includes(category) ? 'not given' : formatKg(footprint.byCategory[category]),
    tone: category,
  }));

  const comparison: BarDatum[] = [
    { key: 'now', label: 'You today', value: benchmark.totalTonnes, tone: 'you' },
    { key: 'plan', label: 'With this plan', value: plan.projectedTotalKgPerYear / 1000, tone: 'you' },
    { key: 'india', label: 'India average', value: benchmark.indiaAverageTonnes, tone: 'ref' },
    { key: 'paris', label: 'Paris 2030 target', value: benchmark.parisTargetTonnes, tone: 'ref' },
    { key: 'global', label: 'Global average', value: benchmark.globalAverageTonnes, tone: 'ref' },
  ].map((row) => ({ ...row, display: `${row.value.toFixed(2)} t` }));

  return (
    <m.section
      className="stack"
      aria-labelledby="results-heading"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      <m.div className="card summary-card" variants={fadeUp}>
        <span className={`badge badge-dot ${plan.source === 'gemini' ? '' : 'badge-neutral'}`}>
          {SOURCE_LABELS[plan.source]}
        </span>
        <h2 id="results-heading" ref={ref} tabIndex={-1}>
          {plan.headline}
        </h2>
        <p className="insight">{plan.insight}</p>
      </m.div>

      <m.dl className="kpis" variants={stagger} style={{ margin: 0 }}>
        <Kpi label="Current footprint" value={footprint.totalKgPerYear} format={tonnes} unit="t/yr" />
        <Kpi label="With this plan" value={plan.projectedTotalKgPerYear} format={tonnes} unit="t/yr" />
        <Kpi label="Reduction" value={reduction} format={percent} unit="%" positive />
        <Kpi label="Gap to Paris target" value={benchmark.gapToParisTonnes} format={signedTonnes} unit="t" />
      </m.dl>

      <div className="grid-2">
        <m.div className="card" variants={fadeUp}>
          <h3 className="card-title">
            Where it comes from <span className="card-subtitle">kg CO₂e / yr</span>
          </h3>
          <BarChart data={breakdown} label="Annual emissions by category" />
          {footprint.missing.length > 0 && (
            <p className="field-hint" style={{ marginTop: 12 }}>
              Categories you did not mention are left out, not guessed.
            </p>
          )}
        </m.div>
        <m.div className="card" variants={fadeUp}>
          <h3 className="card-title">
            How you compare <span className="card-subtitle">t CO₂e / person / yr</span>
          </h3>
          <BarChart data={comparison} label="Your footprint compared with benchmarks" />
        </m.div>
      </div>

      <m.div className="card" variants={fadeUp}>
        <h3 className="card-title">
          Your action plan <span className="card-subtitle">quantified annual savings</span>
        </h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Action</th>
                <th scope="col">Category</th>
                <th scope="col">Effort</th>
                <th scope="col">Cost</th>
                <th scope="col" className="num">
                  Saving / yr
                </th>
              </tr>
            </thead>
            <tbody>
              {plan.actions.map((action) => (
                <tr key={action.id}>
                  <td>
                    <div className="action-title">{action.title}</div>
                    {action.note && <div className="action-note">{action.note}</div>}
                  </td>
                  <td>{CATEGORY_LABELS[action.category]}</td>
                  <td>{EFFORT_LABELS[action.effort]}</td>
                  <td>{COST_LABELS[action.costHint]}</td>
                  <td className="num saving">−{formatKg(action.savingKgPerYear)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </m.div>

      <AgentTrace plan={plan} />
    </m.section>
  );
}
