/**
 * Unit tests for src/lib/server/verification/settings.ts
 *
 * fs/promises and fs are mocked — no actual disk I/O occurs.
 * The module has a module-level `cache`, so we use vi.resetModules() +
 * vi.doMock() + dynamic import for each describe block that needs fresh state.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Shared mock factories
// ---------------------------------------------------------------------------

/**
 * Returns a fresh import of the settings module with fs mocks pre-configured.
 *
 * @param fileExists  Whether existsSync() returns true for both DATA_DIR and SETTINGS_FILE
 * @param fileContent Raw JSON string returned by readFile (undefined → reject with ENOENT)
 */
async function freshImport(
	options: {
		fileExists?: boolean;
		dirExists?: boolean;
		fileContent?: string | undefined;
		writeFileShouldFail?: boolean;
	} = {}
) {
	const { fileExists = false, dirExists = true, fileContent, writeFileShouldFail = false } = options;

	vi.resetModules();

	vi.doMock('fs/promises', () => ({
		readFile:
			fileContent !== undefined
				? vi.fn().mockResolvedValue(fileContent)
				: vi.fn().mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' })),
		writeFile: writeFileShouldFail
			? vi.fn().mockRejectedValue(new Error('write error'))
			: vi.fn().mockResolvedValue(undefined),
		mkdir: vi.fn().mockResolvedValue(undefined),
	}));

	vi.doMock('fs', () => ({
		existsSync: vi.fn((p: string) => {
			// Return dirExists for DATA_DIR-like paths, fileExists for SETTINGS_FILE-like paths
			if (p.endsWith('admin-settings.json')) return fileExists;
			return dirExists;
		}),
	}));

	const settings = await import('$lib/server/verification/settings');
	const fsMock = await import('fs/promises');
	const fsSync = await import('fs');

	return { settings, fsMock, fsSync };
}

// ---------------------------------------------------------------------------
// maskSettings — pure function, no fs needed
// ---------------------------------------------------------------------------

describe('maskSettings', () => {
	// Import once — no fs interaction needed for this pure function
	let maskSettings: (typeof import('$lib/server/verification/settings'))['maskSettings'];

	beforeEach(async () => {
		vi.resetModules();
		vi.doMock('fs/promises', () => ({
			readFile: vi.fn(),
			writeFile: vi.fn(),
			mkdir: vi.fn(),
		}));
		vi.doMock('fs', () => ({
			existsSync: vi.fn().mockReturnValue(false),
		}));
		const mod = await import('$lib/server/verification/settings');
		maskSettings = mod.maskSettings;
	});

	it('masks a non-empty API key, showing only last 4 chars', () => {
		const settings = {
			geminiApiKey: 'ABCDEFGH1234',
			geminiModel: 'gemini-2.0-flash',
			autoVerifyThreshold: 80,
			outdatedDays: 30,
			batchDelayMs: 5000,
			maxConcurrentScrapes: 1,
			llmEnabled: true,
		};
		const masked = maskSettings(settings);
		expect(masked.geminiApiKey).toBe('••••••••1234');
		expect(masked.geminiApiKeySet).toBe(true);
	});

	it('returns empty string for empty API key', () => {
		const settings = {
			geminiApiKey: '',
			geminiModel: 'gemini-2.0-flash',
			autoVerifyThreshold: 80,
			outdatedDays: 30,
			batchDelayMs: 5000,
			maxConcurrentScrapes: 1,
			llmEnabled: true,
		};
		const masked = maskSettings(settings);
		expect(masked.geminiApiKey).toBe('');
		expect(masked.geminiApiKeySet).toBe(false);
	});

	it('leaves non-key fields unchanged', () => {
		const settings = {
			geminiApiKey: 'XY12',
			geminiModel: 'gemini-pro',
			autoVerifyThreshold: 75,
			outdatedDays: 14,
			batchDelayMs: 3000,
			maxConcurrentScrapes: 2,
			llmEnabled: false,
		};
		const masked = maskSettings(settings);
		expect(masked.geminiModel).toBe('gemini-pro');
		expect(masked.autoVerifyThreshold).toBe(75);
		expect(masked.outdatedDays).toBe(14);
		expect(masked.batchDelayMs).toBe(3000);
		expect(masked.maxConcurrentScrapes).toBe(2);
		expect(masked.llmEnabled).toBe(false);
	});

	it('masks a short API key (just 4 chars)', () => {
		const settings = {
			geminiApiKey: '1234',
			geminiModel: 'gemini-2.0-flash',
			autoVerifyThreshold: 80,
			outdatedDays: 30,
			batchDelayMs: 5000,
			maxConcurrentScrapes: 1,
			llmEnabled: true,
		};
		const masked = maskSettings(settings);
		expect(masked.geminiApiKey).toBe('••••••••1234');
	});
});

// ---------------------------------------------------------------------------
// getSettings
// ---------------------------------------------------------------------------

describe('getSettings – file missing', () => {
	it('returns defaults when settings file does not exist', async () => {
		const { settings } = await freshImport({ fileExists: false });
		const result = await settings.getSettings();
		expect(result.geminiApiKey).toBe('');
		expect(result.geminiModel).toBe('gemini-2.0-flash');
		expect(result.autoVerifyThreshold).toBe(80);
		expect(result.outdatedDays).toBe(30);
		expect(result.batchDelayMs).toBe(5000);
		expect(result.maxConcurrentScrapes).toBe(1);
		expect(result.llmEnabled).toBe(true);
	});
});

describe('getSettings – file exists with valid JSON', () => {
	it('reads settings from file and merges with defaults', async () => {
		const fileContent = JSON.stringify({
			geminiApiKey: 'MY_SECRET_KEY',
			autoVerifyThreshold: 90,
		});
		const { settings } = await freshImport({ fileExists: true, fileContent });
		const result = await settings.getSettings();
		expect(result.geminiApiKey).toBe('MY_SECRET_KEY');
		expect(result.autoVerifyThreshold).toBe(90);
		// Defaults should still be present for unspecified fields
		expect(result.outdatedDays).toBe(30);
	});

	it('calls readFile exactly once per fresh module instance', async () => {
		const fileContent = JSON.stringify({ geminiApiKey: 'KEY1' });
		const { settings, fsMock } = await freshImport({ fileExists: true, fileContent });
		await settings.getSettings();
		await settings.getSettings(); // second call uses cache
		expect(fsMock.readFile).toHaveBeenCalledTimes(1);
	});
});

describe('getSettings – corrupt JSON', () => {
	it('falls back to defaults when JSON is malformed', async () => {
		const { settings } = await freshImport({
			fileExists: true,
			fileContent: 'NOT VALID JSON {{{}',
		});
		const result = await settings.getSettings();
		expect(result.geminiApiKey).toBe('');
		expect(result.autoVerifyThreshold).toBe(80);
	});
});

// ---------------------------------------------------------------------------
// updateSettings
// ---------------------------------------------------------------------------

describe('updateSettings', () => {
	it('merges partial updates into defaults and returns updated settings', async () => {
		const { settings } = await freshImport({ fileExists: false, dirExists: true });
		const updated = await settings.updateSettings({ autoVerifyThreshold: 95 });
		expect(updated.autoVerifyThreshold).toBe(95);
		expect(updated.geminiModel).toBe('gemini-2.0-flash'); // default preserved
	});

	it('writes updated settings to disk', async () => {
		const { settings, fsMock } = await freshImport({ fileExists: false, dirExists: true });
		await settings.updateSettings({ geminiApiKey: 'NEW_KEY' });
		expect(fsMock.writeFile).toHaveBeenCalledTimes(1);
		const [, content] = vi.mocked(fsMock.writeFile).mock.calls[0] as [string, string, string];
		const written = JSON.parse(content);
		expect(written.geminiApiKey).toBe('NEW_KEY');
	});

	it('creates DATA_DIR if it does not exist', async () => {
		const { settings, fsMock } = await freshImport({
			fileExists: false,
			dirExists: false,
		});
		await settings.updateSettings({ llmEnabled: false });
		expect(fsMock.mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
	});

	it('does NOT create DATA_DIR when it already exists', async () => {
		const { settings, fsMock } = await freshImport({
			fileExists: false,
			dirExists: true,
		});
		await settings.updateSettings({ llmEnabled: false });
		expect(fsMock.mkdir).not.toHaveBeenCalled();
	});

	it('merges multiple fields at once', async () => {
		const { settings } = await freshImport({ fileExists: false, dirExists: true });
		const updated = await settings.updateSettings({
			geminiApiKey: 'ABC123',
			outdatedDays: 7,
			batchDelayMs: 1000,
		});
		expect(updated.geminiApiKey).toBe('ABC123');
		expect(updated.outdatedDays).toBe(7);
		expect(updated.batchDelayMs).toBe(1000);
	});

	it('subsequent getSettings returns updated value from cache', async () => {
		const { settings } = await freshImport({ fileExists: false, dirExists: true });
		await settings.updateSettings({ maxConcurrentScrapes: 4 });
		const s = await settings.getSettings();
		expect(s.maxConcurrentScrapes).toBe(4);
	});
});
