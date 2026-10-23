import type { ReactNode, Ref } from 'react';

interface PageHeaderProps {
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  /** Receives the heading so focus can move to it after in-app navigation. */
  headingRef?: Ref<HTMLHeadingElement>;
}

export function PageHeader({ title, description, actions, headingRef }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        <h1 ref={headingRef} tabIndex={-1}>
          {title}
        </h1>
        <p>{description}</p>
      </div>
      {actions}
    </header>
  );
}
