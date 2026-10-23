// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findDemoProfile, runDemo } from '../shared/demo';
import { App } from '../src/App';

const demoPlan = runDemo(findDemoProfile('city_commuter')!, () => 0);

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function expectNoAxeViolations(container: HTMLElement) {
  // Colour contrast needs real layout, which jsdom does not provide; it is checked with Lighthouse instead.
  const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

describe('App', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('renders an accessible landing page', async () => {
    const { container } = render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /skip to content/i })).toHaveAttribute('href', '#main');
    await expectNoAxeViolations(container);
  });

  it('keeps submit disabled until the description is long enough', async () => {
    const user = userEvent.setup();
    render(<App />);
    const submit = screen.getByRole('button', { name: /build my plan/i });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText(/describe your week/i), 'I cycle to work daily.');
    expect(submit).toBeEnabled();
  });

  it('runs demo mode end to end and moves focus to the result', async () => {
    fetchMock.mockResolvedValue(jsonResponse(demoPlan));
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole('radio', { name: /demo mode/i }));
    await user.click(screen.getByRole('button', { name: /build my plan/i }));

    const heading = await screen.findByRole('heading', { level: 2, name: demoPlan.headline });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByText('Demo data · deterministic')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(5);

    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(init!.body as string)).toEqual({ mode: 'demo', profileId: 'city_commuter' });
    await expectNoAxeViolations(container);
  });

  it('announces server errors and suggests demo mode', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'AI mode is not configured.' }, 503));
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /use an example/i }));
    await user.click(screen.getByRole('button', { name: /build my plan/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('AI mode is not configured.');
    expect(alert).toHaveTextContent(/demo mode/i);
  });

  it('handles network failures', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /use an example/i }));
    await user.click(screen.getByRole('button', { name: /build my plan/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/network error/i);
  });

  it('navigates to the methodology page and shows the real emission factors', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('button', { name: /methodology/i }));
    const heading = await screen.findByRole('heading', { level: 1, name: 'Methodology' });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByRole('button', { name: /methodology/i })).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByText('0.716 kg / kWh')).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('switches between dark and light themes', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(document.documentElement.dataset.theme).toBe('dark');
    await user.click(screen.getByRole('button', { name: /switch to light theme/i }));
    expect(document.documentElement.dataset.theme).toBe('light');
    await user.click(screen.getByRole('button', { name: /switch to dark theme/i }));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('keeps every nav and theme button labelled for assistive tech', () => {
    render(<App />);
    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveAccessibleName();
    }
  });

  it('keeps a finished plan when navigating away and back', async () => {
    fetchMock.mockResolvedValue(jsonResponse(demoPlan));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: /demo mode/i }));
    await user.click(screen.getByRole('button', { name: /build my plan/i }));
    await screen.findByRole('heading', { level: 2, name: demoPlan.headline });

    await user.click(screen.getByRole('button', { name: /methodology/i }));
    await screen.findByRole('heading', { level: 1, name: 'Methodology' });
    await user.click(screen.getByRole('button', { name: /plan builder/i }));

    const pageTitle = await screen.findByRole('heading', { level: 1, name: 'Plan builder' });
    expect(await screen.findByRole('heading', { level: 2, name: demoPlan.headline })).toBeInTheDocument();
    // Returning to the page focuses its title; the old result must not steal focus again.
    await waitFor(() => expect(pageTitle).toHaveFocus());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
