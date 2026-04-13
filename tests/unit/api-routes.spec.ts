/**
 * Unit tests for admin API route handlers.
 *
 * All external dependencies (store, activity-log, settings, admin-guard) are mocked
 * so no filesystem access or auth checks occur unless explicitly tested.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock $env/dynamic/private (required by auth.ts which admin-guard.ts imports)
// ---------------------------------------------------------------------------
vi.mock('$env/dynamic/private', () => ({
	env: {
		ADMIN_PASSWORD: 'test-password',
		SESSION_SECRET: 'test-secret-key',
	},
}));

// ---------------------------------------------------------------------------
// Mock admin-guard so requireAdmin always passes
// ---------------------------------------------------------------------------
vi.mock('$lib/server/admin-guard', () => ({
	requireAdmin: vi.fn(),
	rateLimit: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock verification store
// ---------------------------------------------------------------------------
vi.mock('$lib/server/verification/store', () => ({
	getStore: vi.fn(),
	addSource: vi.fn(),
	removeSource: vi.fn(),
	updateFieldStatus: vi.fn(),
	addPriceObservation: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock activity-log
// ---------------------------------------------------------------------------
vi.mock('$lib/server/verification/activity-log', () => ({
	logActivity: vi.fn().mockResolvedValue(undefined),
	getActivityLog: vi.fn().mockResolvedValue({ entries: [], total: 0 }),
	clearActivityLog: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Mock settings
// ---------------------------------------------------------------------------
vi.mock('$lib/server/verification/settings', () => ({
	getSettings: vi.fn().mockResolvedValue({
		geminiApiKey: 'real-key-1234',
		geminiModel: 'gemini-2.0-flash',
		autoVerifyThreshold: 80,
		outdatedDays: 30,
		batchDelayMs: 5000,
		maxConcurrentScrapes: 1,
		llmEnabled: true,
	}),
	updateSettings: vi.fn().mockResolvedValue({
		geminiApiKey: '',
		geminiModel: 'gemini-2.0-flash',
		autoVerifyThreshold: 90,
		outdatedDays: 30,
		batchDelayMs: 5000,
		maxConcurrentScrapes: 1,
		llmEnabled: true,
	}),
	maskSettings: vi.fn((s) => ({
		...s,
		geminiApiKey: s.geminiApiKey ? '••••••••' + s.geminiApiKey.slice(-4) : '',
		geminiApiKeySet: !!s.geminiApiKey,
	})),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are declared)
// ---------------------------------------------------------------------------
import { POST as verifyPOST } from '../../src/routes/api/admin/verify/+server';
import { POST as sourcePOST, DELETE as sourceDELETE } from '../../src/routes/api/admin/source/+server';
import { POST as pricePOST } from '../../src/routes/api/admin/price/+server';
import { GET as activityGET, DELETE as activityDELETE } from '../../src/routes/api/admin/activity-log/+server';
import { GET as exportGET, POST as exportPOST } from '../../src/routes/api/admin/export/+server';
import { GET as settingsGET, POST as settingsPOST } from '../../src/routes/api/admin/settings/+server';
import { GET as verifiedSpecsGET } from '../../src/routes/api/verified-specs/+server';

import {
	getStore,
	updateFieldStatus,
	addSource,
	removeSource,
	addPriceObservation,
} from '$lib/server/verification/store';
import { getActivityLog, clearActivityLog } from '$lib/server/verification/activity-log';
import { getSettings, updateSettings, maskSettings } from '$lib/server/verification/settings';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(method: string, url: string, body?: unknown) {
	return new Request(url, {
		method,
		headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});
}

function makeEvent(method: string, urlStr: string, body?: unknown, searchParams?: Record<string, string>) {
	let fullUrl = urlStr;
	if (searchParams) {
		const params = new URLSearchParams(searchParams);
		fullUrl = `${urlStr}?${params.toString()}`;
	}
	return {
		request: makeRequest(method, fullUrl, body),
		cookies: {
			get: vi.fn().mockReturnValue('valid-session'),
			set: vi.fn(),
			delete: vi.fn(),
		},
		url: new URL(fullUrl),
		getClientAddress: () => '127.0.0.1',
		locals: {},
	};
}

function makeVerification(key: string, overrides = {}) {
	return {
		scooterKey: key,
		fields: {},
		priceHistory: [],
		lastUpdated: new Date().toISOString(),
		overallConfidence: 0,
		...overrides,
	};
}

// Shared mock store object for tests that need it
function makeMockStore(allData: Record<string, unknown> = {}) {
	return {
		get: vi.fn().mockResolvedValue(null),
		set: vi.fn().mockResolvedValue(undefined),
		getAll: vi.fn().mockResolvedValue(allData),
	};
}

// ---------------------------------------------------------------------------
// verify route
// ---------------------------------------------------------------------------

describe('POST /api/admin/verify', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		const mockStore = makeMockStore();
		vi.mocked(getStore).mockResolvedValue(mockStore);
	});

	it('returns success for a valid verification request', async () => {
		const fakeVerification = makeVerification('ninebot_max');
		vi.mocked(updateFieldStatus).mockResolvedValue(fakeVerification);

		const event = makeEvent('POST', 'http://localhost/api/admin/verify', {
			scooterKey: 'ninebot_max',
			field: 'topSpeed',
			status: 'verified',
			verifiedValue: 45,
		});

		const response = await verifyPOST(event as any);
		const data = await response.json();

		expect(data.success).toBe(true);
		expect(data.verification).toBeDefined();
		expect(updateFieldStatus).toHaveBeenCalledWith(expect.anything(), 'ninebot_max', 'topSpeed', 'verified', 45);
	});

	it('returns 400 when scooterKey is missing', async () => {
		const event = makeEvent('POST', 'http://localhost/api/admin/verify', {
			field: 'topSpeed',
			status: 'verified',
		});

		try {
			await verifyPOST(event as any);
			expect.unreachable('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});

	it('returns 400 when field is missing', async () => {
		const event = makeEvent('POST', 'http://localhost/api/admin/verify', {
			scooterKey: 'ninebot_max',
			status: 'verified',
		});

		try {
			await verifyPOST(event as any);
			expect.unreachable('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});

	it('returns 400 when status is missing', async () => {
		const event = makeEvent('POST', 'http://localhost/api/admin/verify', {
			scooterKey: 'ninebot_max',
			field: 'topSpeed',
		});

		try {
			await verifyPOST(event as any);
			expect.unreachable('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});

	it('returns 400 for an invalid status value', async () => {
		const event = makeEvent('POST', 'http://localhost/api/admin/verify', {
			scooterKey: 'ninebot_max',
			field: 'topSpeed',
			status: 'super_verified',
		});

		try {
			await verifyPOST(event as any);
			expect.unreachable('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});

	it('handles unknown scooterKey gracefully (returns success with null verification)', async () => {
		vi.mocked(updateFieldStatus).mockResolvedValue(null);

		const event = makeEvent('POST', 'http://localhost/api/admin/verify', {
			scooterKey: 'does_not_exist',
			field: 'topSpeed',
			status: 'unverified',
		});

		const response = await verifyPOST(event as any);
		const data = await response.json();

		expect(data.success).toBe(true);
		expect(data.verification).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// source route
// ---------------------------------------------------------------------------

describe('POST /api/admin/source', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getStore).mockResolvedValue(makeMockStore());
		vi.mocked(addSource).mockResolvedValue(makeVerification('ninebot_max'));
	});

	it('adds a source successfully', async () => {
		const event = makeEvent('POST', 'http://localhost/api/admin/source', {
			scooterKey: 'ninebot_max',
			field: 'topSpeed',
			source: {
				type: 'manufacturer',
				name: 'Ninebot Spec Sheet',
				url: 'https://ninebot.com/max',
				value: 30,
				unit: 'km/h',
				addedBy: 'manual',
			},
		});

		const response = await sourcePOST(event as any);
		const data = await response.json();

		expect(data.success).toBe(true);
		expect(addSource).toHaveBeenCalled();
	});

	it('returns 400 when scooterKey is missing', async () => {
		const event = makeEvent('POST', 'http://localhost/api/admin/source', {
			field: 'topSpeed',
			source: { type: 'manufacturer', name: 'Test', value: 30, unit: 'km/h' },
		});

		try {
			await sourcePOST(event as any);
			expect.unreachable('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});

	it('returns 400 when source.name is missing', async () => {
		const event = makeEvent('POST', 'http://localhost/api/admin/source', {
			scooterKey: 'ninebot_max',
			field: 'topSpeed',
			source: { type: 'manufacturer', value: 30, unit: 'km/h' },
		});

		try {
			await sourcePOST(event as any);
			expect.unreachable('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});

	it('returns 400 when source.value is missing', async () => {
		const event = makeEvent('POST', 'http://localhost/api/admin/source', {
			scooterKey: 'ninebot_max',
			field: 'topSpeed',
			source: { type: 'manufacturer', name: 'Test', unit: 'km/h' },
		});

		try {
			await sourcePOST(event as any);
			expect.unreachable('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});
});

describe('DELETE /api/admin/source', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getStore).mockResolvedValue(makeMockStore());
		vi.mocked(removeSource).mockResolvedValue(makeVerification('ninebot_max'));
	});

	it('removes a source successfully', async () => {
		const event = makeEvent('DELETE', 'http://localhost/api/admin/source', {
			scooterKey: 'ninebot_max',
			field: 'topSpeed',
			sourceId: 'src-abc',
		});

		const response = await sourceDELETE(event as any);
		const data = await response.json();

		expect(data.success).toBe(true);
		expect(removeSource).toHaveBeenCalledWith(expect.anything(), 'ninebot_max', 'topSpeed', 'src-abc');
	});

	it('returns 400 when sourceId is missing', async () => {
		const event = makeEvent('DELETE', 'http://localhost/api/admin/source', {
			scooterKey: 'ninebot_max',
			field: 'topSpeed',
		});

		try {
			await sourceDELETE(event as any);
			expect.unreachable('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});

	it('returns 400 when field is missing', async () => {
		const event = makeEvent('DELETE', 'http://localhost/api/admin/source', {
			scooterKey: 'ninebot_max',
			sourceId: 'src-abc',
		});

		try {
			await sourceDELETE(event as any);
			expect.unreachable('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});
});

// ---------------------------------------------------------------------------
// price route
// ---------------------------------------------------------------------------

describe('POST /api/admin/price', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getStore).mockResolvedValue(makeMockStore());
		vi.mocked(addPriceObservation).mockResolvedValue(makeVerification('ninebot_max'));
	});

	it('adds a price observation successfully', async () => {
		const event = makeEvent('POST', 'http://localhost/api/admin/price', {
			scooterKey: 'ninebot_max',
			observation: {
				price: 799,
				currency: 'USD',
				source: 'Amazon',
				observedAt: '2025-01-01T00:00:00.000Z',
			},
		});

		const response = await pricePOST(event as any);
		const data = await response.json();

		expect(data.success).toBe(true);
		expect(addPriceObservation).toHaveBeenCalled();
	});

	it('returns 400 when scooterKey is missing', async () => {
		const event = makeEvent('POST', 'http://localhost/api/admin/price', {
			observation: { price: 799, currency: 'USD', source: 'Amazon' },
		});

		try {
			await pricePOST(event as any);
			expect.unreachable('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});

	it('returns 400 when observation.price is missing', async () => {
		const event = makeEvent('POST', 'http://localhost/api/admin/price', {
			scooterKey: 'ninebot_max',
			observation: { currency: 'USD', source: 'Amazon' },
		});

		try {
			await pricePOST(event as any);
			expect.unreachable('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});

	it('returns 400 when observation.source is missing', async () => {
		const event = makeEvent('POST', 'http://localhost/api/admin/price', {
			scooterKey: 'ninebot_max',
			observation: { price: 799, currency: 'USD' },
		});

		try {
			await pricePOST(event as any);
			expect.unreachable('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});
});

// ---------------------------------------------------------------------------
// activity-log route
// ---------------------------------------------------------------------------

describe('GET /api/admin/activity-log', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns logs with default limit and offset', async () => {
		vi.mocked(getActivityLog).mockResolvedValue({
			entries: [{ id: '1', type: 'login', timestamp: new Date().toISOString(), summary: 'Admin logged in' }],
			total: 1,
		});

		const event = makeEvent('GET', 'http://localhost/api/admin/activity-log');
		const response = await activityGET(event as any);
		const data = await response.json();

		expect(data.entries).toHaveLength(1);
		expect(data.total).toBe(1);
		expect(getActivityLog).toHaveBeenCalledWith(50, 0, undefined);
	});

	it('respects limit and offset query params', async () => {
		vi.mocked(getActivityLog).mockResolvedValue({ entries: [], total: 0 });

		const event = makeEvent('GET', 'http://localhost/api/admin/activity-log', undefined, {
			limit: '10',
			offset: '20',
		});

		await activityGET(event as any);
		expect(getActivityLog).toHaveBeenCalledWith(10, 20, undefined);
	});

	it('filters by valid activity type', async () => {
		vi.mocked(getActivityLog).mockResolvedValue({ entries: [], total: 0 });

		const event = makeEvent('GET', 'http://localhost/api/admin/activity-log', undefined, {
			type: 'login',
		});

		await activityGET(event as any);
		expect(getActivityLog).toHaveBeenCalledWith(50, 0, 'login');
	});

	it('ignores invalid activity type filter', async () => {
		vi.mocked(getActivityLog).mockResolvedValue({ entries: [], total: 0 });

		const event = makeEvent('GET', 'http://localhost/api/admin/activity-log', undefined, {
			type: 'not_a_valid_type',
		});

		await activityGET(event as any);
		expect(getActivityLog).toHaveBeenCalledWith(50, 0, undefined);
	});
});

describe('DELETE /api/admin/activity-log', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('clears the activity log', async () => {
		const event = makeEvent('DELETE', 'http://localhost/api/admin/activity-log');
		const response = await activityDELETE(event as any);
		const data = await response.json();

		expect(data.success).toBe(true);
		expect(clearActivityLog).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// export route
// ---------------------------------------------------------------------------

describe('GET /api/admin/export', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('exports all verification data', async () => {
		const fakeData = {
			ninebot_max: makeVerification('ninebot_max'),
			xiaomi_pro2: makeVerification('xiaomi_pro2'),
		};
		vi.mocked(getStore).mockResolvedValue(makeMockStore(fakeData));

		const event = makeEvent('GET', 'http://localhost/api/admin/export');
		const response = await exportGET(event as any);
		const data = await response.json();

		expect(data.scooterCount).toBe(2);
		expect(data.data).toHaveProperty('ninebot_max');
		expect(data.data).toHaveProperty('xiaomi_pro2');
		expect(data.exportedAt).toBeDefined();
	});

	it('exports empty data when store is empty', async () => {
		vi.mocked(getStore).mockResolvedValue(makeMockStore({}));

		const event = makeEvent('GET', 'http://localhost/api/admin/export');
		const response = await exportGET(event as any);
		const data = await response.json();

		expect(data.scooterCount).toBe(0);
		expect(data.data).toEqual({});
	});
});

describe('POST /api/admin/export (import)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getStore).mockResolvedValue(makeMockStore());
	});

	it('imports valid data and returns count', async () => {
		const fakeVerification = makeVerification('ninebot_max');
		const event = makeEvent('POST', 'http://localhost/api/admin/export', {
			data: { ninebot_max: fakeVerification },
		});

		const response = await exportPOST(event as any);
		const result = await response.json();

		expect(result.success).toBe(true);
		expect(result.imported).toBe(1);
	});

	it('returns 400 for invalid import format (missing data key)', async () => {
		const event = makeEvent('POST', 'http://localhost/api/admin/export', {
			notData: {},
		});

		try {
			await exportPOST(event as any);
			expect.unreachable('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});

	it('skips invalid verification entries silently', async () => {
		const event = makeEvent('POST', 'http://localhost/api/admin/export', {
			data: {
				bad_entry: { not: 'a valid verification' },
				good_entry: makeVerification('good_entry'),
			},
		});

		const response = await exportPOST(event as any);
		const result = await response.json();

		expect(result.success).toBe(true);
		expect(result.imported).toBe(1); // only the valid one
	});
});

// ---------------------------------------------------------------------------
// settings route
// ---------------------------------------------------------------------------

describe('GET /api/admin/settings', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getSettings).mockResolvedValue({
			geminiApiKey: 'real-key-1234',
			geminiModel: 'gemini-2.0-flash',
			autoVerifyThreshold: 80,
			outdatedDays: 30,
			batchDelayMs: 5000,
			maxConcurrentScrapes: 1,
			llmEnabled: true,
		});
		vi.mocked(maskSettings).mockImplementation((s) => ({
			...s,
			geminiApiKey: s.geminiApiKey ? '••••••••' + s.geminiApiKey.slice(-4) : '',
			geminiApiKeySet: !!s.geminiApiKey,
		}));
	});

	it('returns masked settings (API key masked)', async () => {
		const event = makeEvent('GET', 'http://localhost/api/admin/settings');
		const response = await settingsGET(event as any);
		const data = await response.json();

		expect(data.geminiApiKey).toBe('••••••••1234');
		expect(data.geminiApiKeySet).toBe(true);
		expect(getSettings).toHaveBeenCalled();
		expect(maskSettings).toHaveBeenCalled();
	});
});

describe('POST /api/admin/settings', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(updateSettings).mockResolvedValue({
			geminiApiKey: '',
			geminiModel: 'gemini-2.0-flash',
			autoVerifyThreshold: 90,
			outdatedDays: 30,
			batchDelayMs: 5000,
			maxConcurrentScrapes: 1,
			llmEnabled: true,
		});
		vi.mocked(maskSettings).mockImplementation((s) => ({
			...s,
			geminiApiKey: s.geminiApiKey ? '••••••••' + s.geminiApiKey.slice(-4) : '',
			geminiApiKeySet: !!s.geminiApiKey,
		}));
	});

	it('updates numeric settings', async () => {
		const event = makeEvent('POST', 'http://localhost/api/admin/settings', {
			autoVerifyThreshold: 90,
		});

		const response = await settingsPOST(event as any);
		const data = await response.json();

		expect(updateSettings).toHaveBeenCalledWith(expect.objectContaining({ autoVerifyThreshold: 90 }));
		expect(data.autoVerifyThreshold).toBe(90);
	});

	it('updates llmEnabled boolean', async () => {
		vi.mocked(updateSettings).mockResolvedValue({
			geminiApiKey: '',
			geminiModel: 'gemini-2.0-flash',
			autoVerifyThreshold: 80,
			outdatedDays: 30,
			batchDelayMs: 5000,
			maxConcurrentScrapes: 1,
			llmEnabled: false,
		});

		const event = makeEvent('POST', 'http://localhost/api/admin/settings', {
			llmEnabled: false,
		});

		await settingsPOST(event as any);
		expect(updateSettings).toHaveBeenCalledWith(expect.objectContaining({ llmEnabled: false }));
	});

	it('does not include masked API key placeholder in updates', async () => {
		const event = makeEvent('POST', 'http://localhost/api/admin/settings', {
			geminiApiKey: '••••••••',
		});

		await settingsPOST(event as any);
		// The masked placeholder should NOT be passed to updateSettings
		const callArg = vi.mocked(updateSettings).mock.calls[0][0];
		expect(callArg.geminiApiKey).toBeUndefined();
	});

	it('does not update non-typed fields (ignores strings for numeric params)', async () => {
		const event = makeEvent('POST', 'http://localhost/api/admin/settings', {
			autoVerifyThreshold: 'not-a-number',
		});

		await settingsPOST(event as any);
		const callArg = vi.mocked(updateSettings).mock.calls[0][0];
		// String value should not be included since we check `typeof === 'number'`
		expect(callArg.autoVerifyThreshold).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// verified-specs route (public)
// ---------------------------------------------------------------------------

describe('GET /api/verified-specs', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns empty object when store is empty', async () => {
		vi.mocked(getStore).mockResolvedValue(makeMockStore({}));

		const event = makeEvent('GET', 'http://localhost/api/verified-specs');
		const response = await verifiedSpecsGET(event as any);
		const data = await response.json();

		expect(data).toEqual({});
	});

	it('filters out scooters with no sources in any field', async () => {
		const emptyVerification = {
			scooterKey: 'no_sources',
			fields: {
				topSpeed: { status: 'unverified', sources: [], confidence: 0 },
			},
			priceHistory: [],
			lastUpdated: new Date().toISOString(),
			overallConfidence: 0,
		};
		vi.mocked(getStore).mockResolvedValue(makeMockStore({ no_sources: emptyVerification }));

		const event = makeEvent('GET', 'http://localhost/api/verified-specs');
		const response = await verifiedSpecsGET(event as any);
		const data = await response.json();

		// Scooter with no sources should not appear in response
		expect(data).not.toHaveProperty('no_sources');
	});

	it('includes scooters that have at least one field with sources', async () => {
		const verification = {
			scooterKey: 'ninebot_max',
			fields: {
				topSpeed: {
					status: 'verified',
					sources: [
						{
							id: 'src-1',
							type: 'manufacturer',
							name: 'Spec Sheet',
							url: 'https://ninebot.com',
							value: 30,
							unit: 'km/h',
							fetchedAt: new Date().toISOString(),
							addedBy: 'manual',
						},
					],
					confidence: 80,
					verifiedValue: 30,
				},
			},
			priceHistory: [],
			lastUpdated: new Date().toISOString(),
			overallConfidence: 80,
		};
		vi.mocked(getStore).mockResolvedValue(makeMockStore({ ninebot_max: verification }));

		const event = makeEvent('GET', 'http://localhost/api/verified-specs');
		const response = await verifiedSpecsGET(event as any);
		const data = await response.json();

		expect(data).toHaveProperty('ninebot_max');
		expect(data.ninebot_max.fields.topSpeed).toEqual({
			value: 30,
			confidence: 80,
			status: 'verified',
		});
	});

	it('includes scooters that have price history even with no field sources', async () => {
		const verification = {
			scooterKey: 'cheap_scooter',
			fields: {},
			priceHistory: [
				{
					price: 299,
					currency: 'USD',
					source: 'Amazon',
					observedAt: '2025-01-01T00:00:00.000Z',
				},
			],
			lastUpdated: new Date().toISOString(),
			overallConfidence: 0,
		};
		vi.mocked(getStore).mockResolvedValue(makeMockStore({ cheap_scooter: verification }));

		const event = makeEvent('GET', 'http://localhost/api/verified-specs');
		const response = await verifiedSpecsGET(event as any);
		const data = await response.json();

		expect(data).toHaveProperty('cheap_scooter');
		expect(data.cheap_scooter.latestPrice.price).toBe(299);
	});

	it('sets Cache-Control header with CDN caching', async () => {
		vi.mocked(getStore).mockResolvedValue(makeMockStore({}));

		const event = makeEvent('GET', 'http://localhost/api/verified-specs');
		const response = await verifiedSpecsGET(event as any);

		expect(response.headers.get('Cache-Control')).toBe('public, max-age=300, s-maxage=600, stale-while-revalidate=300');
	});
});
