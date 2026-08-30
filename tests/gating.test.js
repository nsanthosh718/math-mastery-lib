import { describe, it, expect } from 'vitest';
import { weekGateStatus, weekReleaseDate, weekDueDate, LOCK_REASONS } from '../src/lib/gating.js';

const problems = (prefix, n) => Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i + 1}` }));
const track = {
  weeks: [
    { week: 1, problems: problems('a', 5) },
    { week: 2, problems: problems('b', 5) },
    { week: 3, problems: problems('c', 5) },
  ],
};
const settings = { startDate: '2026-01-05', cadenceDays: 7, completionThreshold: 0.8 };
const reviewed = { attempted: true, keyRevealed: true };
const finishWeek1 = {
  problems: Object.fromEntries(['a1','a2','a3','a4'].map((id) => [id, reviewed])),
};

describe('schedule maths', () => {
  it('opens week 1 on the start date and each later week one cadence apart', () => {
    expect(weekReleaseDate('2026-01-05', 1)).toBe('2026-01-05');
    expect(weekReleaseDate('2026-01-05', 3)).toBe('2026-01-19');
    expect(weekReleaseDate('2026-01-05', 3, 14)).toBe('2026-02-02');
  });

  it('sets each due date the day before the next week opens', () => {
    expect(weekDueDate('2026-01-05', 1)).toBe('2026-01-11');
    expect(weekDueDate('2026-01-05', 2)).toBe('2026-01-18');
  });
});

describe('weekGateStatus', () => {
  it('opens week 1 on day one', () => {
    const s = weekGateStatus(track, 1, { problems: {} }, settings, '2026-01-05');
    expect(s.unlocked).toBe(true);
    expect(s.reason).toBe(LOCK_REASONS.UNLOCKED);
  });

  it('keeps week 1 shut before the start date', () => {
    const s = weekGateStatus(track, 1, { problems: {} }, settings, '2026-01-04');
    expect(s.unlocked).toBe(false);
    expect(s.reason).toBe(LOCK_REASONS.NOT_RELEASED);
  });

  it('holds week 2 back while week 1 is unfinished, even after its release date', () => {
    const s = weekGateStatus(track, 2, { problems: {} }, settings, '2026-01-20');
    expect(s.unlocked).toBe(false);
    expect(s.reason).toBe(LOCK_REASONS.PRIOR_INCOMPLETE);
  });

  it('holds week 2 back before its release date even when week 1 is finished', () => {
    const s = weekGateStatus(track, 2, finishWeek1, settings, '2026-01-08');
    expect(s.unlocked).toBe(false);
    expect(s.reason).toBe(LOCK_REASONS.NOT_RELEASED);
  });

  it('opens week 2 once both conditions are met', () => {
    const s = weekGateStatus(track, 2, finishWeek1, settings, '2026-01-12');
    expect(s.unlocked).toBe(true);
  });

  it('lets a parent override a locked week without touching the others', () => {
    const child = { problems: {}, overrides: [3] };
    expect(weekGateStatus(track, 3, child, settings, '2026-01-05')).toMatchObject({
      unlocked: true,
      reason: LOCK_REASONS.OVERRIDDEN,
    });
    expect(weekGateStatus(track, 2, child, settings, '2026-01-20').unlocked).toBe(false);
  });

  it('honours a non-weekly cadence', () => {
    const fortnightly = { ...settings, cadenceDays: 14 };
    expect(weekGateStatus(track, 2, finishWeek1, fortnightly, '2026-01-12').unlocked).toBe(false);
    expect(weekGateStatus(track, 2, finishWeek1, fortnightly, '2026-01-19').unlocked).toBe(true);
  });
});
