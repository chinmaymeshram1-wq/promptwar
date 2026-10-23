import { AnimatePresence, m } from 'motion/react';
import type { ReactNode } from 'react';
import { DURATION, EASE_OUT, fadeUp, stagger } from '../motion/variants';
import { CheckIcon, CrossIcon } from './icons';

type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface WorkflowStep {
  key: string;
  title: ReactNode;
  detail?: ReactNode;
  status: StepStatus;
  meta?: string;
}

const STATUS_TEXT: Record<StepStatus, string> = {
  pending: 'Pending',
  running: 'In progress',
  completed: 'Completed',
  failed: 'Failed',
};

function StepIcon({ status }: { status: StepStatus }) {
  return (
    <span className="step-icon">
      <AnimatePresence mode="wait" initial={false}>
        {(status === 'completed' || status === 'failed') && (
          <m.span
            key={status}
            className="step-glyph"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ duration: DURATION.micro, ease: EASE_OUT }}
          >
            {status === 'completed' ? <CheckIcon size={12} /> : <CrossIcon size={12} />}
          </m.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/** Vertical list of workflow steps with pending / running / completed / failed states. */
export function WorkflowTimeline({ steps, label }: { steps: readonly WorkflowStep[]; label: string }) {
  return (
    <m.ol className="timeline" aria-label={label} variants={stagger} initial="hidden" animate="visible">
      {steps.map((step) => (
        <m.li key={step.key} className="timeline-item" data-status={step.status} variants={fadeUp}>
          <StepIcon status={step.status} />
          <div className="step-body">
            <span className="step-title">
              {step.title}
              <span className="visually-hidden">: {STATUS_TEXT[step.status]}</span>
            </span>
            {step.detail && <span className="step-detail">{step.detail}</span>}
          </div>
          {step.meta && <span className="step-meta">{step.meta}</span>}
        </m.li>
      ))}
    </m.ol>
  );
}
