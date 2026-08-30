import { describe, it, expect } from 'vitest';
import {
  createRuleEngine,
  overdueWeekRule,
  dueSoonRule,
  inactivityRule,
  privilegeHoldRule,
  BUILT_IN_RULES,
} from '../src/lib/rules.js';

const track = {
  weeks: [
    { week: 1, problems: [] },
    { week: 2, problems: [] },
  ],
};
const settings = {
  startDate: '2026-01-05',
  cadenceDays: 7,
  remindWithinDays: 2,
  inactivityDays: 3,
  privilegeName: 'tablet time',
  privilegeGraceDays: 2,
};
const gates = {
  1: { unlocked: true, releaseDate: '2026-01-05', dueDate: '2026-01-11' },
  2: { unlocked: false, releaseDate: '2026-01-12', dueDate: '2026-01-18' },
};
const incomplete = { total: 5, reviewed: 2, complete: false };
const done = { total: 5, reviewed: 5, complete: true };

const ctx = (overrides = {}) => ({
  child: { id: 'c1', activity: ['2026-01-06'] },
  track,
  settings,
  gates,
  progressByWeek: { 1: incomplete, 2: incomplete },
  streak: { current: 0, longest: 2 },
  today: '2026-01-14',
  ...overrides,
});

describe('overdueWeekRule', () => {
  it('flags an unlocked week past its due date', () => {
    const [event] = overdueWeekRule.evaluate(ctx());
    expect(event).toMatchObject({ ruleId: 'overdue-week', week: 1, severity: 'warn' });
    expect(event.title).toContain('3 days overdue');
  });

  it('escalates to alert after a full week late', () => {
    const [event] = overdueWeekRule.evaluate(ctx({ today: '2026-01-18' }));
    expect(event.severity).toBe('alert');
  });

  it('stays quiet when the week is complete', () => {
    expect(overdueWeekRule.evaluate(ctx({ progressByWeek: { 1: done, 2: done } }))).toEqual([]);
  });

  it('never flags a week that has not unlocked yet', () => {
    const events = overdueWeekRule.evaluate(ctx({ today: '2026-01-30' }));
    expect(events.map((e) => e.week)).toEqual([1]);
  });
});

describe('dueSoonRule', () => {
  it('warns on the due date itself', () => {
    const [event] = dueSoonRule.evaluate(ctx({ today: '2026-01-11' }));
    expect(event).toMatchObject({ severity: 'warn', week: 1 });
    expect(event.title).toContain('due today');
  });

  it('gives an informational nudge inside the reminder window', () => {
    const [event] = dueSoonRule.evaluate(ctx({ today: '2026-01-10' }));
    expect(event.severity).toBe('info');
    expect(event.detail).toContain('3 problems left');
  });

  it('says nothing while the due date is still far off', () => {
    expect(dueSoonRule.evaluate(ctx({ today: '2026-01-06' }))).toEqual([]);
  });

  it('says nothing once the week is late — that is the overdue rule’s job', () => {
    expect(dueSoonRule.evaluate(ctx({ today: '2026-01-14' }))).toEqual([]);
  });
});

describe('inactivityRule', () => {
  it('flags a gap at or beyond the configured limit', () => {
    const event = inactivityRule.evaluate(ctx({ today: '2026-01-09' }));
    expect(event).toMatchObject({ ruleId: 'inactivity', severity: 'warn' });
  });

  it('escalates once the gap doubles', () => {
    expect(inactivityRule.evaluate(ctx({ today: '2026-01-12' })).severity).toBe('alert');
  });

  it('stays quiet inside the limit and when there is no history at all', () => {
    expect(inactivityRule.evaluate(ctx({ today: '2026-01-08' }))).toBeNull();
    expect(inactivityRule.evaluate(ctx({ child: { id: 'c1', activity: [] } }))).toBeNull();
  });
});

describe('privilegeHoldRule', () => {
  it('is off by default so nothing is restricted without the parent opting in', () => {
    expect(privilegeHoldRule.defaultEnabled).toBe(false);
  });

  it('holds the named privilege only after the grace period', () => {
    expect(privilegeHoldRule.evaluate(ctx({ today: '2026-01-13' }))).toBeNull();
    const event = privilegeHoldRule.evaluate(ctx({ today: '2026-01-14' }));
    expect(event).toMatchObject({ severity: 'alert', action: 'hold-privilege' });
    expect(event.title).toContain('tablet time');
  });
});

describe('createRuleEngine', () => {
  it('runs only the default rules when no selection is given', () => {
    const events = createRuleEngine().evaluate(ctx());
    expect(events.some((e) => e.ruleId === 'privilege-hold')).toBe(false);
  });

  it('runs exactly the rules it is told to', () => {
    const events = createRuleEngine().evaluate(ctx(), ['privilege-hold']);
    expect(events.map((e) => e.ruleId)).toEqual(['privilege-hold']);
  });

  it('sorts the most severe event first', () => {
    const events = createRuleEngine().evaluate(ctx({ today: '2026-01-20' }), [
      'overdue-week',
      'inactivity',
    ]);
    expect(events[0].severity).toBe('alert');
  });

  it('accepts a custom rule without any change to the engine', () => {
    const custom = {
      id: 'sibling-race',
      label: 'Sibling race',
      description: 'test rule',
      defaultEnabled: true,
      evaluate: ({ child }) => ({
        ruleId: 'sibling-race',
        childId: child.id,
        severity: 'info',
        title: 'Custom rule ran',
        detail: '',
      }),
    };
    const events = createRuleEngine([...BUILT_IN_RULES, custom]).evaluate(ctx());
    expect(events.some((e) => e.ruleId === 'sibling-race')).toBe(true);
  });

  it('survives a rule that throws instead of taking the dashboard down', () => {
    const broken = {
      id: 'broken',
      label: 'Broken rule',
      description: '',
      defaultEnabled: true,
      evaluate() {
        throw new Error('boom');
      },
    };
    const events = createRuleEngine([broken]).evaluate(ctx());
    expect(events).toHaveLength(1);
    expect(events[0].detail).toBe('boom');
  });
});
