import { randomUUID } from 'crypto';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  // const tempFilePath = `${filePath}.tmp`;
  const json = JSON.stringify(data, null, 2);
  await fsp.writeFile(filePath, json, 'utf8');
  // await fsp.rename(tempFilePath, filePath);
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

  async upsert(item: any): Promise<any> {
    if (!item || typeof item !== 'object') {
      throw new Error('Invalid item for upsert');
    }
    const existing = await this.getById(item.id);
    if (existing) {
      return this.update(item.id, item);
    } else {
      return this.create(item);
    }
  }

  async readAll() {
    const data = await readJsonFileSafely(this.filePath, this.defaultData);
    if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
      return this.defaultData;
    }
    return data;
  }

  async writeAll(data: any): Promise<any> {
    const normalized = Array.isArray(data?.items) ? data : { items: [] };
    await writeJsonFileAtomically(this.filePath, normalized);
    return normalized;
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
    const { items } = await this.readAll();
    const newItem = { id: item?.id || generateId(), ...item };
    items.push(newItem);
    await this.writeAll({ items });
    return newItem;
  }

  async update(id: string, partial: any): Promise<any | null> {
    const { items } = await this.readAll();
    const index = items.findIndex((item: any) => item.id === id);
    if (index === -1) return null;
    const updated = { ...items[index], ...partial, id };
    items[index] = updated;
    await this.writeAll({ items });
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    const { items } = await this.readAll();
    const next = items.filter((item: any) => item.id !== id);
    const removed = items.length !== next.length;
    if (removed) {
      await this.writeAll({ items: next });
    }
    return removed;
  }

  async clear() {
    await this.writeAll({ items: [] });
    return true;
  }
}

export const taskStore = new JsonStore({
  filePath: path.resolve(__dirname, '../localdata/task.json')
});

export const todoStore = new JsonStore({
  filePath: path.resolve(__dirname, '../localdata/todo.json')
});

export const windowConfig = new JsonStore({
  filePath: path.resolve(__dirname, '../localdata/windowConfig.json')
});

export {
  JsonStore,
  readJsonFileSafely,
  writeJsonFileAtomically
};