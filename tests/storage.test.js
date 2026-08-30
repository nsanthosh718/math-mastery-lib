import { describe, it, expect } from 'vitest';
import { createLocalStorageAdapter, createMemoryAdapter, STORAGE_KEY } from '../src/lib/storage.js';

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
}

describe('localStorage adapter', () => {
  it('round-trips state', async () => {
    const adapter = createLocalStorageAdapter(STORAGE_KEY, fakeStorage());
    await adapter.save({ version: 1, hello: 'world' });
    expect(await adapter.load()).toEqual({ version: 1, hello: 'world' });
  });

  it('returns null rather than throwing on corrupt data', async () => {
    const adapter = createLocalStorageAdapter(STORAGE_KEY, fakeStorage({ [STORAGE_KEY]: '{oops' }));
    expect(await adapter.load()).toBeNull();
  });

  it('degrades quietly when storage is unavailable', async () => {
    const adapter = createLocalStorageAdapter(STORAGE_KEY, undefined);
    await adapter.save({ a: 1 });
    expect(await adapter.load()).toBeNull();
  });

  it('does not throw when writing fails, so the session keeps working', async () => {
    const throwing = { ...fakeStorage(), setItem: () => { throw new Error('quota'); } };
    const adapter = createLocalStorageAdapter(STORAGE_KEY, throwing);
    await expect(adapter.save({ a: 1 })).resolves.toBeUndefined();
  });

  it('clears', async () => {
    const adapter = createLocalStorageAdapter(STORAGE_KEY, fakeStorage());
    await adapter.save({ a: 1 });
    await adapter.clear();
    expect(await adapter.load()).toBeNull();
  });
});

describe('memory adapter', () => {
  it('behaves like the real one', async () => {
    const adapter = createMemoryAdapter();
    expect(await adapter.load()).toBeNull();
    await adapter.save({ a: 1 });
    expect(await adapter.load()).toEqual({ a: 1 });
    await adapter.clear();
    expect(await adapter.load()).toBeNull();
  });
});
