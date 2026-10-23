import { m } from 'motion/react';
import { useId, useState, type FormEvent } from 'react';
import { LIMITS } from '../../shared/constants';
import { DEMO_PROFILES } from '../../shared/demoProfiles';
import type { PlanRequest } from '../../shared/schemas';
import { DURATION, EASE_OUT, tapPress } from '../motion/variants';

type Mode = PlanRequest['mode'];

interface PlanFormProps {
  busy: boolean;
  onSubmit: (request: PlanRequest) => void;
}

const MODES: readonly { value: Mode; label: string }[] = [
  { value: 'agent', label: 'AI agent' },
  { value: 'demo', label: 'Demo mode' },
];

const EXAMPLE =
  'I take an auto 8 km to college every weekday and fly home to Delhi twice a year. Family of 4, our electricity bill is about Rs 2,400 a month, one LPG cylinder every 6 weeks, and we eat eggs and chicken a few times a week.';

export function PlanForm({ busy, onSubmit }: PlanFormProps) {
  const [mode, setMode] = useState<Mode>('agent');
  const [description, setDescription] = useState('');
  const [profileId, setProfileId] = useState(DEMO_PROFILES[0]?.id ?? '');
  const textareaId = useId();
  const hintId = useId();
  const countId = useId();

  const tooShort = description.trim().length < LIMITS.descriptionMinChars;
  const disabled = busy || (mode === 'agent' && tooShort);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (disabled) return;
    onSubmit(mode === 'agent' ? { mode, description: description.trim() } : { mode, profileId });
  };

  return (
    <form className="card" onSubmit={submit} aria-busy={busy}>
      <fieldset className="segmented">
        <legend className="visually-hidden">Choose how to build your plan</legend>
        {MODES.map(({ value, label }) => (
          <label key={value} className="segment">
            {mode === value && (
              <m.span
                layoutId="segment-indicator"
                className="segment-indicator"
                transition={{ duration: DURATION.base, ease: EASE_OUT }}
              />
            )}
            <input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value)} />
            <span className="segment-label">{label}</span>
          </label>
        ))}
      </fieldset>

      {mode === 'agent' ? (
        <div className="field">
          <label className="field-label" htmlFor={textareaId}>
            Describe your week in plain words
          </label>
          <p id={hintId} className="field-hint">
            Travel, electricity, cooking, diet, waste: whatever you know. Gemini extracts the data and our tested
            calculators do the maths.
          </p>
          <textarea
            id={textareaId}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={LIMITS.descriptionMaxChars}
            rows={7}
            required
            aria-describedby={`${hintId} ${countId}`}
            placeholder={EXAMPLE}
          />
          <div className="field-footer">
            <button type="button" className="btn-link" onClick={() => setDescription(EXAMPLE)}>
              Use an example
            </button>
            <span id={countId} className="muted">
              {description.length}/{LIMITS.descriptionMaxChars}
            </span>
          </div>
        </div>
      ) : (
        <fieldset className="profiles">
          <legend className="field-label">Pick a sample profile</legend>
          {DEMO_PROFILES.map((profile) => (
            <label key={profile.id} className="profile">
              <input
                type="radio"
                name="profile"
                value={profile.id}
                checked={profileId === profile.id}
                onChange={() => setProfileId(profile.id)}
              />
              <strong>{profile.label}</strong>
              <span>{profile.description}</span>
            </label>
          ))}
        </fieldset>
      )}

      <div className="form-actions">
        <m.button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={disabled}
          whileTap={disabled ? undefined : tapPress}
        >
          {busy ? 'Building your plan…' : 'Build my plan'}
        </m.button>
        <p className="form-note">
          {mode === 'agent'
            ? 'Your text is sent to the Gemini API for this request only. Nothing is stored.'
            : 'Demo data, clearly labelled. Runs the real calculators with no AI call.'}
        </p>
      </div>
    </form>
  );
}
