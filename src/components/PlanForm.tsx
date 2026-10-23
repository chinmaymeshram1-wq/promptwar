import { useId, useState, type FormEvent } from 'react';
import { LIMITS } from '../../shared/constants';
import { DEMO_PROFILES } from '../../shared/demoProfiles';
import type { PlanRequest } from '../../shared/schemas';

type Mode = PlanRequest['mode'];

interface PlanFormProps {
  busy: boolean;
  onSubmit: (request: PlanRequest) => void;
}

const EXAMPLE =
  'I take an auto 8 km to college every weekday and fly home to Delhi twice a year. Family of 4, our electricity bill is about Rs 2,400 a month, one LPG cylinder every 6 weeks, and we eat eggs and chicken a few times a week.';

export function PlanForm({ busy, onSubmit }: PlanFormProps) {
  const [mode, setMode] = useState<Mode>('agent');
  const [description, setDescription] = useState('');
  const [profileId, setProfileId] = useState(DEMO_PROFILES[0]?.id ?? '');
  const textareaId = useId();
  const hintId = useId();
  const countId = useId();

  const trimmedLength = description.trim().length;
  const tooShort = trimmedLength < LIMITS.descriptionMinChars;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (mode === 'agent') {
      if (!tooShort) onSubmit({ mode, description: description.trim() });
    } else {
      onSubmit({ mode, profileId });
    }
  };

  return (
    <form className="card plan-form" onSubmit={submit} aria-busy={busy}>
      <fieldset className="mode-switch">
        <legend className="visually-hidden">Choose how to build your plan</legend>
        <label className={mode === 'agent' ? 'active' : ''}>
          <input type="radio" name="mode" value="agent" checked={mode === 'agent'} onChange={() => setMode('agent')} />
          AI agent
        </label>
        <label className={mode === 'demo' ? 'active' : ''}>
          <input type="radio" name="mode" value="demo" checked={mode === 'demo'} onChange={() => setMode('demo')} />
          Demo mode
        </label>
      </fieldset>

      {mode === 'agent' ? (
        <div className="field">
          <label htmlFor={textareaId}>Describe your week in plain words</label>
          <p id={hintId} className="hint">
            Travel, electricity, cooking, diet, waste: whatever you know. Gemini extracts the data; our tested
            calculator does the maths.
          </p>
          <textarea
            id={textareaId}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={LIMITS.descriptionMaxChars}
            rows={6}
            required
            aria-describedby={`${hintId} ${countId}`}
            placeholder={EXAMPLE}
          />
          <div className="field-footer">
            <button type="button" className="link-button" onClick={() => setDescription(EXAMPLE)}>
              Use an example
            </button>
            <span id={countId} className="hint" aria-live="polite">
              {description.length}/{LIMITS.descriptionMaxChars}
            </span>
          </div>
        </div>
      ) : (
        <fieldset className="field profiles">
          <legend>Pick a sample profile (runs offline, no AI key needed)</legend>
          {DEMO_PROFILES.map((profile) => (
            <label key={profile.id} className={`profile ${profileId === profile.id ? 'active' : ''}`}>
              <input
                type="radio"
                name="profile"
                value={profile.id}
                checked={profileId === profile.id}
                onChange={() => setProfileId(profile.id)}
              />
              <span>
                <strong>{profile.label}</strong>
                <span className="hint">{profile.description}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      <button type="submit" className="primary" disabled={busy || (mode === 'agent' && tooShort)}>
        {busy ? 'Building your plan…' : 'Build my plan'}
      </button>
    </form>
  );
}
