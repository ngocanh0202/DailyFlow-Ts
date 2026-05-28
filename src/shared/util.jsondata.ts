import { randomUUID } from 'crypto';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { getPathLocalData } from '../pathResolver.js';

function ensureDirectoryExists(filePath: string): void {
  const directoryPath = path.dirname(filePath);
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

async function readJsonFileSafely<T = any>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fsp.readFile(filePath, 'utf8');
    const parsed = JSON.parse(content || '');
    return parsed;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return fallback;
    }
    try {
      return JSON.parse(fallback as any);
    } catch {
      return fallback;
    }
  }
}

async function writeJsonFileAtomically(filePath: string, data: any): Promise<void> {
  ensureDirectoryExists(filePath);
  const json = JSON.stringify(data, null, 2);
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(tempPath, json, 'utf8');
  await fsp.rename(tempPath, filePath);
}

function generateId(): string {
  try {
    return randomUUID();
  } catch {
    return String(Date.now()) + '-' + Math.random().toString(36).slice(2);
  }
}

class JsonStore {
  filePath: string;
  defaultData: { items: any[] };
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(options: JsonStoreOptions) {
    this.filePath = options.filePath;
    this.defaultData = { items: [] };
  }

  async init() {
    ensureDirectoryExists(this.filePath);
    if (!fs.existsSync(this.filePath)) {
      await writeJsonFileAtomically(this.filePath, this.defaultData);
    }
  }

  private enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
    const queued = this.writeQueue.then(operation, operation);
    this.writeQueue = queued.then(
      () => undefined,
      () => undefined
    );
    return queued;
  }

  async upsert(item: any): Promise<any> {
    if (!item || typeof item !== 'object') {
      throw new Error('Invalid item for upsert');
    }
    return this.enqueueWrite(async () => {
      const { items } = await this.readAllNow();
      const id = item?.id || generateId();
      const index = items.findIndex((existingItem: any) => existingItem.id === id);
      const nextItem = { ...(index === -1 ? {} : items[index]), ...item, id };
      if (index === -1) {
        items.push(nextItem);
      } else {
        items[index] = nextItem;
      }
      await this.writeAllNow({ items });
      return nextItem;
    });
  }

  private async readAllNow() {
    const data = await readJsonFileSafely(this.filePath, this.defaultData);
    if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
      return this.defaultData;
    }
    return data;
  }

  async readAll() {
    await this.writeQueue;
    return this.readAllNow();
  }

  private async writeAllNow(data: any): Promise<any> {
    const normalized = Array.isArray(data?.items) ? data : { items: [] };
    await writeJsonFileAtomically(this.filePath, normalized);
    return normalized;
  }

  async writeAll(data: any): Promise<any> {
    return this.enqueueWrite(() => this.writeAllNow(data));
  }

  async updateAll(updater: (data: { items: any[] }) => { items: any[] } | Promise<{ items: any[] }>): Promise<any> {
    return this.enqueueWrite(async () => {
      const current = await this.readAllNow();
      const next = await updater({ items: [...current.items] });
      return await this.writeAllNow(next);
    });
  }

  async getAll() {
    const { items } = await this.readAll();
    return items;
  }

  async getById(id: string): Promise<any | null> {
    const { items } = await this.readAll();
    return items.find((item: any) => item.id === id) || null;
  }

  async create(item: any): Promise<any> {
    return this.enqueueWrite(async () => {
      const { items } = await this.readAllNow();
      const id = item?.id || generateId();
      const newItem = { ...item, id };
      items.push(newItem);
      await this.writeAllNow({ items });
      return newItem;
    });
  }

  async update(id: string, partial: any): Promise<any | null> {
    return this.enqueueWrite(async () => {
      const { items } = await this.readAllNow();
      const index = items.findIndex((item: any) => item.id === id);
      if (index === -1) return null;
      const updated = { ...items[index], ...partial, id };
      items[index] = updated;
      await this.writeAllNow({ items });
      return updated;
    });
  }

  async remove(id: string): Promise<boolean> {
    return this.enqueueWrite(async () => {
      const { items } = await this.readAllNow();
      const next = items.filter((item: any) => item.id !== id);
      const removed = items.length !== next.length;
      if (removed) {
        await this.writeAllNow({ items: next });
      }
      return removed;
    });
  }

  async clear() {
    return this.enqueueWrite(async () => {
      await this.writeAllNow({ items: [] });
      return true;
    });
  }
}

export const taskStore = new JsonStore({
  filePath: getPathLocalData('task.json')
});

export const todoStore = new JsonStore({
  filePath: getPathLocalData('todo.json')
});

export const todoArchiveStore = new JsonStore({
  filePath: getPathLocalData('todoArchive.json')
});

export const aiAnalysisHistoryStore = new JsonStore({
  filePath: getPathLocalData('aiAnalysisHistory.json')
});

export const windowConfig = new JsonStore({
  filePath: getPathLocalData('windowConfig.json')
});

export {
  JsonStore,
  readJsonFileSafely,
  writeJsonFileAtomically
};
