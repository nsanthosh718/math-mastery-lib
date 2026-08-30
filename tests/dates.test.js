import { describe, it, expect } from 'vitest';
import { addDays, daysBetween, isOnOrBefore, toISODate, formatFriendly } from '../src/lib/dates.js';

describe('date helpers', () => {
  it('adds and subtracts days across month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
  });

  it('handles a leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('counts whole days in both directions', () => {
    expect(daysBetween('2026-01-05', '2026-01-12')).toBe(7);
    expect(daysBetween('2026-01-12', '2026-01-05')).toBe(-7);
    expect(daysBetween('2026-01-05', '2026-01-05')).toBe(0);
  });

  it('compares dates inclusively', () => {
    expect(isOnOrBefore('2026-01-05', '2026-01-05')).toBe(true);
    expect(isOnOrBefore('2026-01-06', '2026-01-05')).toBe(false);
  });

  it('normalises Date objects and timestamps to plain ISO days', () => {
    expect(toISODate(new Date(Date.UTC(2026, 0, 5, 23, 30)))).toBe('2026-01-05');
    expect(toISODate('2026-01-05T10:00:00.000Z')).toBe('2026-01-05');
  });

  it('formats a date without shifting it into the previous day', () => {
    expect(formatFriendly('2026-01-05')).toContain('5');
  });
});
