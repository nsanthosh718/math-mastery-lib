import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { useEffect } from 'react';
import { AppProvider, useApp } from '../src/state/AppContext.jsx';
import { createMemoryAdapter } from '../src/lib/storage.js';
import { initialState } from '../src/lib/state.js';

/** Renders nothing; exposes the context to the test and counts its own renders. */
function Probe({ onReady, renders }) {
  const app = useApp();
  useEffect(() => {
    if (app.loaded) onReady(app);
  });
  renders.count += 1;
  return <div data-testid="week">{app.views['child-2'].currentWeek}</div>;
}

async function mount(adapter) {
  // `adapter` is intentionally forwarded as-is, including undefined, so a test
  // can exercise the provider's own default persistence path.
  const renders = { count: 0 };
  let app = null;
  await act(async () => {
    render(
      <AppProvider adapter={adapter} today="2026-01-10">
        <Probe onReady={(a) => { app = a; }} renders={renders} />
      </AppProvider>,
    );
  });
  return { get: () => app, renders };
}

afterEach(cleanup);

describe('AppProvider persistence', () => {
  it('loads saved progress on mount', async () => {
    const saved = initialState('2026-01-05');
    saved.children[1].problems['g5-w01-p1'] = { attempted: true, keyRevealed: true };
    const { get } = await mount(createMemoryAdapter(saved));
    expect(get().state.children[1].problems['g5-w01-p1'].keyRevealed).toBe(true);
  });

  /**
   * Regression: the adapter used to be a default parameter, so every render
   * built a new adapter object, which re-ran the load effect and replaced live
   * progress with whatever snapshot storage held at the moment that render
   * started. Work recorded between renders simply vanished — the browser showed
   * a finished week collapsing back to three of five problems.
   *
   * The test deliberately mounts WITHOUT an adapter prop so the default path is
   * the one under test; passing a stable adapter in hides the bug entirely.
   */
  it('does not reload over progress recorded after mount (default adapter)', async () => {
    localStorage.clear();
    const problemIds = ['g5-w01-p1', 'g5-w01-p2', 'g5-w01-p3', 'g5-w01-p4', 'g5-w01-p5'];
    const { get } = await mount(undefined);

    for (const problemId of problemIds) {
      await act(async () => {
        get().dispatch({
          type: 'reveal-key', childId: 'child-2', problemId, date: '2026-01-10',
        });
      });
    }

    expect(Object.keys(get().state.children[1].problems)).toEqual(problemIds);
    expect(get().views['child-2'].progressByWeek[1].complete).toBe(true);
    localStorage.clear();
  });

  it('does not reload over progress when given an explicit adapter either', async () => {
    const adapter = createMemoryAdapter(initialState('2026-01-05'));
    const { get } = await mount(adapter);

    for (const problemId of ['g5-w01-p1', 'g5-w01-p2', 'g5-w01-p3']) {
      await act(async () => {
        get().dispatch({
          type: 'reveal-key', childId: 'child-2', problemId, date: '2026-01-10',
        });
      });
    }

    expect(Object.keys(get().state.children[1].problems)).toEqual([
      'g5-w01-p1', 'g5-w01-p2', 'g5-w01-p3',
    ]);
  });

  it('writes every change through to the adapter', async () => {
    const adapter = createMemoryAdapter(initialState('2026-01-05'));
    const { get } = await mount(adapter);
    await act(async () => {
      get().dispatch({
        type: 'reveal-key', childId: 'child-1', problemId: 'k-w01-p1', date: '2026-01-10',
      });
    });
    const persisted = await adapter.load();
    expect(persisted.children[0].problems['k-w01-p1'].keyRevealed).toBe(true);
  });

  it('recomputes gates and progress as work is recorded', async () => {
    const adapter = createMemoryAdapter(initialState('2026-01-05'));
    const { get } = await mount(adapter);

    expect(get().views['child-2'].gates[1].unlocked).toBe(true);
    expect(get().views['child-2'].gates[2].unlocked).toBe(false);

    const week1 = get().views['child-2'].track.weeks[0];
    for (const problem of week1.problems) {
      await act(async () => {
        get().dispatch({
          type: 'reveal-key', childId: 'child-2', problemId: problem.id, date: '2026-01-10',
        });
      });
    }

    expect(get().views['child-2'].progressByWeek[1].complete).toBe(true);
    // Week 2 opens on 2026-01-12; today is the 10th, so the schedule still holds it.
    expect(get().views['child-2'].gates[2].unlocked).toBe(false);
    expect(get().views['child-2'].weeksDone).toBe(1);
    expect(screen.getByTestId('week').textContent).toBe('2');
  });

  it('starts fresh when storage is empty', async () => {
    const { get } = await mount(createMemoryAdapter(null));
    expect(get().state.children).toHaveLength(2);
    expect(get().state.settings.startDate).toBe('2026-01-10');
  });
});
