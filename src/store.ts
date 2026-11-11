import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ScanResult } from './engine/types.js';

export interface ScanStore {
  save(result: ScanResult): Promise<void>;
  get(id: string): Promise<ScanResult | undefined>;
  list(limit: number): Promise<ScanResult[]>;
  delete(id: string): Promise<boolean>;
}

function validId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/** Stores ONLY redacted scan results, never uploaded workflow JSON. */
export class FileScanStore implements ScanStore {
  constructor(private readonly dataDir: string) {}

  private path(id: string): string {
    if (!validId(id)) throw new Error('Invalid scan ID');
    return join(this.dataDir, `${id}.json`);
  }

  async save(result: ScanResult): Promise<void> {
    await mkdir(this.dataDir, { recursive: true, mode: 0o700 });
    const filename = this.path(result.id);
    const tempFile = `${filename}.${process.pid}.tmp`;
    try {
      await writeFile(tempFile, JSON.stringify(result), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      await rename(tempFile, filename);
    } finally {
      await rm(tempFile, { force: true }).catch(() => {});
    }
  }

  async get(id: string): Promise<ScanResult | undefined> {
    if (!validId(id)) return undefined;
    try {
      const raw = await readFile(this.path(id), 'utf8');
      return JSON.parse(raw) as ScanResult;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    }
  }

  async list(limit: number): Promise<ScanResult[]> {
    await mkdir(this.dataDir, { recursive: true, mode: 0o700 });
    const filenames = (await readdir(this.dataDir)).filter(f => /^[0-9a-f-]{36}\.json$/i.test(f));
    const results = await Promise.all(filenames.map(async file => {
      try { return JSON.parse(await readFile(join(this.dataDir, file), 'utf8')) as ScanResult; }
      catch { return undefined; }
    }));
    return results.filter((r): r is ScanResult => !!r).sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0,limit);
  }

  async delete(id: string): Promise<boolean> {
    if (!validId(id)) return false;
    try { await rm(this.path(id)); return true; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }
}
