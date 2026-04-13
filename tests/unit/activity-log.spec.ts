/**
 * Unit tests for src/lib/server/verification/activity-log.ts
 *
 * The module has a module-level `cache` variable, so every describe block
 * uses vi.resetModules() + vi.doMock() + dynamic import for a fresh instance.
 *
 * fs/promises and fs are mocked — no actual disk I/O occurs.
 */
import { describe, it, expect, vi } from 'vitest';
import type { ActivityEntry, ActivityType } from '$lib/server/verification/activity-log';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(type: ActivityType, summary: string, daysAgo = 0): ActivityEntry {
	const d = new Date();
	d.setDate(d.getDate() - daysAgo);
	return {
		id: `${d.getTime()}-test`,
		type,
		timestamp: d.toISOString(),
		summary,
	};
}

/**
 * Returns a fresh module instance with mocked fs.
 *
 * @param initialEntries  Pre-existing log entries (simulates existing file)
 */
async function freshImport(initialEntries: ActivityEntry[] = []) {
	vi.resetModules();

	const fileExists = initialEntries.length > 0;

	vi.doMock('fs/promises', () => ({
		readFile: vi.fn().mockResolvedValue(JSON.stringify(initialEntries)),
		writeFile: vi.fn().mockResolvedValue(undefined),
		mkdir: vi.fn().mockResolvedValue(undefined),
	}));

	vi.doMock('fs', () => ({
		existsSync: vi.fn().mockReturnValue(fileExists),
	}));

	const mod = await import('$lib/server/verification/activity-log');
	const fsMock = await import('fs/promises');
	const fsSync = await import('fs');

	return { mod, fsMock, fsSync };
}

// ---------------------------------------------------------------------------
// logActivity
// ---------------------------------------------------------------------------

describe('logActivity – creates entry', () => {
	it('returns an ActivityEntry with correct fields', async () => {
		const { mod } = await freshImport();
		const entry = await mod.logActivity('login', 'Admin logged in');
		expect(entry.type).toBe('login');
		expect(entry.summary).toBe('Admin logged in');
		expect(typeof entry.id).toBe('string');
		expect(typeof entry.timestamp).toBe('string');
	});

	it('assigns a unique id each call', async () => {
		const { mod } = await freshImport();
		const a = await mod.logActivity('login', 'first');
		const b = await mod.logActivity('login', 'second');
		expect(a.id).not.toBe(b.id);
	});

	it('stores optional details on the entry', async () => {
		const { mod } = await freshImport();
		const entry = await mod.logActivity('scan_started', 'Scan started', { scooterKey: 'test_scooter' });
		expect(entry.details).toEqual({ scooterKey: 'test_scooter' });
	});

	it('writes to disk on each log call', async () => {
		const { mod, fsMock } = await freshImport();
		await mod.logActivity('login', 'Admin logged in');
		expect(fsMock.writeFile).toHaveBeenCalledTimes(1);
	});

	it('prepends new entry (most-recent-first order)', async () => {
		const { mod } = await freshImport();
		await mod.logActivity('login', 'first');
		await mod.logActivity('export', 'second');
		const { entries } = await mod.getActivityLog(10);
		expect(entries[0].summary).toBe('second');
		expect(entries[1].summary).toBe('first');
	});
});

describe('logActivity – MAX_ENTRIES trim', () => {
	it('trims the log to 500 entries when it exceeds the limit', async () => {
		// Pre-seed with 499 entries, add one more → exactly 500
		const existing = Array.from({ length: 499 }, (_, i) => makeEntry('scan_completed', `entry-${i}`));
		const { mod } = await freshImport(existing);
		await mod.logActivity('export', 'new entry');
		const { total } = await mod.getActivityLog(1, 0);
		expect(total).toBe(500);
	});

	it('trims correctly when pre-seeded with exactly 500 entries', async () => {
		const existing = Array.from({ length: 500 }, (_, i) => makeEntry('scan_completed', `entry-${i}`));
		const { mod } = await freshImport(existing);
		await mod.logActivity('export', 'overflow');
		const { total } = await mod.getActivityLog(1, 0);
		expect(total).toBe(500);
	});
});

// ---------------------------------------------------------------------------
// getActivityLog
// ---------------------------------------------------------------------------

describe('getActivityLog – basic retrieval', () => {
	it('returns all entries when no filter is given', async () => {
		const existing = [
			makeEntry('login', 'entry-1'),
			makeEntry('export', 'entry-2'),
			makeEntry('scan_started', 'entry-3'),
		];
		const { mod } = await freshImport(existing);
		const { entries, total } = await mod.getActivityLog(50);
		expect(total).toBe(3);
		expect(entries).toHaveLength(3);
	});

	it('returns empty result for empty log', async () => {
		const { mod } = await freshImport([]);
		const { entries, total } = await mod.getActivityLog();
		expect(total).toBe(0);
		expect(entries).toHaveLength(0);
	});
});

describe('getActivityLog – limit and offset', () => {
	it('respects the limit parameter', async () => {
		const existing = Array.from({ length: 10 }, (_, i) => makeEntry('login', `entry-${i}`));
		const { mod } = await freshImport(existing);
		const { entries, total } = await mod.getActivityLog(3);
		expect(entries).toHaveLength(3);
		expect(total).toBe(10);
	});

	it('respects the offset parameter', async () => {
		const existing = [makeEntry('login', 'a'), makeEntry('login', 'b'), makeEntry('login', 'c')];
		const { mod } = await freshImport(existing);
		const { entries } = await mod.getActivityLog(10, 1);
		expect(entries).toHaveLength(2);
		expect(entries[0].summary).toBe('b');
	});

	it('offset beyond length returns empty entries array', async () => {
		const existing = [makeEntry('login', 'only one')];
		const { mod } = await freshImport(existing);
		const { entries, total } = await mod.getActivityLog(10, 5);
		expect(entries).toHaveLength(0);
		expect(total).toBe(1);
	});
});

describe('getActivityLog – filterType', () => {
	it('filters by activity type', async () => {
		const existing = [
			makeEntry('login', 'login event'),
			makeEntry('export', 'export event'),
			makeEntry('login', 'another login'),
		];
		const { mod } = await freshImport(existing);
		const { entries, total } = await mod.getActivityLog(50, 0, 'login');
		expect(total).toBe(2);
		expect(entries.every((e) => e.type === 'login')).toBe(true);
	});

	it('returns empty when no entries match the filter', async () => {
		const existing = [makeEntry('login', 'login only')];
		const { mod } = await freshImport(existing);
		const { entries, total } = await mod.getActivityLog(50, 0, 'export');
		expect(total).toBe(0);
		expect(entries).toHaveLength(0);
	});

	it('applies offset after filtering', async () => {
		const existing = [
			makeEntry('login', 'login-1'),
			makeEntry('export', 'export-1'),
			makeEntry('login', 'login-2'),
			makeEntry('login', 'login-3'),
		];
		const { mod } = await freshImport(existing);
		const { entries, total } = await mod.getActivityLog(10, 1, 'login');
		expect(total).toBe(3);
		expect(entries).toHaveLength(2);
	});
});

// ---------------------------------------------------------------------------
// clearActivityLog
// ---------------------------------------------------------------------------

describe('clearActivityLog', () => {
	it('empties the log', async () => {
		const existing = [makeEntry('login', 'a'), makeEntry('export', 'b')];
		const { mod } = await freshImport(existing);
		await mod.clearActivityLog();
		const { entries, total } = await mod.getActivityLog(50);
		expect(total).toBe(0);
		expect(entries).toHaveLength(0);
	});

	it('writes an empty array to disk', async () => {
		const existing = [makeEntry('login', 'a')];
		const { mod, fsMock } = await freshImport(existing);
		await mod.clearActivityLog();
		const [, content] = vi.mocked(fsMock.writeFile).mock.calls[0] as [string, string, string];
		const written = JSON.parse(content);
		expect(written).toEqual([]);
	});

	it('allows new entries to be logged after clearing', async () => {
		const existing = [makeEntry('login', 'old')];
		const { mod } = await freshImport(existing);
		await mod.clearActivityLog();
		await mod.logActivity('export', 'fresh entry');
		const { entries, total } = await mod.getActivityLog(50);
		expect(total).toBe(1);
		expect(entries[0].summary).toBe('fresh entry');
	});
});
