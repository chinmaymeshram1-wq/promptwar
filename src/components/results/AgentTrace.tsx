import { AnimatePresence, m } from 'motion/react';
import { useId, useState } from 'react';
import type { PlanResponse } from '../../../shared/schemas';
import { traceSummary } from '../../format';
import { DURATION, EASE_OUT, fadeUp } from '../../motion/variants';
import { ChevronIcon } from '../icons';
import { WorkflowTimeline, type WorkflowStep } from '../WorkflowTimeline';

/** Expandable, measured record of what the agent did: each tool call, its outcome and timing. */
export function AgentTrace({ plan }: { plan: PlanResponse }) {
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
        onClick={() => setOpen((isOpen) => !isOpen)}
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
