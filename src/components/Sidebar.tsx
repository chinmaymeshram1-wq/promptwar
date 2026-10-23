import { m } from 'motion/react';
import type { ComponentType } from 'react';
import { DURATION, EASE_OUT } from '../motion/variants';
import type { Theme } from '../hooks/useTheme';
import { BookIcon, Logo, MoonIcon, SparkIcon, SunIcon } from './icons';

export type View = 'plan' | 'methodology';

const NAV_ITEMS: readonly { view: View; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { view: 'plan', label: 'Plan builder', Icon: SparkIcon },
  { view: 'methodology', label: 'Methodology', Icon: BookIcon },
];

interface SidebarProps {
  view: View;
  onNavigate: (view: View) => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export function Sidebar({ view, onNavigate, theme, onToggleTheme }: SidebarProps) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  return (
    <aside className="sidebar">
      <div className="brand">
        <Logo size={30} />
        <span>
          EcoPilot
          <small>Agentic carbon coach</small>
        </span>
      </div>

      <nav aria-label="Main">
        <p className="nav-label">Workspace</p>
        <div className="nav">
          {NAV_ITEMS.map(({ view: itemView, label, Icon }) => {
            const active = itemView === view;
            return (
              <button
                key={itemView}
                type="button"
                className="nav-item"
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate(itemView)}
              >
                {active && (
                  <m.span
                    layoutId="nav-active"
                    className="nav-active"
                    transition={{ duration: DURATION.base, ease: EASE_OUT }}
                  />
                )}
                <Icon />
                <span className="nav-text">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="sidebar-footer">
        <p className="powered">
          Reasoning by <strong>Google Gemini</strong>. Numbers by audited, tested calculators.
        </p>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onToggleTheme}
          aria-label={`Switch to ${nextTheme} theme`}
        >
          {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          <span className="nav-text">{theme === 'dark' ? 'Light' : 'Dark'} theme</span>
        </button>
      </div>
    </aside>
  );
}
