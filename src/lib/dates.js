/**
 * Date helpers. Dates are handled as plain 'YYYY-MM-DD' strings and compared in
 * UTC so that a family crossing a timezone boundary never sees a week silently
 * unlock or expire a day early.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toISODate(value) {
  if (typeof value === 'string') return value.slice(0, 10);
  const d = value instanceof Date ? value : new Date(value);
  return d.toISOString().slice(0, 10);
}

export function parseISODate(iso) {
  const [y, m, d] = toISODate(iso).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(iso, days) {
  return toISODate(new Date(parseISODate(iso) + days * MS_PER_DAY));
}

/** Whole days from `from` to `to`. Negative when `to` is earlier. */
export function daysBetween(from, to) {
  return Math.round((parseISODate(to) - parseISODate(from)) / MS_PER_DAY);
}

export function isOnOrBefore(a, b) {
  return parseISODate(a) <= parseISODate(b);
}

export function todayISO(now = new Date()) {
  return toISODate(now);
}

export function formatFriendly(iso) {
  const [y, m, d] = toISODate(iso).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
