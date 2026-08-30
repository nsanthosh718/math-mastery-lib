import { describe, it, expect } from 'vitest';
import { makeBackup, parseBackup, describeBackup, backupFilename } from '../src/lib/backup.js';
import { initialState } from '../src/lib/state.js';

const today = '2026-01-10';

function stateWithProgress() {
  const state = initialState('2026-01-05');
  state.children[1].problems['g5-w01-p1'] = {
    attempted: true, keyRevealed: true, selfCheck: 'got-it', secondsOnTask: 60, updatedAt: today,
  };
  state.children[1].activity = ['2026-01-05', '2026-01-06'];
  return state;
}

describe('backup round trip', () => {
  it('restores exactly what was exported', () => {
    const original = stateWithProgress();
    const result = parseBackup(makeBackup(original, today), today);
    expect(result.ok).toBe(true);
    expect(result.state.children[1].problems['g5-w01-p1'].keyRevealed).toBe(true);
    expect(result.state.children[1].activity).toEqual(['2026-01-05', '2026-01-06']);
    expect(result.state.settings.startDate).toBe('2026-01-05');
  });

  it('accepts a bare state object as well as the wrapped export', () => {
    const bare = JSON.stringify(stateWithProgress());
    expect(parseBackup(bare, today).ok).toBe(true);
  });

  it('names the file by date', () => {
    expect(backupFilename(today)).toBe('mathtrack-backup-2026-01-10.json');
  });
});

describe('backup validation', () => {
  it('rejects invalid JSON with a message a parent can act on', () => {
    const result = parseBackup('{not json', today);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/valid JSON/);
  });

  it('rejects a JSON file that is not a MathTrack backup', () => {
    const result = parseBackup('{"hello":"world"}', today);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/child profiles/);
  });

  it('rejects empty input', () => {
    expect(parseBackup('null', today).ok).toBe(false);
  });

  it('backfills fields missing from an older backup', () => {
    const old = JSON.stringify({ children: [{ id: 'c1', name: 'A', trackId: 'grade5' }] });
    const result = parseBackup(old, today);
    expect(result.ok).toBe(true);
    expect(result.state.children[0].overrides).toEqual([]);
    expect(result.state.settings.cadenceDays).toBe(7);
  });
});

describe('describeBackup', () => {
  it('summarises each child so a parent can confirm before overwriting', () => {
    expect(describeBackup(stateWithProgress())).toBe(
      'Kindergartener: 0 problems reviewed · Fifth Grader: 1 problem reviewed',
    );
  });
});
