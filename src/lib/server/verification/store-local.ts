import { readFile, writeFile, mkdir, stat as fsStat } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { ScooterVerification } from './types';
import type { VerificationStore } from './store';

const DATA_DIR = join(process.cwd(), 'data');
const STORE_FILE = join(DATA_DIR, 'verification-store.json');

/**
 * Simple async mutex — serialises write operations so concurrent
 * requests cannot interleave read-modify-write cycles.
 */
class AsyncMutex {
	private queue: (() => void)[] = [];
	private locked = false;

	async acquire(): Promise<() => void> {
		if (!this.locked) {
			this.locked = true;
			return () => this.release();
		}

		return new Promise<() => void>((resolve) => {
			this.queue.push(() => resolve(() => this.release()));
		});
	}

	private release(): void {
		const next = this.queue.shift();
		if (next) {
			next();
		} else {
			this.locked = false;
		}
	}
}

export class LocalVerificationStore implements VerificationStore {
	private cache: Record<string, ScooterVerification> | null = null;
	private lastFileModTime = 0;
	private writeLock = new AsyncMutex();

	/**
	 * Load data from disk, with smart cache invalidation.
	 * Checks file modification time and reloads if the file has changed
	 * (e.g. from external scripts, another process, or manual edits).
	 */
	private async load(): Promise<Record<string, ScooterVerification>> {
		try {
			if (existsSync(STORE_FILE)) {
				const fileStat = await fsStat(STORE_FILE);
				const fileModTime = fileStat.mtimeMs;

				// Reload if: no cache, or file was modified since last load
				if (!this.cache || fileModTime > this.lastFileModTime) {
					const raw = await readFile(STORE_FILE, 'utf-8');
					this.cache = JSON.parse(raw);
					this.lastFileModTime = fileModTime;
					return this.cache!;
				}

				return this.cache;
			}
		} catch {
			// File doesn't exist or is corrupt, start fresh
		}

		this.cache = {};
		return this.cache;
	}

	private async save(): Promise<void> {
		if (!existsSync(DATA_DIR)) {
			await mkdir(DATA_DIR, { recursive: true });
		}
		await writeFile(STORE_FILE, JSON.stringify(this.cache), 'utf-8');
		// Update mod time so we don't trigger a re-read of our own write
		const fileStat = await fsStat(STORE_FILE);
		this.lastFileModTime = fileStat.mtimeMs;
	}

	/** Force-reload from disk on next access (useful after external changes) */
	invalidateCache(): void {
		this.cache = null;
		this.lastFileModTime = 0;
	}

	async get(scooterKey: string): Promise<ScooterVerification | null> {
		const data = await this.load();
		return data[scooterKey] || null;
	}

	async set(scooterKey: string, verification: ScooterVerification): Promise<void> {
		const release = await this.writeLock.acquire();
		try {
			const data = await this.load();
			data[scooterKey] = verification;
			await this.save();
		} finally {
			release();
		}
	}

	async getAll(): Promise<Record<string, ScooterVerification>> {
		const release = await this.writeLock.acquire();
		try {
			return await this.load();
		} finally {
			release();
		}
	}
}
