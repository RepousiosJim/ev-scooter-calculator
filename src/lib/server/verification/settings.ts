import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data');
const SETTINGS_FILE = join(DATA_DIR, 'admin-settings.json');

export interface AdminSettings {
	/** Gemini API key (stored server-side only) */
	geminiApiKey: string;
	/** Confidence threshold to auto-mark as verified (0-100) */
	autoVerifyThreshold: number;
	/** Days before a verification is considered outdated */
	outdatedDays: number;
	/** Delay in ms between requests during batch operations */
	batchDelayMs: number;
	/** Max concurrent scrape requests */
	maxConcurrentScrapes: number;
	/** Enable LLM-powered extraction */
	llmEnabled: boolean;
	/** Gemini model to use */
	geminiModel: string;
}

const DEFAULT_SETTINGS: AdminSettings = {
	geminiApiKey: '',
	geminiModel: 'gemini-2.0-flash',
	autoVerifyThreshold: 80,
	outdatedDays: 30,
	batchDelayMs: 5000,
	maxConcurrentScrapes: 1,
	llmEnabled: true,
};

let cache: AdminSettings | null = null;

export async function getSettings(): Promise<AdminSettings> {
	if (cache) return { ...cache };
	try {
		if (existsSync(SETTINGS_FILE)) {
			const raw = await readFile(SETTINGS_FILE, 'utf-8');
			cache = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
			return { ...cache! };
		}
	} catch { /* use defaults */ }
	cache = { ...DEFAULT_SETTINGS };
	return { ...cache };
}

export async function updateSettings(partial: Partial<AdminSettings>): Promise<AdminSettings> {
	const current = await getSettings();
	const updated = { ...current, ...partial };
	cache = updated;
	if (!existsSync(DATA_DIR)) {
		await mkdir(DATA_DIR, { recursive: true });
	}
	await writeFile(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
	return { ...updated };
}

/** Get settings safe for client (masks API key) */
export function maskSettings(settings: AdminSettings): AdminSettings & { geminiApiKeySet: boolean } {
	return {
		...settings,
		geminiApiKey: settings.geminiApiKey ? '••••••••' + settings.geminiApiKey.slice(-4) : '',
		geminiApiKeySet: !!settings.geminiApiKey,
	};
}
