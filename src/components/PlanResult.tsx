import type { Ref } from 'react';
import { CATEGORIES } from '../../shared/constants';
import type { PlanResponse } from '../../shared/schemas';
import { CATEGORY_LABELS, COST_LABELS, EFFORT_LABELS, formatKg, formatTonnes, percentReduction } from '../format';

const SOURCE_LABELS: Record<PlanResponse['source'], string> = {
  gemini: 'Planned by Gemini agent',
  demo: 'Demo mode · deterministic',
  fallback: 'Deterministic fallback',
};

interface PlanResultProps {
  plan: PlanResponse;
  /** Receives the results heading so focus can move there for screen-reader and keyboard users. */
  ref?: Ref<HTMLHeadingElement>;
}

export function PlanResult({ plan, ref }: PlanResultProps) {
  const { footprint, benchmark } = plan;
  const reduction = percentReduction(footprint.totalKgPerYear, plan.projectedTotalKgPerYear);
  const maxCategory = Math.max(1, ...CATEGORIES.map((c) => footprint.byCategory[c]));
  const benchmarkRows = [
    { label: 'You today', tonnes: benchmark.totalTonnes, you: true },
    { label: 'You with this plan', tonnes: plan.projectedTotalKgPerYear / 1000, you: true },
    { label: 'India average', tonnes: benchmark.indiaAverageTonnes },
    { label: '2030 Paris-aligned target', tonnes: benchmark.parisTargetTonnes },
    { label: 'Global average', tonnes: benchmark.globalAverageTonnes },
  ];
  const maxTonnes = Math.max(...benchmarkRows.map((r) => r.tonnes));

  return (
    <section className="results" aria-labelledby="results-heading">
      <div className="card">
        <p className="badge">{SOURCE_LABELS[plan.source]}</p>
        <h2 id="results-heading" ref={ref} tabIndex={-1}>
          {plan.headline}
        </h2>
        <p className="insight">{plan.insight}</p>

        <dl className="stats">
          <div>
            <dt>Current footprint</dt>
            <dd>
              {formatTonnes(footprint.totalKgPerYear)}
              <span> CO₂e / yr</span>
            </dd>
          </div>
          <div>
            <dt>With this plan</dt>
            <dd>
              {formatTonnes(plan.projectedTotalKgPerYear)}
              <span> CO₂e / yr</span>
            </dd>
          </div>
          <div>
            <dt>Reduction</dt>
            <dd>{reduction}%</dd>
          </div>
        </dl>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Where it comes from</h3>
          <ul className="bars">
            {CATEGORIES.map((category) => (
              <li key={category}>
                <span className="bar-label">{CATEGORY_LABELS[category]}</span>
                <span className="bar-track" aria-hidden="true">
                  <span
                    className={`bar-fill cat-${category}`}
                    style={{ width: `${(footprint.byCategory[category] / maxCategory) * 100}%` }}
                  />
                </span>
                <span className="bar-value">
                  {footprint.missing.includes(category) ? 'not given' : formatKg(footprint.byCategory[category])}
                </span>
              </li>
            ))}
          </ul>
          {footprint.missing.length > 0 && (
            <p className="hint">Categories you did not mention are left out, not guessed.</p>
          )}
        </div>

        <div className="card">
          <h3>How you compare (t CO₂e / yr)</h3>
          <ul className="bars">
            {benchmarkRows.map((row) => (
              <li key={row.label}>
                <span className="bar-label">{row.label}</span>
                <span className="bar-track" aria-hidden="true">
                  <span
                    className={`bar-fill ${row.you ? 'bar-you' : 'bar-ref'}`}
                    style={{ width: `${(row.tonnes / maxTonnes) * 100}%` }}
                  />
                </span>
                <span className="bar-value">{row.tonnes.toFixed(2)} t</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card">
        <h3>Your action plan</h3>
        <ol className="actions">
          {plan.actions.map((action) => (
            <li key={action.id}>
              <div className="action-head">
                <strong>{action.title}</strong>
                <span className="saving">−{formatKg(action.savingKgPerYear)}/yr</span>
              </div>
              {action.note && <p>{action.note}</p>}
              <p className="tags">
                <span>{CATEGORY_LABELS[action.category]}</span>
                <span>{EFFORT_LABELS[action.effort]}</span>
                <span>{COST_LABELS[action.costHint]}</span>
              </p>
            </li>
          ))}
        </ol>
      </div>

      <details className="card trace">
        <summary>
          How the agent worked: {plan.steps.length} tool calls in {(plan.latencyMs / 1000).toFixed(1)} s
          {plan.model ? ` · ${plan.model}` : ''}
        </summary>
        <ol>
          {plan.steps.map((step, index) => (
            <li key={`${step.tool}-${index}`}>
              <code>{step.tool}</code> {step.summary}
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
