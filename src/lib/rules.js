/**
 * Pluggable accountability rule engine.
 *
 * A rule is a plain object:
 *   { id, label, description, defaultEnabled, evaluate(context) -> event | event[] | null }
 *
 * A context is:
 *   { child, track, today, settings, gates, progressByWeek, streak }
 *
 * An event is:
 *   { ruleId, childId, severity: 'info'|'warn'|'alert', title, detail, week? , action? }
 *
 * Rules never mutate state and never talk to the outside world. The engine only
 * produces events; deciding what to DO with an event (show a parent flag, send a
 * push, pause a privilege) belongs to the consumer. That separation is what makes
 * a rule that texts a parent, or one that calls a screen-time API, a drop-in
 * addition later rather than a rewrite.
 */

import { daysBetween } from './dates.js';

export const SEVERITY_ORDER = { info: 0, warn: 1, alert: 2 };

/** Week is past its due date and still not complete. The baseline rule. */
export const overdueWeekRule = {
  id: 'overdue-week',
  label: 'Overdue week flag',
  description: 'Raises a parent flag when a week passes its due date unfinished.',
  defaultEnabled: true,
  evaluate({ child, track, today, gates, progressByWeek }) {
    const events = [];
    for (const week of track.weeks) {
      const gate = gates[week.week];
      const progress = progressByWeek[week.week];
      if (!gate?.unlocked || progress?.complete) continue;
      const daysLate = daysBetween(gate.dueDate, today);
      if (daysLate <= 0) continue;
      events.push({
        ruleId: 'overdue-week',
        childId: child.id,
        week: week.week,
        severity: daysLate >= 7 ? 'alert' : 'warn',
        title: `Week ${week.week} is ${daysLate} day${daysLate === 1 ? '' : 's'} overdue`,
        detail: `${progress.reviewed} of ${progress.total} problems finished with the answer key reviewed. Due ${gate.dueDate}.`,
        action: 'review-with-child',
      });
    }
    return events;
  },
};

/** Escalating reminders as a due date approaches, before anything is actually late. */
export const dueSoonRule = {
  id: 'due-soon',
  label: 'Escalating reminder',
  description: 'Warns while a week is still open but close to its due date.',
  defaultEnabled: true,
  evaluate({ child, track, today, gates, progressByWeek, settings }) {
    const warnWithinDays = settings.remindWithinDays ?? 2;
    const events = [];
    for (const week of track.weeks) {
      const gate = gates[week.week];
      const progress = progressByWeek[week.week];
      if (!gate?.unlocked || progress?.complete) continue;
      const daysLeft = daysBetween(today, gate.dueDate);
      if (daysLeft < 0 || daysLeft > warnWithinDays) continue;
      const remaining = progress.total - progress.reviewed;
      events.push({
        ruleId: 'due-soon',
        childId: child.id,
        week: week.week,
        severity: daysLeft === 0 ? 'warn' : 'info',
        title:
          daysLeft === 0
            ? `Week ${week.week} is due today`
            : `Week ${week.week} is due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
        detail: `${remaining} problem${remaining === 1 ? '' : 's'} left to finish and review.`,
        action: 'nudge',
      });
    }
    return events;
  },
};

/** No work recorded for several days running. */
export const inactivityRule = {
  id: 'inactivity',
  label: 'Inactivity alert',
  description: 'Flags a gap of several days with no work recorded.',
  defaultEnabled: true,
  evaluate({ child, today, settings, streak }) {
    const limit = settings.inactivityDays ?? 3;
    const dates = child.activity ?? [];
    if (dates.length === 0) return null;
    const last = dates.slice().sort().at(-1);
    const idle = daysBetween(last, today);
    if (idle < limit) return null;
    return {
      ruleId: 'inactivity',
      childId: child.id,
      severity: idle >= limit * 2 ? 'alert' : 'warn',
      title: `No math for ${idle} days`,
      detail: `Last session was ${last}. Longest streak so far: ${streak.longest} day${streak.longest === 1 ? '' : 's'}.`,
      action: 'nudge',
    };
  },
};

/**
 * Privilege hold — the pluggable hook for "restrict another app/privilege the
 * parent manages elsewhere". It only emits an event describing the hold; wiring
 * that to a real screen-time control is a later integration, and this rule is
 * where that call would go.
 */
export const privilegeHoldRule = {
  id: 'privilege-hold',
  label: 'Privilege hold',
  description:
    'When a week is more than the grace period overdue, marks the configured privilege as on hold.',
  defaultEnabled: false,
  evaluate({ child, track, today, gates, progressByWeek, settings }) {
    const grace = settings.privilegeGraceDays ?? 2;
    const privilege = settings.privilegeName ?? 'screen time';
    for (const week of track.weeks) {
      const gate = gates[week.week];
      const progress = progressByWeek[week.week];
      if (!gate?.unlocked || progress?.complete) continue;
      const daysLate = daysBetween(gate.dueDate, today);
      if (daysLate > grace) {
        return {
          ruleId: 'privilege-hold',
          childId: child.id,
          week: week.week,
          severity: 'alert',
          title: `${privilege} on hold`,
          detail: `Week ${week.week} has been overdue for ${daysLate} days (grace period is ${grace}). Lifts when the week reaches the completion threshold.`,
          action: 'hold-privilege',
        };
      }
    }
    return null;
  },
};

export const BUILT_IN_RULES = [overdueWeekRule, dueSoonRule, inactivityRule, privilegeHoldRule];

export function createRuleEngine(rules = BUILT_IN_RULES) {
  return {
    rules,
    /**
     * @param {object} context
     * @param {string[]} enabledIds ids of rules to run; omit to run every rule
     * @returns {object[]} events, most severe first
     */
    evaluate(context, enabledIds) {
      const active = enabledIds
        ? rules.filter((r) => enabledIds.includes(r.id))
        : rules.filter((r) => r.defaultEnabled);
      const events = [];
      for (const rule of active) {
        let result;
        try {
          result = rule.evaluate(context);
        } catch (error) {
          // A misbehaving custom rule must not take the dashboard down with it.
          events.push({
            ruleId: rule.id,
            childId: context.child?.id,
            severity: 'info',
            title: `Rule "${rule.label}" could not run`,
            detail: String(error?.message ?? error),
          });
          continue;
        }
        if (!result) continue;
        events.push(...(Array.isArray(result) ? result : [result]));
      }
      return events.sort(
        (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity] || (a.week ?? 0) - (b.week ?? 0),
      );
    },
  };
}
