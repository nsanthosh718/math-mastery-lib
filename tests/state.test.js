import { describe, it, expect } from 'vitest';
import { reducer, initialState, hydrate, DEFAULT_SETTINGS } from '../src/lib/state.js';
import { getProblemRecord } from '../src/lib/progress.js';

const today = '2026-01-10';
const start = () => initialState('2026-01-05');

describe('initialState', () => {
  it('creates two profiles on the two tracks and starts the schedule today', () => {
    const s = start();
    expect(s.children.map((c) => c.trackId)).toEqual(['kindergarten', 'grade5']);
    expect(s.settings.startDate).toBe('2026-01-05');
    expect(s.settings.completionThreshold).toBe(0.8);
  });
});

describe('hydrate', () => {
  it('fills in settings a saved payload predates', () => {
    const s = hydrate({ settings: { startDate: '2025-12-01' }, children: [] }, today);
    expect(s.settings.startDate).toBe('2025-12-01');
    expect(s.settings.cadenceDays).toBe(DEFAULT_SETTINGS.cadenceDays);
  });

  it('backfills fields missing from an older child record', () => {
    const s = hydrate({ children: [{ id: 'c1', name: 'A', trackId: 'grade5' }] }, today);
    expect(s.children[0]).toMatchObject({ problems: {}, activity: [], overrides: [] });
  });

  it('falls back to a fresh state for junk input', () => {
    expect(hydrate(null, today).children).toHaveLength(2);
  });
});

describe('reducer', () => {
  it('records an attempt and logs the day for streak purposes', () => {
    const s = reducer(start(), {
      type: 'mark-attempted', childId: 'child-1', problemId: 'k-w01-p1', date: today,
    });
    expect(getProblemRecord(s.children[0], 'k-w01-p1').attempted).toBe(true);
    expect(s.children[0].activity).toEqual([today]);
  });

  it('does not log the same day twice', () => {
    let s = start();
    for (const problemId of ['k-w01-p1', 'k-w01-p2']) {
      s = reducer(s, { type: 'mark-attempted', childId: 'child-1', problemId, date: today });
    }
    expect(s.children[0].activity).toEqual([today]);
  });

  it('marks a revealed key as attempted too', () => {
    const s = reducer(start(), {
      type: 'reveal-key', childId: 'child-1', problemId: 'k-w01-p3', date: today,
    });
    expect(getProblemRecord(s.children[0], 'k-w01-p3')).toMatchObject({
      attempted: true, keyRevealed: true,
    });
  });

  it('leaves the other child untouched', () => {
    const s = reducer(start(), {
      type: 'mark-attempted', childId: 'child-1', problemId: 'k-w01-p1', date: today,
    });
    expect(s.children[1].problems).toEqual({});
    expect(s.children[1].activity).toEqual([]);
  });

  it('accumulates time on task across visits', () => {
    let s = start();
    for (const seconds of [90, 45]) {
      s = reducer(s, { type: 'add-time', childId: 'child-2', problemId: 'g5-w01-p1', seconds });
    }
    expect(getProblemRecord(s.children[1], 'g5-w01-p1').secondsOnTask).toBe(135);
  });

  it('toggles a parent override on and back off', () => {
    let s = reducer(start(), { type: 'toggle-override', childId: 'child-2', week: 3 });
    expect(s.children[1].overrides).toEqual([3]);
    s = reducer(s, { type: 'toggle-override', childId: 'child-2', week: 3 });
    expect(s.children[1].overrides).toEqual([]);
  });

  it('replaces rather than duplicates a reasoning rating for the same week and day', () => {
    let s = reducer(start(), {
      type: 'log-reasoning-rating', childId: 'child-2', week: 1, date: today, rating: 2, note: 'first',
    });
    s = reducer(s, {
      type: 'log-reasoning-rating', childId: 'child-2', week: 1, date: today, rating: 4, note: 'second',
    });
    expect(s.children[1].reasoningRatings).toHaveLength(1);
    expect(s.children[1].reasoningRatings[0]).toMatchObject({ rating: 4, note: 'second' });
  });

  it('clears a week so it can be redone', () => {
    let s = reducer(start(), {
      type: 'reveal-key', childId: 'child-1', problemId: 'k-w01-p1', date: today,
    });
    s = reducer(s, { type: 'reset-week', childId: 'child-1', problemIds: ['k-w01-p1'] });
    expect(s.children[0].problems['k-w01-p1']).toBeUndefined();
    expect(s.children[0].activity).toEqual([today]);
  });

  it('patches settings without dropping the rest', () => {
    const s = reducer(start(), { type: 'set-settings', patch: { cadenceDays: 14 } });
    expect(s.settings.cadenceDays).toBe(14);
    expect(s.settings.completionThreshold).toBe(0.8);
  });

  it('ignores an unknown action', () => {
    const s = start();
    expect(reducer(s, { type: 'nonsense' })).toBe(s);
  });
});
