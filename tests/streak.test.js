import { describe, it, expect } from 'vitest';
import { currentStreak, longestStreak, consistency, streakSummary } from '../src/lib/streak.js';

describe('currentStreak', () => {
  it('is zero with no activity', () => {
    expect(currentStreak({ activity: [] }, '2026-01-10')).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    const child = { activity: ['2026-01-08', '2026-01-09', '2026-01-10'] };
    expect(currentStreak(child, '2026-01-10')).toBe(3);
  });

  it('survives a day that has not been worked yet', () => {
    const child = { activity: ['2026-01-08', '2026-01-09'] };
    expect(currentStreak(child, '2026-01-10')).toBe(2);
  });

  it('breaks once a full day is missed', () => {
    const child = { activity: ['2026-01-07', '2026-01-08'] };
    expect(currentStreak(child, '2026-01-10')).toBe(0);
  });

  it('ignores duplicate entries for the same day', () => {
    const child = { activity: ['2026-01-10', '2026-01-10', '2026-01-09'] };
    expect(currentStreak(child, '2026-01-10')).toBe(2);
  });
});

describe('longestStreak', () => {
  it('finds the best run anywhere in the history', () => {
    const child = {
      activity: ['2026-01-01','2026-01-02','2026-01-03','2026-01-03','2026-01-07','2026-01-20'],
    };
    expect(longestStreak(child)).toBe(3);
  });

  it('is zero with no activity and one with a single day', () => {
    expect(longestStreak({ activity: [] })).toBe(0);
    expect(longestStreak({ activity: ['2026-01-01'] })).toBe(1);
  });
});

describe('consistency', () => {
  it('reports the share of elapsed days that were worked', () => {
    const child = { activity: ['2026-01-05', '2026-01-06', '2026-01-08', '2026-01-09'] };
    // Jan 5 through Jan 11 inclusive is 7 days, 4 of them active.
    expect(consistency(child, '2026-01-05', '2026-01-11')).toBeCloseTo(4 / 7);
  });

  it('ignores activity recorded outside the window', () => {
    const child = { activity: ['2025-12-30', '2026-01-05'] };
    expect(consistency(child, '2026-01-05', '2026-01-05')).toBe(1);
  });
});

describe('streakSummary', () => {
  it('bundles the numbers the dashboard shows', () => {
    const child = { activity: ['2026-01-05', '2026-01-06', '2026-01-07'] };
    expect(streakSummary(child, '2026-01-05', '2026-01-07')).toMatchObject({
      current: 3,
      longest: 3,
      activeDays: 3,
    });
  });
});
