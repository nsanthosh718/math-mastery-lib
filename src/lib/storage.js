/**
 * Persistence seam.
 *
 * The MVP keeps everything in localStorage, which is enough for one household on
 * one device. Everything the app does goes through the small interface below
 * (`load`, `save`, `clear`), so swapping in a real backend later means writing one
 * more adapter and passing it to the provider — no component changes.
 *
 * To hook up real persistence:
 *   1. Implement an adapter with the same three methods (async is fine — the
 *      provider already awaits them).
 *   2. Key the remote record by household, not by child, so both profiles stay in
 *      one document and a parent sees a consistent dashboard.
 *   3. Keep `version` in the payload and migrate on load; the curriculum JSON is
 *      free to change under saved progress because progress is keyed by problem id.
 */

export const STORAGE_KEY = 'mathtrack.state.v1';

export function createLocalStorageAdapter(key = STORAGE_KEY, storage = globalThis.localStorage) {
  return {
    async load() {
      if (!storage) return null;
      try {
        const raw = storage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch {
        // Corrupt or unreadable storage should degrade to a fresh start, never crash.
        return null;
      }
    },
    async save(state) {
      if (!storage) return;
      try {
        storage.setItem(key, JSON.stringify(state));
      } catch {
        // Quota or private-browsing failures are non-fatal; the session still works.
      }
    },
    async clear() {
      if (!storage) return;
      try {
        storage.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}

/** An adapter that keeps state in memory only — used by tests and SSR. */
export function createMemoryAdapter(initial = null) {
  let value = initial;
  return {
    async load() {
      return value;
    },
    async save(state) {
      value = state;
    },
    async clear() {
      value = null;
    },
  };
}
