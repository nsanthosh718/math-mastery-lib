import { describe, it, expect } from 'vitest';
import { weekProgress, currentWeekNumber, weeksCompleted, getProblemRecord } from '../src/lib/progress.js';

const week = {
  week: 1,
  problems: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }, { id: 'p5' }],
};
const track = { weeks: [week, { week: 2, problems: [{ id: 'q1' }, { id: 'q2' }] }] };

const reviewed = { attempted: true, keyRevealed: true };
const attemptedOnly = { attempted: true, keyRevealed: false };

describe('weekProgress', () => {
  it('reports zero for an untouched week', () => {
    const p = weekProgress(week, { problems: {} });
    expect(p).toMatchObject({ total: 5, attempted: 0, reviewed: 0, ratio: 0, complete: false });
  });

  it('counts a problem as reviewed only when it was attempted AND the key was revealed', () => {
    const childState = {
      problems: { p1: reviewed, p2: attemptedOnly, p3: { attempted: false, keyRevealed: true } },
    };
    const p = weekProgress(week, childState);
    expect(p.attempted).toBe(2);
    expect(p.reviewed).toBe(1);
  });

  it('completes at exactly the threshold, not just above it', () => {
    const childState = { problems: { p1: reviewed, p2: reviewed, p3: reviewed, p4: reviewed } };
    const p = weekProgress(week, childState, 0.8);
    expect(p.ratio).toBeCloseTo(0.8);
    expect(p.complete).toBe(true);
  });

  it('respects a configured threshold other than 80%', () => {
    const childState = { problems: { p1: reviewed, p2: reviewed, p3: reviewed } };
    expect(weekProgress(week, childState, 0.6).complete).toBe(true);
    expect(weekProgress(week, childState, 0.8).complete).toBe(false);
  });

  it('sums time on task and tallies parent self-check ratings', () => {
    const childState = {
      problems: {
        p1: { ...reviewed, secondsOnTask: 120, selfCheck: 'got-it' },
        p2: { ...reviewed, secondsOnTask: 300, selfCheck: 'not-yet' },
      },
    };
    const p = weekProgress(week, childState);
    expect(p.secondsOnTask).toBe(420);
    expect(p.selfChecks).toMatchObject({ 'got-it': 1, 'not-yet': 1, partly: 0 });
  });
});

describe('track level progress', () => {
  it('points at the first incomplete week', () => {
    const done = { problems: { p1: reviewed, p2: reviewed, p3: reviewed, p4: reviewed } };
    expect(currentWeekNumber(track, { problems: {} })).toBe(1);
    expect(currentWeekNumber(track, done)).toBe(2);
    expect(weeksCompleted(track, done)).toBe(1);
  });

  it('stays on the last week once everything is finished', () => {
    const all = {
      problems: Object.fromEntries(
        ['p1','p2','p3','p4','p5','q1','q2'].map((id) => [id, reviewed]),
      ),
    };
    expect(currentWeekNumber(track, all)).toBe(2);
    expect(weeksCompleted(track, all)).toBe(2);
  });
});

describe('getProblemRecord', () => {
  it('returns a complete record even for an unknown problem', () => {
    expect(getProblemRecord({ problems: {} }, 'nope')).toMatchObject({
      attempted: false,
      keyRevealed: false,
      selfCheck: null,
      secondsOnTask: 0,
    });
  });
});
