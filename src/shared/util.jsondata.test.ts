import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JsonStore } from './util.jsondata';

vi.mock('../pathResolver.js', () => ({
  getPathLocalData: (name: string) => path.join(os.tmpdir(), 'dailyflow-jsonstore-singletons', name),
}));

const tempDirs: string[] = [];

async function createTempStore() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'dailyflow-jsonstore-'));
  tempDirs.push(dir);
  const store = new JsonStore({ filePath: path.join(dir, 'items.json') });
  await store.init();
  return store;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('JsonStore', () => {
  it('preserves concurrent upserts without dropping earlier writes', async () => {
    const store = await createTempStore();

    await Promise.all([
      store.upsert({ id: 'task-1', title: 'First' }),
      store.upsert({ id: 'task-2', title: 'Second' }),
      store.upsert({ id: 'task-3', title: 'Third' }),
    ]);

    expect((await store.getAll()).map((item) => item.id).sort()).toEqual(['task-1', 'task-2', 'task-3']);
  });

  it('orders direct writeAll calls with later upserts', async () => {
    const store = await createTempStore();

    await Promise.all([
      store.writeAll({ items: [{ id: 'seed', title: 'Seed' }] }),
      store.upsert({ id: 'task-1', title: 'First' }),
    ]);

    expect((await store.getAll()).map((item) => item.id).sort()).toEqual(['seed', 'task-1']);
  });

  it('runs read-modify-write transactions without overwriting queued updates', async () => {
    const store = await createTempStore();
    await store.writeAll({ items: [{ id: 'existing', title: 'Existing', expired: true }] });

    await Promise.all([
      store.updateAll(({ items }) => ({
        items: items.filter((item) => !item.expired),
      })),
      store.upsert({ id: 'new', title: 'New' }),
    ]);

    expect((await store.getAll()).map((item) => item.id).sort()).toEqual(['new']);
  });

  it('waits for queued writes before serving reads', async () => {
    const store = await createTempStore();

    const pendingWrite = store.upsert({ id: 'task-1', title: 'First' });
    const items = await store.getAll();
    await pendingWrite;

    expect(items.map((item) => item.id)).toEqual(['task-1']);
  });

  it('generates an id when create receives an undefined id property', async () => {
    const store = await createTempStore();

    const created = await store.create({ id: undefined, title: 'Needs id' });

    expect(created.id).toEqual(expect.any(String));
    expect(created.id).not.toBe('');
    expect((await store.getAll())[0].id).toBe(created.id);
  });
});
