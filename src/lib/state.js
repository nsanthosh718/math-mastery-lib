/**
 * App state shape, defaults, and the reducer. Kept free of React so the same
 * transitions can be unit-tested directly.
 */

import { todayISO } from './dates.js';
import { EMPTY_PROBLEM_RECORD } from './progress.js';

export const STATE_VERSION = 1;

export const DEFAULT_SETTINGS = Object.freeze({
  startDate: null, // set on first run to today
  cadenceDays: 7,
  completionThreshold: 0.8,
  remindWithinDays: 2,
  inactivityDays: 3,
  privilegeName: 'screen time',
  privilegeGraceDays: 2,
  enabledRules: ['overdue-week', 'due-soon', 'inactivity'],
});

export function makeChild({ id, name, trackId }) {
  return {
    id,
    name,
    trackId,
    problems: {},
    activity: [],
    overrides: [],
    reasoningRatings: [],
  };
}

export function initialState(today = todayISO()) {
  return {
    version: STATE_VERSION,
    settings: { ...DEFAULT_SETTINGS, startDate: today },
    children: [
      makeChild({ id: 'child-1', name: 'Kindergartener', trackId: 'kindergarten' }),
      makeChild({ id: 'child-2', name: 'Fifth Grader', trackId: 'grade5' }),
    ],
  };
}

/** Fill in anything a saved payload predates, so old saves keep working. */
export function hydrate(saved, today = todayISO()) {
  if (!saved || typeof saved !== 'object') return initialState(today);
  const base = initialState(today);
  return {
    version: STATE_VERSION,
    settings: { ...base.settings, ...(saved.settings ?? {}) },
    children: (saved.children ?? base.children).map((child) => ({
      ...makeChild({ id: child.id, name: child.name, trackId: child.trackId }),
      ...child,
    })),
  };
}

function updateChild(state, childId, updater) {
  return {
    ...state,
    children: state.children.map((c) => (c.id === childId ? updater(c) : c)),
  };
}

function withActivity(child, date) {
  return child.activity.includes(date) ? child.activity : [...child.activity, date].sort();
}

export function reducer(state, action) {
  switch (action.type) {
    case 'replace':
      return action.state;

    case 'set-settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case 'set-child':
      return updateChild(state, action.childId, (child) => ({ ...child, ...action.patch }));

    /** Records an attempt and stamps today onto the activity log for streaks. */
    case 'mark-attempted':
      return updateChild(state, action.childId, (child) => ({
        ...child,
        activity: withActivity(child, action.date),
        problems: {
          ...child.problems,
          [action.problemId]: {
            ...EMPTY_PROBLEM_RECORD,
            ...child.problems[action.problemId],
            attempted: true,
            updatedAt: action.date,
          },
        },
      }));

    case 'reveal-key':
      return updateChild(state, action.childId, (child) => ({
        ...child,
        activity: withActivity(child, action.date),
        problems: {
          ...child.problems,
          [action.problemId]: {
            ...EMPTY_PROBLEM_RECORD,
            ...child.problems[action.problemId],
            // Revealing implies the child has had a go — the UI asks first.
            attempted: true,
            keyRevealed: true,
            updatedAt: action.date,
          },
        },
      }));

    case 'set-self-check':
      return updateChild(state, action.childId, (child) => ({
        ...child,
        problems: {
          ...child.problems,
          [action.problemId]: {
            ...EMPTY_PROBLEM_RECORD,
            ...child.problems[action.problemId],
            selfCheck: action.value,
            updatedAt: action.date,
          },
        },
      }));

    case 'add-time':
      return updateChild(state, action.childId, (child) => ({
        ...child,
        problems: {
          ...child.problems,
          [action.problemId]: {
            ...EMPTY_PROBLEM_RECORD,
            ...child.problems[action.problemId],
            secondsOnTask:
              (child.problems[action.problemId]?.secondsOnTask ?? 0) + action.seconds,
          },
        },
      }));

    case 'toggle-override':
      return updateChild(state, action.childId, (child) => ({
        ...child,
        overrides: child.overrides.includes(action.week)
          ? child.overrides.filter((w) => w !== action.week)
          : [...child.overrides, action.week],
      }));

    case 'log-reasoning-rating':
      return updateChild(state, action.childId, (child) => ({
        ...child,
        reasoningRatings: [
          ...child.reasoningRatings.filter(
            (r) => !(r.week === action.week && r.date === action.date),
          ),
          { week: action.week, date: action.date, rating: action.rating, note: action.note ?? '' },
        ].sort((a, b) => a.week - b.week),
      }));

    case 'reset-week':
      return updateChild(state, action.childId, (child) => {
        const problems = { ...child.problems };
        for (const id of action.problemIds) delete problems[id];
        return { ...child, problems };
      });

    default:
      return state;
  }
}
