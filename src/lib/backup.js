/**
 * Progress backup and restore.
 *
 * Progress lives in the browser's localStorage, which a device wipe, a cleared
 * cache, or a switch of browser will take with it. Over a twelve-week programme
 * that is a real risk, so a parent can export a snapshot and restore it — on the
 * same device or a different one. This is also the only way to move a child's
 * progress between devices while the app has no backend.
 */

import { STATE_VERSION, hydrate } from './state.js';

export function makeBackup(state, today) {
  return JSON.stringify(
    { app: 'mathtrack', version: STATE_VERSION, exportedAt: today, state },
    null,
    2,
  );
}

export function backupFilename(today) {
  return `mathtrack-backup-${today}.json`;
}

/**
 * Parses a backup, accepting either the wrapped export format or a bare state
 * object, so a hand-edited or partial file still restores.
 * @returns {{ok: true, state: object} | {ok: false, error: string}}
 */
export function parseBackup(text, today) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That is not valid JSON. Paste the whole backup, including the braces.' };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'That backup is empty.' };
  }

  const candidate = parsed.state ?? parsed;
  if (!Array.isArray(candidate.children)) {
    return { ok: false, error: 'That file does not look like a MathTrack backup — no child profiles in it.' };
  }

  return { ok: true, state: hydrate(candidate, today) };
}

/** A short human summary so a parent can confirm before overwriting. */
export function describeBackup(state) {
  return state.children
    .map((child) => {
      const done = Object.values(child.problems ?? {}).filter(
        (r) => r.attempted && r.keyRevealed,
      ).length;
      return `${child.name}: ${done} problem${done === 1 ? '' : 's'} reviewed`;
    })
    .join(' · ');
}
