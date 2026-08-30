/**
 * Streak and consistency metrics, derived from the set of dates on which the
 * child recorded at least one attempt. Activity is stored as an array of
 * 'YYYY-MM-DD' strings so the metric survives any persistence backend.
 */

import { addDays, daysBetween } from './dates.js';

export function activeDates(childState) {
  return Array.from(new Set(childState?.activity ?? [])).sort();
}

/**
 * Consecutive active days ending today or yesterday. Yesterday still counts so
 * that a child who has not sat down yet today does not see their streak
 * already broken — it breaks only once a full day is missed.
 */
export function currentStreak(childState, today) {
  const dates = new Set(activeDates(childState));
  if (dates.size === 0) return 0;

  let cursor = today;
  if (!dates.has(cursor)) {
    cursor = addDays(today, -1);
    if (!dates.has(cursor)) return 0;
  }

  let streak = 0;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(childState) {
  const dates = activeDates(childState);
  if (dates.length === 0) return 0;

  let best = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i += 1) {
    run = daysBetween(dates[i - 1], dates[i]) === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

/**
 * Share of days since the start date on which the child did some work.
 * A five-day-a-week rhythm lands around 0.71, so treat ~0.6+ as on track
 * rather than expecting 1.0.
 */
export function consistency(childState, startDate, today) {
  const elapsed = daysBetween(startDate, today) + 1;
  if (elapsed <= 0) return 0;
  const active = activeDates(childState).filter(
    (d) => daysBetween(startDate, d) >= 0 && daysBetween(d, today) >= 0,
  ).length;
  return active / elapsed;
}

export function streakSummary(childState, startDate, today) {
  return {
    current: currentStreak(childState, today),
    longest: longestStreak(childState),
    activeDays: activeDates(childState).length,
    consistency: consistency(childState, startDate, today),
  };
}
