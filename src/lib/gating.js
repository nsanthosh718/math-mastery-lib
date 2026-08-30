/**
 * Week gating: schedule-based release combined with completion of the prior week.
 *
 * Week N is available when BOTH hold:
 *   1. its scheduled release date has arrived, and
 *   2. week N-1 has been completed to the configured threshold.
 * A parent override on a week bypasses both checks for that week only.
 */

import { addDays, isOnOrBefore } from './dates.js';
import { weekProgress } from './progress.js';

export const LOCK_REASONS = Object.freeze({
  UNLOCKED: 'unlocked',
  OVERRIDDEN: 'overridden',
  NOT_RELEASED: 'not-released',
  PRIOR_INCOMPLETE: 'prior-incomplete',
});

/** The date week N becomes available on the schedule. Week 1 opens on the start date. */
export function weekReleaseDate(startDate, weekNumber, cadenceDays = 7) {
  return addDays(startDate, (weekNumber - 1) * cadenceDays);
}

/** The date week N is expected to be finished by — the day before the next release. */
export function weekDueDate(startDate, weekNumber, cadenceDays = 7) {
  return addDays(startDate, weekNumber * cadenceDays - 1);
}

/**
 * @returns {{unlocked:boolean, reason:string, releaseDate:string, dueDate:string}}
 */
export function weekGateStatus(track, weekNumber, childState, settings, today) {
  const { startDate, cadenceDays = 7, completionThreshold = 0.8 } = settings;
  const releaseDate = weekReleaseDate(startDate, weekNumber, cadenceDays);
  const dueDate = weekDueDate(startDate, weekNumber, cadenceDays);
  const base = { releaseDate, dueDate };

  if (childState?.overrides?.includes(weekNumber)) {
    return { ...base, unlocked: true, reason: LOCK_REASONS.OVERRIDDEN };
  }

  if (!isOnOrBefore(releaseDate, today)) {
    return { ...base, unlocked: false, reason: LOCK_REASONS.NOT_RELEASED };
  }

  if (weekNumber > 1) {
    const previous = track.weeks.find((w) => w.week === weekNumber - 1);
    const previousProgress = weekProgress(previous, childState, completionThreshold);
    if (!previousProgress.complete) {
      return { ...base, unlocked: false, reason: LOCK_REASONS.PRIOR_INCOMPLETE };
    }
  }

  return { ...base, unlocked: true, reason: LOCK_REASONS.UNLOCKED };
}

/** Gate status for every week, indexed by week number. */
export function allGateStatuses(track, childState, settings, today) {
  const out = {};
  for (const week of track.weeks) {
    out[week.week] = weekGateStatus(track, week.week, childState, settings, today);
  }
  return out;
}

export function describeLockReason(reason, status) {
  switch (reason) {
    case LOCK_REASONS.NOT_RELEASED:
      return `Opens ${status.releaseDate}`;
    case LOCK_REASONS.PRIOR_INCOMPLETE:
      return 'Finish the previous week first';
    case LOCK_REASONS.OVERRIDDEN:
      return 'Unlocked by a parent';
    default:
      return 'Open';
  }
}
