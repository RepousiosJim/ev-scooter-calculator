/**
 * Unit tests for auto-fix engine.
 *
 * All I/O dependencies (store, activity-log, presets) are mocked.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module-level mocks
// vi.mock factories must NOT reference outer variables (hoisting restriction).
// We use vi.hoisted() to lift declarations into the hoisted zone.
// ---------------------------------------------------------------------------

const { mockGetAll, mockStoreGet, mockStoreSet, mockStoreObj } = vi.hoisted(() => {
	const mockGetAll = vi.fn();
	const mockStoreGet = vi.fn();
	const mockStoreSet = vi.fn();
	const mockStoreObj = { getAll: mockGetAll, get: mockStoreGet, set: mockStoreSet };
	return { mockGetAll, mockStoreGet, mockStoreSet, mockStoreObj };
});

vi.mock('$lib/server/verification/store', () => ({
	getStore: vi.fn().mockResolvedValue(mockStoreObj),
	addSource: vi.fn().mockResolvedValue({}),
	removeSource: vi.fn().mockResolvedValue({}),
}));

vi.mock('$lib/server/verification/activity-log', () => ({
	logActivity: vi.fn().mockResolvedValue({}),
}));

vi.mock('$lib/server/verification/confidence', () => ({
	computeConfidence: vi.fn().mockReturnValue(75),
	computeOverallConfidence: vi.fn().mockReturnValue(75),
}));

const { mockPresets, mockPresetMetadata } = vi.hoisted(() => {
	const mockPresets: Record<string, any> = {
		test_scooter: { v: 52, ah: 20, watts: 1000, motors: 2, wheel: 10, scooterWeight: 35 },
	};

	const mockPresetMetadata: Record<string, any> = {
		test_scooter: {
			name: 'Test Scooter',
			year: 2024,
			sourceUrl: 'https://test.com',
			manufacturer: {
				topSpeed: 80,
				range: 60,
				batteryWh: 1040,
				price: 1500,
			},
		},
		custom: {
			name: 'Custom',
			year: 2024,
			manufacturer: null,
		},
	};

	return { mockPresets, mockPresetMetadata };
});

vi.mock('$lib/data/presets', () => ({
	get presets() {
		return mockPresets;
	},
	get presetMetadata() {
		return mockPresetMetadata;
	},
}));

// Dynamic import after mocks are in place
import { SPEC_RANGES, runAutoFix } from '$lib/server/verification/auto-fix';
import { getStore, addSource, removeSource } from '$lib/server/verification/store';
import { logActivity } from '$lib/server/verification/activity-log';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSource(
	overrides: Partial<{
		id: string;
		value: number;
		type: string;
		name: string;
		url: string;
	}> = {}
) {
	return {
		id: 'src1',
		type: 'manufacturer' as const,
		name: 'Test Source',
		url: 'https://example.com',
		value: 50,
		unit: 'km/h',
		fetchedAt: new Date().toISOString(),
		addedBy: 'manual' as const,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// SPEC_RANGES
// ---------------------------------------------------------------------------

describe('SPEC_RANGES', () => {
	it('has topSpeed with min and max', () => {
		expect(SPEC_RANGES.topSpeed).toBeDefined();
		expect(SPEC_RANGES.topSpeed!.min).toBeGreaterThan(0);
		expect(SPEC_RANGES.topSpeed!.max).toBeGreaterThan(SPEC_RANGES.topSpeed!.min);
	});

	it('has range with min and max', () => {
		expect(SPEC_RANGES.range).toBeDefined();
		expect(SPEC_RANGES.range!.min).toBeGreaterThan(0);
		expect(SPEC_RANGES.range!.max).toBeGreaterThan(SPEC_RANGES.range!.min);
	});

	it('has batteryWh with plausible bounds', () => {
		expect(SPEC_RANGES.batteryWh).toBeDefined();
		expect(SPEC_RANGES.batteryWh!.min).toBeLessThan(500);
		expect(SPEC_RANGES.batteryWh!.max).toBeGreaterThan(1000);
	});

	it('has price with min and max', () => {
		expect(SPEC_RANGES.price).toBeDefined();
		expect(SPEC_RANGES.price!.min).toBeGreaterThan(0);
	});

	it('includes voltage, motorWatts, weight, wheelSize', () => {
		expect(SPEC_RANGES.voltage).toBeDefined();
		expect(SPEC_RANGES.motorWatts).toBeDefined();
		expect(SPEC_RANGES.weight).toBeDefined();
		expect(SPEC_RANGES.wheelSize).toBeDefined();
	});

	it('all entries have a unit string', () => {
		for (const entry of Object.values(SPEC_RANGES)) {
			if (entry) {
				expect(typeof entry.unit).toBe('string');
				expect(entry.unit.length).toBeGreaterThan(0);
			}
		}
	});
});

// ---------------------------------------------------------------------------
// runAutoFix – default (all)
// ---------------------------------------------------------------------------

describe('runAutoFix – empty store', () => {
	let savedMetadata: Record<string, any>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockGetAll.mockResolvedValue({});
		mockStoreGet.mockResolvedValue(null);
		mockStoreSet.mockResolvedValue(undefined);
		vi.mocked(getStore).mockResolvedValue(mockStoreObj as any);
		// Temporarily empty presetMetadata so seed step produces no actions
		savedMetadata = { ...mockPresetMetadata };
		for (const k of Object.keys(mockPresetMetadata)) {
			delete mockPresetMetadata[k];
		}
	});

	afterEach(() => {
		// Restore presetMetadata
		for (const k of Object.keys(savedMetadata)) {
			mockPresetMetadata[k] = savedMetadata[k];
		}
	});

	it('returns a result with success: true', async () => {
		const result = await runAutoFix(['all']);
		expect(result.success).toBe(true);
	});

	it('returns summary with zero actions when store is empty', async () => {
		const result = await runAutoFix(['all']);
		expect(result.summary.totalActions).toBe(0);
		expect(result.summary.anomaliesFixed).toBe(0);
		expect(result.summary.conflictsResolved).toBe(0);
		expect(result.summary.duplicatesRemoved).toBe(0);
	});

	it('returns a non-negative duration', async () => {
		const result = await runAutoFix(['all']);
		expect(result.duration).toBeGreaterThanOrEqual(0);
	});

	it('does not call logActivity when there are no actions', async () => {
		await runAutoFix(['all']);
		expect(logActivity).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// runAutoFix – anomalies
// ---------------------------------------------------------------------------

describe('runAutoFix – anomalies', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getStore).mockResolvedValue(mockStoreObj as any);
		mockStoreSet.mockResolvedValue(undefined);
	});

	it('removes sources with values below the minimum range', async () => {
		const tooSlow = makeSource({ id: 'bad1', value: 1 }); // Below topSpeed min of 15
		const goodSource = makeSource({ id: 'good1', value: 45 });

		mockGetAll.mockResolvedValue({
			test_scooter: {
				scooterKey: 'test_scooter',
				fields: {
					topSpeed: {
						status: 'unverified',
						sources: [tooSlow, goodSource],
						confidence: 50,
					},
				},
				priceHistory: [],
				lastUpdated: new Date().toISOString(),
				overallConfidence: 50,
			},
		});

		const result = await runAutoFix(['anomalies']);
		expect(result.summary.anomaliesFixed).toBe(1);
		expect(removeSource).toHaveBeenCalledWith(mockStoreObj, 'test_scooter', 'topSpeed', 'bad1');
	});

	it('removes sources with values above the maximum range', async () => {
		const tooFast = makeSource({ id: 'bad2', value: 999 }); // Way above topSpeed max of 160

		mockGetAll.mockResolvedValue({
			test_scooter: {
				scooterKey: 'test_scooter',
				fields: {
					topSpeed: {
						status: 'unverified',
						sources: [tooFast],
						confidence: 50,
					},
				},
				priceHistory: [],
				lastUpdated: new Date().toISOString(),
				overallConfidence: 50,
			},
		});

		const result = await runAutoFix(['anomalies']);
		expect(result.summary.anomaliesFixed).toBe(1);
	});

	it('does not remove sources within valid range', async () => {
		const goodSource = makeSource({ id: 'good1', value: 50 }); // Valid topSpeed

		mockGetAll.mockResolvedValue({
			test_scooter: {
				scooterKey: 'test_scooter',
				fields: {
					topSpeed: {
						status: 'unverified',
						sources: [goodSource],
						confidence: 80,
					},
				},
				priceHistory: [],
				lastUpdated: new Date().toISOString(),
				overallConfidence: 80,
			},
		});

		const result = await runAutoFix(['anomalies']);
		expect(result.summary.anomaliesFixed).toBe(0);
		expect(removeSource).not.toHaveBeenCalled();
	});

	it('skips fields with no sources', async () => {
		mockGetAll.mockResolvedValue({
			test_scooter: {
				scooterKey: 'test_scooter',
				fields: {
					topSpeed: {
						status: 'unverified',
						sources: [],
						confidence: 0,
					},
				},
				priceHistory: [],
				lastUpdated: new Date().toISOString(),
				overallConfidence: 0,
			},
		});

		const result = await runAutoFix(['anomalies']);
		expect(result.summary.anomaliesFixed).toBe(0);
	});

	it('skips fields not covered by SPEC_RANGES (e.g. powerToWeight)', async () => {
		const source = makeSource({ id: 'src1', value: 9999 });

		mockGetAll.mockResolvedValue({
			test_scooter: {
				scooterKey: 'test_scooter',
				fields: {
					powerToWeight: {
						status: 'unverified',
						sources: [source],
						confidence: 50,
					},
				},
				priceHistory: [],
				lastUpdated: new Date().toISOString(),
				overallConfidence: 50,
			},
		});

		const result = await runAutoFix(['anomalies']);
		// powerToWeight is not in SPEC_RANGES, so no removal
		expect(result.summary.anomaliesFixed).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// runAutoFix – seed
// ---------------------------------------------------------------------------

describe('runAutoFix – seed', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getStore).mockResolvedValue(mockStoreObj as any);
		mockStoreSet.mockResolvedValue(undefined);
	});

	it('seeds missing fields from presetMetadata', async () => {
		// Empty store — no existing data for test_scooter
		mockGetAll.mockResolvedValue({});
		mockStoreGet.mockResolvedValue(null);

		const result = await runAutoFix(['seed']);
		// Should have seeded topSpeed, range, batteryWh, price from manufacturer
		// plus voltage and motorWatts from config
		expect(result.summary.fieldsSeeded).toBeGreaterThan(0);
		expect(addSource).toHaveBeenCalled();
	});

	it('skips fields that already have sources', async () => {
		// test_scooter already has topSpeed data
		mockGetAll.mockResolvedValue({
			test_scooter: {
				scooterKey: 'test_scooter',
				fields: {
					topSpeed: {
						status: 'unverified',
						sources: [makeSource({ value: 80 })],
						confidence: 80,
					},
				},
				priceHistory: [],
				lastUpdated: new Date().toISOString(),
				overallConfidence: 50,
			},
		});
		mockStoreGet.mockResolvedValue(null);

		await runAutoFix(['seed']);
		// topSpeed is skipped but other fields should still be seeded
		const calls = vi.mocked(addSource).mock.calls;
		const topSpeedCalls = calls.filter((c) => c[2] === 'topSpeed');
		expect(topSpeedCalls).toHaveLength(0);
	});

	it('skips entries with no manufacturer metadata (e.g. custom)', async () => {
		mockGetAll.mockResolvedValue({});
		mockStoreGet.mockResolvedValue(null);

		await runAutoFix(['seed']);
		// custom key has no manufacturer — should not attempt to add sources for it
		const calls = vi.mocked(addSource).mock.calls;
		const customCalls = calls.filter((c) => c[1] === 'custom');
		expect(customCalls).toHaveLength(0);
	});

	it('does not seed values that fall outside SPEC_RANGES', async () => {
		// Override presetMetadata to have an invalid topSpeed
		const originalMeta = mockPresetMetadata['test_scooter'];
		mockPresetMetadata['test_scooter'] = {
			...originalMeta,
			manufacturer: { topSpeed: 9999, range: 60, batteryWh: 1040, price: 1500 },
		};

		mockGetAll.mockResolvedValue({});
		mockStoreGet.mockResolvedValue(null);

		await runAutoFix(['seed']);
		// 9999 km/h exceeds max — topSpeed should NOT be seeded
		const calls = vi.mocked(addSource).mock.calls;
		const topSpeedCalls = calls.filter((c) => c[2] === 'topSpeed');
		expect(topSpeedCalls).toHaveLength(0);

		// Restore
		mockPresetMetadata['test_scooter'] = originalMeta;
	});
});

// ---------------------------------------------------------------------------
// runAutoFix – duplicates
// ---------------------------------------------------------------------------

describe('runAutoFix – duplicates', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getStore).mockResolvedValue(mockStoreObj as any);
		mockStoreSet.mockResolvedValue(undefined);
	});

	it('removes duplicate sources sharing the same URL and value', async () => {
		const src1 = makeSource({ id: 'a', url: 'https://example.com', value: 45 });
		const src2 = makeSource({ id: 'b', url: 'https://example.com', value: 45 }); // dup

		mockGetAll.mockResolvedValue({
			test_scooter: {
				scooterKey: 'test_scooter',
				fields: {
					topSpeed: {
						status: 'unverified',
						sources: [src1, src2],
						confidence: 80,
					},
				},
				priceHistory: [],
				lastUpdated: new Date().toISOString(),
				overallConfidence: 60,
			},
		});

		const result = await runAutoFix(['duplicates']);
		expect(result.summary.duplicatesRemoved).toBe(1);
	});

	it('does not remove sources with different URLs', async () => {
		const src1 = makeSource({ id: 'a', url: 'https://site-a.com', value: 45 });
		const src2 = makeSource({ id: 'b', url: 'https://site-b.com', value: 45 });

		mockGetAll.mockResolvedValue({
			test_scooter: {
				scooterKey: 'test_scooter',
				fields: {
					topSpeed: {
						status: 'unverified',
						sources: [src1, src2],
						confidence: 80,
					},
				},
				priceHistory: [],
				lastUpdated: new Date().toISOString(),
				overallConfidence: 60,
			},
		});

		const result = await runAutoFix(['duplicates']);
		expect(result.summary.duplicatesRemoved).toBe(0);
	});

	it('does not remove sources when field has fewer than 2 sources', async () => {
		mockGetAll.mockResolvedValue({
			test_scooter: {
				scooterKey: 'test_scooter',
				fields: {
					topSpeed: {
						status: 'unverified',
						sources: [makeSource({ id: 'a' })],
						confidence: 80,
					},
				},
				priceHistory: [],
				lastUpdated: new Date().toISOString(),
				overallConfidence: 60,
			},
		});

		const result = await runAutoFix(['duplicates']);
		expect(result.summary.duplicatesRemoved).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// runAutoFix – conflicts
// ---------------------------------------------------------------------------

describe('runAutoFix – conflicts', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getStore).mockResolvedValue(mockStoreObj as any);
		mockStoreSet.mockResolvedValue(undefined);
	});

	it('resolves conflicts when spread exceeds threshold', async () => {
		// Values with >15% spread: 40 and 80 → avg 60 → spread 66%
		const mfrSource = makeSource({ id: 'a', type: 'manufacturer', value: 80 });
		const commSource = makeSource({ id: 'b', type: 'community', value: 40 });

		mockGetAll.mockResolvedValue({
			test_scooter: {
				scooterKey: 'test_scooter',
				fields: {
					topSpeed: {
						status: 'unverified',
						sources: [mfrSource, commSource],
						confidence: 60,
					},
				},
				priceHistory: [],
				lastUpdated: new Date().toISOString(),
				overallConfidence: 60,
			},
		});

		const result = await runAutoFix(['conflicts']);
		expect(result.summary.conflictsResolved).toBe(1);
	});

	it('does not resolve conflict when spread is small', async () => {
		// 48 and 50 → avg ~49 → spread ~4%
		const src1 = makeSource({ id: 'a', type: 'manufacturer', value: 48 });
		const src2 = makeSource({ id: 'b', type: 'retailer', value: 50 });

		mockGetAll.mockResolvedValue({
			test_scooter: {
				scooterKey: 'test_scooter',
				fields: {
					topSpeed: {
						status: 'unverified',
						sources: [src1, src2],
						confidence: 80,
					},
				},
				priceHistory: [],
				lastUpdated: new Date().toISOString(),
				overallConfidence: 80,
			},
		});

		const result = await runAutoFix(['conflicts']);
		expect(result.summary.conflictsResolved).toBe(0);
	});

	it('skips already-verified fields', async () => {
		const src1 = makeSource({ id: 'a', value: 80 });
		const src2 = makeSource({ id: 'b', value: 40 });

		mockGetAll.mockResolvedValue({
			test_scooter: {
				scooterKey: 'test_scooter',
				fields: {
					topSpeed: {
						status: 'verified',
						verifiedValue: 80,
						sources: [src1, src2],
						confidence: 90,
					},
				},
				priceHistory: [],
				lastUpdated: new Date().toISOString(),
				overallConfidence: 90,
			},
		});

		const result = await runAutoFix(['conflicts']);
		expect(result.summary.conflictsResolved).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// runAutoFix – selective fix types
// ---------------------------------------------------------------------------

describe('runAutoFix – selective fix types', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getStore).mockResolvedValue(mockStoreObj as any);
		mockGetAll.mockResolvedValue({});
		mockStoreSet.mockResolvedValue(undefined);
	});

	it('runs only anomaly detection when fixTypes is ["anomalies"]', async () => {
		const result = await runAutoFix(['anomalies']);
		expect(result.success).toBe(true);
		expect(typeof result.summary.anomaliesFixed).toBe('number');
	});

	it('runs only seed when fixTypes is ["seed"]', async () => {
		const result = await runAutoFix(['seed']);
		expect(result.success).toBe(true);
	});

	it('runs only duplicates when fixTypes is ["duplicates"]', async () => {
		const result = await runAutoFix(['duplicates']);
		expect(result.success).toBe(true);
	});

	it('runs only conflicts when fixTypes is ["conflicts"]', async () => {
		const result = await runAutoFix(['conflicts']);
		expect(result.success).toBe(true);
	});

	it('defaults to all when no argument provided', async () => {
		const result = await runAutoFix();
		expect(result.success).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// runAutoFix – logActivity
// ---------------------------------------------------------------------------

describe('runAutoFix – logActivity integration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getStore).mockResolvedValue(mockStoreObj as any);
		mockStoreSet.mockResolvedValue(undefined);
	});

	it('calls logActivity when at least one action occurs', async () => {
		const tooSlow = makeSource({ id: 'bad1', value: 1 });

		mockGetAll.mockResolvedValue({
			test_scooter: {
				scooterKey: 'test_scooter',
				fields: {
					topSpeed: {
						status: 'unverified',
						sources: [tooSlow],
						confidence: 20,
					},
				},
				priceHistory: [],
				lastUpdated: new Date().toISOString(),
				overallConfidence: 20,
			},
		});

		await runAutoFix(['anomalies']);
		expect(logActivity).toHaveBeenCalledWith('auto_fix_completed', expect.any(String), expect.any(Object));
	});

	it('does not call logActivity when no actions occur', async () => {
		mockGetAll.mockResolvedValue({});

		await runAutoFix(['anomalies']);
		expect(logActivity).not.toHaveBeenCalled();
	});
});
