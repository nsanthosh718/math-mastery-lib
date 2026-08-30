/**
 * Per-problem and per-week progress calculations.
 *
 * A problem record looks like:
 *   { attempted: boolean, keyRevealed: boolean, selfCheck: 'got-it'|'partly'|'not-yet'|null,
 *     secondsOnTask: number, updatedAt: 'YYYY-MM-DD' }
 *
 * "Complete with review" means the child attempted the problem AND then looked at
 * the worked answer key. Revealing the key without attempting does not count —
 * that is the whole point of the per-problem reveal.
 */

export const EMPTY_PROBLEM_RECORD = Object.freeze({
  attempted: false,
  keyRevealed: false,
  selfCheck: null,
  secondsOnTask: 0,
  updatedAt: null,
});

export const SELF_CHECK_OPTIONS = Object.freeze([
  { value: 'got-it', label: 'Got it', hint: 'Solved it and could explain why' },
  { value: 'partly', label: 'Partly', hint: 'Got there with help or after seeing the key' },
  { value: 'not-yet', label: 'Not yet', hint: 'Needs another go another day' },
]);

export function getProblemRecord(childState, problemId) {
  return { ...EMPTY_PROBLEM_RECORD, ...(childState?.problems?.[problemId] ?? {}) };
}

export function isProblemReviewed(record) {
  return Boolean(record.attempted && record.keyRevealed);
}

/**
 * Progress for a single week.
 * @returns {{total:number, attempted:number, reviewed:number, ratio:number,
 *            complete:boolean, secondsOnTask:number, selfChecks:object}}
 */
export function weekProgress(week, childState, threshold = 0.8) {
  const problems = week?.problems ?? [];
  const total = problems.length;
  let attempted = 0;
  let reviewed = 0;
  let secondsOnTask = 0;
  const selfChecks = { 'got-it': 0, partly: 0, 'not-yet': 0 };

  for (const problem of problems) {
    const record = getProblemRecord(childState, problem.id);
    if (record.attempted) attempted += 1;
    if (isProblemReviewed(record)) reviewed += 1;
    secondsOnTask += record.secondsOnTask || 0;
    if (record.selfCheck && record.selfCheck in selfChecks) selfChecks[record.selfCheck] += 1;
  }

  const ratio = total === 0 ? 0 : reviewed / total;
  return {
    total,
    attempted,
    reviewed,
    ratio,
    complete: total > 0 && ratio >= threshold,
    secondsOnTask,
    selfChecks,
  };
}

/** Progress across every week of a track, indexed by week number. */
export function trackProgress(track, childState, threshold = 0.8) {
  const byWeek = {};
  for (const week of track.weeks) {
    byWeek[week.week] = weekProgress(week, childState, threshold);
  }
  return byWeek;
}

export function weeksCompleted(track, childState, threshold = 0.8) {
  return track.weeks.filter((w) => weekProgress(w, childState, threshold).complete).length;
}

/**
 * The furthest week the child may currently work in: the first incomplete week,
 * or the last week once everything is done.
 */
export function currentWeekNumber(track, childState, threshold = 0.8) {
  for (const week of track.weeks) {
    if (!weekProgress(week, childState, threshold).complete) return week.week;
  }
  return track.weeks.length;
}
