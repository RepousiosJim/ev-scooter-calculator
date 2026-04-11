import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { ScooterVerification } from './types';
import type { VerificationStore } from './store';

const DATA_DIR = join(process.cwd(), 'data');
const STORE_FILE = join(DATA_DIR, 'verification-store.json');

export class LocalVerificationStore implements VerificationStore {
	private cache: Record<string, ScooterVerification> | null = null;

	private async load(): Promise<Record<string, ScooterVerification>> {
		if (this.cache) return this.cache;

		try {
			if (existsSync(STORE_FILE)) {
				const raw = await readFile(STORE_FILE, 'utf-8');
				this.cache = JSON.parse(raw);
				return this.cache!;
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
		await writeFile(STORE_FILE, JSON.stringify(this.cache, null, 2), 'utf-8');
	}

	async get(scooterKey: string): Promise<ScooterVerification | null> {
		const data = await this.load();
		return data[scooterKey] || null;
	}

	async set(scooterKey: string, verification: ScooterVerification): Promise<void> {
		const data = await this.load();
		data[scooterKey] = verification;
		await this.save();
	}

	async getAll(): Promise<Record<string, ScooterVerification>> {
		return await this.load();
	}
}
