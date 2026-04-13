/**
 * Unit tests for src/lib/server/verification/smart-alerts.ts
 *
 * presetMetadata, knownSources and SPEC_RANGES are mocked so the tests
 * run without touching the real data files.
 */
import { describe, it, expect, vi } from 'vitest';
import type { ScooterVerification, FieldVerification, SourceEntry } from '$lib/server/verification/types';

// ---------------------------------------------------------------------------
// Mocks (hoisted so they run before imports)
// ---------------------------------------------------------------------------

vi.mock('$lib/data/presets', () => ({
	presetMetadata: {
		test_scooter: {
			name: 'Test Scooter',
			year: 2024,
			manufacturer: {
				topSpeed: 45,
				range: 80,
				batteryWh: 1000,
				price: 1500,
			},
		},
		scooter_b: {
			name: 'Scooter B',
			year: 2023,
			manufacturer: {
				topSpeed: 30,
				range: 40,
				batteryWh: 500,
			},
		},
		custom: {
			name: 'Custom',
			year: 2024,
			manufacturer: { topSpeed: 0, range: 0, batteryWh: 0 },
		},
	},
	presets: {},
}));

vi.mock('$lib/server/verification/known-sources', () => ({
	knownSources: {
		// test_scooter has sources, scooter_b does NOT
		test_scooter: [{ name: 'Official', type: 'manufacturer', url: 'https://example.com' }],
	},
}));

vi.mock('$lib/server/verification/auto-fix', () => ({
	SPEC_RANGES: {
		topSpeed: { min: 15, max: 160, unit: 'km/h' },
		range: { min: 10, max: 250, unit: 'km' },
		batteryWh: { min: 150, max: 10000, unit: 'Wh' },
		price: { min: 100, max: 15000, unit: 'USD' },
		motorWatts: { min: 200, max: 20000, unit: 'W' },
		weight: { min: 5, max: 80, unit: 'kg' },
	},
}));

import { generateAlerts } from '$lib/server/verification/smart-alerts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSource(overrides: Partial<SourceEntry> = {}): SourceEntry {
	return {
		id: Math.random().toString(36).slice(2),
		type: 'manufacturer',
		name: 'Test Source',
		url: 'https://example.com',
		value: 45,
		unit: 'km/h',
		fetchedAt: new Date().toISOString(),
		addedBy: 'manual',
		...overrides,
	};
}

function makeFieldVerification(overrides: Partial<FieldVerification> = {}): FieldVerification {
	return {
		status: 'unverified',
		sources: [makeSource()],
		confidence: 80,
		...overrides,
	};
}

function makeVerification(
	key: string,
	fields: ScooterVerification['fields'] = {},
	overrides: Partial<ScooterVerification> = {}
): ScooterVerification {
	return {
		scooterKey: key,
		fields,
		priceHistory: [],
		lastUpdated: new Date().toISOString(),
		overallConfidence: 80,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Empty / no data
// ---------------------------------------------------------------------------

describe('generateAlerts – empty verification data', () => {
	it('returns an AlertSummary with the expected shape for empty input', () => {
		const result = generateAlerts({});
		expect(result).toHaveProperty('alerts');
		expect(result).toHaveProperty('criticalCount');
		expect(result).toHaveProperty('warningCount');
		expect(result).toHaveProperty('infoCount');
		expect(result).toHaveProperty('byCategory');
		expect(result).toHaveProperty('healthScore');
		expect(result).toHaveProperty('topPriority');
	});

	it('generates a no_sources alert for each scooter with no verification data', () => {
		const result = generateAlerts({});
		// All 2 non-custom scooters (custom is filtered) should get alerts
		const noSourceAlerts = result.alerts.filter((a) => a.category === 'no_sources');
		expect(noSourceAlerts.length).toBeGreaterThanOrEqual(2);
	});
});

// ---------------------------------------------------------------------------
// no_sources alert
// ---------------------------------------------------------------------------

describe('generateAlerts – no_sources', () => {
	it('generates a "warning" no_sources alert for a scooter that has known sources but no data', () => {
		// test_scooter has sources in knownSources but no verification data
		const result = generateAlerts({});
		const alert = result.alerts.find((a) => a.scooterKey === 'test_scooter' && a.category === 'no_sources');
		expect(alert).toBeDefined();
		expect(alert!.severity).toBe('warning');
	});

	it('generates an "info" no_sources alert for a scooter with no known sources and no data', () => {
		// scooter_b has no known sources in our mock
		const result = generateAlerts({});
		const alert = result.alerts.find((a) => a.scooterKey === 'scooter_b' && a.category === 'no_sources');
		expect(alert).toBeDefined();
		expect(alert!.severity).toBe('info');
	});
});

// ---------------------------------------------------------------------------
// stale data
// ---------------------------------------------------------------------------

describe('generateAlerts – stale data', () => {
	it('generates a stale alert for fields last fetched over 30 days ago', () => {
		const oldDate = new Date();
		oldDate.setDate(oldDate.getDate() - 35);

		const verification = makeVerification('test_scooter', {
			topSpeed: makeFieldVerification({
				sources: [makeSource({ fetchedAt: oldDate.toISOString(), value: 45 })],
			}),
		});

		const result = generateAlerts({ test_scooter: verification });
		const staleAlert = result.alerts.find((a) => a.scooterKey === 'test_scooter' && a.category === 'stale');
		expect(staleAlert).toBeDefined();
		expect(staleAlert!.severity).toBe('info');
	});

	it('does NOT generate a stale alert for recently fetched data', () => {
		const recentDate = new Date();
		recentDate.setDate(recentDate.getDate() - 5);

		const verification = makeVerification('test_scooter', {
			topSpeed: makeFieldVerification({
				sources: [makeSource({ fetchedAt: recentDate.toISOString(), value: 45 })],
			}),
		});

		const result = generateAlerts({ test_scooter: verification });
		const staleAlert = result.alerts.find((a) => a.scooterKey === 'test_scooter' && a.category === 'stale');
		expect(staleAlert).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// anomaly (physics violation / out-of-range value)
// ---------------------------------------------------------------------------

describe('generateAlerts – anomaly (out-of-range values)', () => {
	it('generates a critical anomaly alert for topSpeed value below minimum (< 15 km/h)', () => {
		const verification = makeVerification('test_scooter', {
			topSpeed: makeFieldVerification({
				sources: [makeSource({ value: 5, unit: 'km/h' })], // below range min of 15
			}),
		});

		const result = generateAlerts({ test_scooter: verification });
		const anomaly = result.alerts.find(
			(a) => a.category === 'anomaly' && a.scooterKey === 'test_scooter' && a.field === 'topSpeed'
		);
		expect(anomaly).toBeDefined();
		expect(anomaly!.severity).toBe('critical');
	});

	it('generates a critical anomaly alert for topSpeed value above maximum (> 160 km/h)', () => {
		const verification = makeVerification('test_scooter', {
			topSpeed: makeFieldVerification({
				sources: [makeSource({ value: 200, unit: 'km/h' })], // above range max of 160
			}),
		});

		const result = generateAlerts({ test_scooter: verification });
		const anomaly = result.alerts.find((a) => a.category === 'anomaly' && a.scooterKey === 'test_scooter');
		expect(anomaly).toBeDefined();
		expect(anomaly!.severity).toBe('critical');
	});

	it('does NOT generate an anomaly alert for values within the expected range', () => {
		const verification = makeVerification('test_scooter', {
			topSpeed: makeFieldVerification({
				sources: [makeSource({ value: 45, unit: 'km/h' })], // within 15-160
			}),
		});

		const result = generateAlerts({ test_scooter: verification });
		const anomaly = result.alerts.find(
			(a) => a.category === 'anomaly' && a.scooterKey === 'test_scooter' && a.field === 'topSpeed'
		);
		expect(anomaly).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// conflict
// ---------------------------------------------------------------------------

describe('generateAlerts – conflict', () => {
	it('generates a conflict warning when two sources disagree by more than 15%', () => {
		const verification = makeVerification('test_scooter', {
			topSpeed: makeFieldVerification({
				sources: [makeSource({ value: 30, name: 'Source A' }), makeSource({ value: 50, name: 'Source B' })],
				verifiedValue: undefined,
			}),
		});

		const result = generateAlerts({ test_scooter: verification });
		const conflict = result.alerts.find(
			(a) => a.category === 'conflict' && a.scooterKey === 'test_scooter' && a.field === 'topSpeed'
		);
		expect(conflict).toBeDefined();
		expect(conflict!.severity).toBe('warning');
	});

	it('does NOT generate a conflict when sources agree (spread <= 15%)', () => {
		const verification = makeVerification('test_scooter', {
			topSpeed: makeFieldVerification({
				sources: [makeSource({ value: 44, name: 'Source A' }), makeSource({ value: 45, name: 'Source B' })],
				verifiedValue: undefined,
			}),
		});

		const result = generateAlerts({ test_scooter: verification });
		const conflict = result.alerts.find(
			(a) => a.category === 'conflict' && a.field === 'topSpeed' && a.scooterKey === 'test_scooter'
		);
		expect(conflict).toBeUndefined();
	});

	it('does NOT generate a conflict when verifiedValue is already set', () => {
		const verification = makeVerification('test_scooter', {
			topSpeed: makeFieldVerification({
				sources: [makeSource({ value: 30, name: 'Source A' }), makeSource({ value: 50, name: 'Source B' })],
				verifiedValue: 40, // already resolved
			}),
		});

		const result = generateAlerts({ test_scooter: verification });
		const conflict = result.alerts.find(
			(a) => a.category === 'conflict' && a.field === 'topSpeed' && a.scooterKey === 'test_scooter'
		);
		expect(conflict).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// missing fields
// ---------------------------------------------------------------------------

describe('generateAlerts – missing fields', () => {
	it('generates a missing alert when some critical fields have no sources', () => {
		// Provide only topSpeed, leaving range/batteryWh/price/motorWatts/weight missing
		const verification = makeVerification('test_scooter', {
			topSpeed: makeFieldVerification({
				sources: [makeSource({ value: 45 })],
			}),
		});

		const result = generateAlerts({ test_scooter: verification });
		const missing = result.alerts.find((a) => a.category === 'missing' && a.scooterKey === 'test_scooter');
		expect(missing).toBeDefined();
	});

	it('uses "warning" severity when 3 or more fields are missing', () => {
		const verification = makeVerification('test_scooter', {
			// Only 1 field present; 5 critical fields missing
			topSpeed: makeFieldVerification({ sources: [makeSource({ value: 45 })] }),
		});

		const result = generateAlerts({ test_scooter: verification });
		const missing = result.alerts.find((a) => a.category === 'missing' && a.scooterKey === 'test_scooter');
		expect(missing).toBeDefined();
		expect(missing!.severity).toBe('warning');
	});

	it('uses "info" severity when fewer than 3 fields are missing', () => {
		// Provide 5 out of 6 critical fields, leaving only 1 missing
		const verification = makeVerification('test_scooter', {
			topSpeed: makeFieldVerification({ sources: [makeSource({ value: 45, unit: 'km/h' })] }),
			range: makeFieldVerification({ sources: [makeSource({ value: 80, unit: 'km' })] }),
			batteryWh: makeFieldVerification({ sources: [makeSource({ value: 1000, unit: 'Wh' })] }),
			price: makeFieldVerification({ sources: [makeSource({ value: 1500, unit: 'USD' })] }),
			motorWatts: makeFieldVerification({ sources: [makeSource({ value: 500, unit: 'W' })] }),
			// weight is missing
		});

		const result = generateAlerts({ test_scooter: verification });
		const missing = result.alerts.find((a) => a.category === 'missing' && a.scooterKey === 'test_scooter');
		expect(missing).toBeDefined();
		expect(missing!.severity).toBe('info');
	});
});

// ---------------------------------------------------------------------------
// low_confidence
// ---------------------------------------------------------------------------

describe('generateAlerts – low_confidence', () => {
	it('generates a warning for overallConfidence below 30%', () => {
		const verification = makeVerification(
			'test_scooter',
			{ topSpeed: makeFieldVerification({ sources: [makeSource({ value: 45 })] }) },
			{ overallConfidence: 20 }
		);

		const result = generateAlerts({ test_scooter: verification });
		const alert = result.alerts.find((a) => a.category === 'low_confidence' && a.scooterKey === 'test_scooter');
		expect(alert).toBeDefined();
		expect(alert!.severity).toBe('warning');
	});

	it('does NOT generate a low_confidence alert for confidence >= 30', () => {
		const verification = makeVerification(
			'test_scooter',
			{ topSpeed: makeFieldVerification({ sources: [makeSource({ value: 45 })] }) },
			{ overallConfidence: 30 }
		);

		const result = generateAlerts({ test_scooter: verification });
		const alert = result.alerts.find((a) => a.category === 'low_confidence' && a.scooterKey === 'test_scooter');
		expect(alert).toBeUndefined();
	});

	it('does NOT generate a low_confidence alert when overallConfidence is 0', () => {
		// Condition: confidence > 0 AND confidence < 30 — zero is excluded
		const verification = makeVerification(
			'test_scooter',
			{ topSpeed: makeFieldVerification({ sources: [makeSource({ value: 45 })] }) },
			{ overallConfidence: 0 }
		);

		const result = generateAlerts({ test_scooter: verification });
		const alert = result.alerts.find((a) => a.category === 'low_confidence' && a.scooterKey === 'test_scooter');
		expect(alert).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// price_change
// ---------------------------------------------------------------------------

describe('generateAlerts – price_change', () => {
	it('generates a warning when price increased by >= 10%', () => {
		const earlier = new Date(Date.now() - 86400000 * 10).toISOString();
		const later = new Date().toISOString();
		const verification = makeVerification(
			'test_scooter',
			{ topSpeed: makeFieldVerification({ sources: [makeSource({ value: 45 })] }) },
			{
				priceHistory: [
					{ price: 1000, currency: 'USD', source: 'store', observedAt: earlier },
					{ price: 1200, currency: 'USD', source: 'store', observedAt: later },
				],
			}
		);

		const result = generateAlerts({ test_scooter: verification });
		const alert = result.alerts.find((a) => a.category === 'price_change' && a.scooterKey === 'test_scooter');
		expect(alert).toBeDefined();
		expect(alert!.severity).toBe('warning');
	});

	it('generates an info when price dropped by >= 10%', () => {
		const earlier = new Date(Date.now() - 86400000 * 10).toISOString();
		const later = new Date().toISOString();
		const verification = makeVerification(
			'test_scooter',
			{ topSpeed: makeFieldVerification({ sources: [makeSource({ value: 45 })] }) },
			{
				priceHistory: [
					{ price: 1200, currency: 'USD', source: 'store', observedAt: earlier },
					{ price: 1000, currency: 'USD', source: 'store', observedAt: later },
				],
			}
		);

		const result = generateAlerts({ test_scooter: verification });
		const alert = result.alerts.find((a) => a.category === 'price_change' && a.scooterKey === 'test_scooter');
		expect(alert).toBeDefined();
		expect(alert!.severity).toBe('info');
	});

	it('does NOT generate a price_change alert for small price changes (< 10%)', () => {
		const earlier = new Date(Date.now() - 86400000 * 10).toISOString();
		const later = new Date().toISOString();
		const verification = makeVerification(
			'test_scooter',
			{ topSpeed: makeFieldVerification({ sources: [makeSource({ value: 45 })] }) },
			{
				priceHistory: [
					{ price: 1000, currency: 'USD', source: 'store', observedAt: earlier },
					{ price: 1050, currency: 'USD', source: 'store', observedAt: later },
				],
			}
		);

		const result = generateAlerts({ test_scooter: verification });
		const alert = result.alerts.find((a) => a.category === 'price_change' && a.scooterKey === 'test_scooter');
		expect(alert).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// Summary counts and sort order
// ---------------------------------------------------------------------------

describe('generateAlerts – summary', () => {
	it('counts critical/warning/info correctly', () => {
		// An anomaly (critical) for topSpeed out of range
		const verification = makeVerification('test_scooter', {
			topSpeed: makeFieldVerification({
				sources: [makeSource({ value: 999, unit: 'km/h' })], // anomaly → critical
			}),
		});

		const result = generateAlerts({ test_scooter: verification });
		expect(result.criticalCount).toBeGreaterThanOrEqual(1);
		expect(result.criticalCount).toBe(result.alerts.filter((a) => a.severity === 'critical').length);
		expect(result.warningCount).toBe(result.alerts.filter((a) => a.severity === 'warning').length);
		expect(result.infoCount).toBe(result.alerts.filter((a) => a.severity === 'info').length);
	});

	it('sorts alerts critical → warning → info', () => {
		const result = generateAlerts({});
		const severities = result.alerts.map((a) => a.severity);
		let lastOrder = -1;
		const ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };
		for (const s of severities) {
			expect(ORDER[s]).toBeGreaterThanOrEqual(lastOrder);
			lastOrder = ORDER[s];
		}
	});

	it('topPriority contains at most 10 alerts', () => {
		const result = generateAlerts({});
		expect(result.topPriority.length).toBeLessThanOrEqual(10);
	});

	it('byCategory sums match total alerts length', () => {
		const result = generateAlerts({});
		const categoryTotal = Object.values(result.byCategory).reduce((a, b) => a + b, 0);
		expect(categoryTotal).toBe(result.alerts.length);
	});

	it('healthScore is between 0 and 100', () => {
		const result = generateAlerts({});
		expect(result.healthScore).toBeGreaterThanOrEqual(0);
		expect(result.healthScore).toBeLessThanOrEqual(100);
	});
});

// ---------------------------------------------------------------------------
// Multiple scooters
// ---------------------------------------------------------------------------

describe('generateAlerts – multiple scooters', () => {
	it('aggregates alerts from multiple scooters', () => {
		const verifications = {
			test_scooter: makeVerification('test_scooter', {
				topSpeed: makeFieldVerification({ sources: [makeSource({ value: 999 })] }), // anomaly
			}),
			scooter_b: makeVerification('scooter_b', {
				topSpeed: makeFieldVerification({ sources: [makeSource({ value: 30 })] }),
			}),
		};

		const result = generateAlerts(verifications);
		const keys = new Set(result.alerts.map((a) => a.scooterKey));
		expect(keys.size).toBeGreaterThanOrEqual(1);
	});
});
