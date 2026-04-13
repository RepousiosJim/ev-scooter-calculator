/**
 * Unit tests for preset-generator.ts
 * Tests key generation, spec→config conversion, candidate creation, and code generation.
 */
import { describe, it, expect } from 'vitest';
import {
	generatePresetKey,
	specsToConfig,
	createCandidate,
	generatePresetCode,
	type PresetCandidate,
} from '$lib/server/verification/preset-generator';
import type { DiscoveredScooter } from '$lib/server/verification/discovery';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDiscovered(overrides: Partial<DiscoveredScooter> = {}): DiscoveredScooter {
	return {
		name: 'Ninebot Max G2',
		url: 'https://store.segway.com/ninebot-max-g2',
		manufacturer: 'Segway-Ninebot',
		manufacturerId: 'segway',
		specs: {},
		isKnown: false,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// generatePresetKey
// ---------------------------------------------------------------------------

describe('generatePresetKey', () => {
	it('lowercases and replaces spaces with underscores', () => {
		expect(generatePresetKey('Ninebot Max G2')).toBe('ninebot_max_g2');
	});

	it('removes parentheses', () => {
		expect(generatePresetKey('Apollo (City) Pro')).toBe('apollo_city_pro');
	});

	it('collapses multiple separators', () => {
		expect(generatePresetKey('Varla  Eagle--One')).toBe('varla_eagle_one');
	});

	it('strips leading and trailing underscores', () => {
		expect(generatePresetKey(' Eagle One ')).toBe('eagle_one');
	});

	it('handles special characters', () => {
		expect(generatePresetKey('Wolf King GT+ Pro')).toBe('wolf_king_gt_pro');
	});

	it('handles already-lower-snake-case input', () => {
		expect(generatePresetKey('kaabo_wolf')).toBe('kaabo_wolf');
	});
});

// ---------------------------------------------------------------------------
// specsToConfig
// ---------------------------------------------------------------------------

describe('specsToConfig', () => {
	it('returns defaults when given empty specs', () => {
		const config = specsToConfig({});
		expect(config.v).toBe(48); // default voltage
		expect(config.weight).toBe(80); // default rider weight
		expect(config.motors).toBe(1);
	});

	it('uses provided voltage directly', () => {
		const config = specsToConfig({ voltage: 52, batteryWh: 624 });
		expect(config.v).toBe(52);
	});

	it('infers Ah from Wh / voltage', () => {
		const config = specsToConfig({ voltage: 48, batteryWh: 480 });
		expect(config.ah).toBe(10);
	});

	it('infers dual motors for >= 2000W', () => {
		const config = specsToConfig({ motorWatts: 4000 });
		expect(config.motors).toBe(2);
		expect(config.watts).toBe(2000); // per-motor
	});

	it('keeps single motor for < 2000W', () => {
		const config = specsToConfig({ motorWatts: 500 });
		expect(config.motors).toBe(1);
		expect(config.watts).toBe(500);
	});

	it('infers dual motors for high price even if watts < 2000', () => {
		const config = specsToConfig({ motorWatts: 1000, price: 2500 });
		expect(config.motors).toBe(2);
	});

	it('infers 11" wheel for >= 2000W motor', () => {
		const config = specsToConfig({ motorWatts: 2000 });
		expect(config.wheel).toBe(11);
	});

	it('infers 10" wheel for 800-1999W motor', () => {
		const config = specsToConfig({ motorWatts: 1000 });
		expect(config.wheel).toBe(10);
	});

	it('sets scooterWeight when weight spec is provided', () => {
		const config = specsToConfig({ weight: 20 });
		expect(config.scooterWeight).toBe(20);
	});

	it('uses provided wheelSize when given', () => {
		const config = specsToConfig({ wheelSize: 10 });
		expect(config.wheel).toBe(10);
	});

	it('always has required fields', () => {
		const config = specsToConfig({ motorWatts: 500, batteryWh: 500, weight: 15 });
		expect(typeof config.v).toBe('number');
		expect(typeof config.ah).toBe('number');
		expect(typeof config.watts).toBe('number');
		expect(typeof config.motors).toBe('number');
		expect(typeof config.wheel).toBe('number');
		expect(typeof config.dragCoefficient).toBe('number');
		expect(typeof config.frontalArea).toBe('number');
		expect(typeof config.rollingResistance).toBe('number');
	});
});

// ---------------------------------------------------------------------------
// createCandidate
// ---------------------------------------------------------------------------

describe('createCandidate', () => {
	it('creates a candidate from minimal discovered scooter', () => {
		const discovered = makeDiscovered();
		const candidate = createCandidate(discovered);
		expect(candidate.key).toBeTruthy();
		expect(candidate.name).toBe('Ninebot Max G2');
		expect(candidate.status).toBe('pending');
	});

	it('uses matchedKey when available', () => {
		const discovered = makeDiscovered({ matchedKey: 'ninebot_max_g2' });
		const candidate = createCandidate(discovered);
		expect(candidate.key).toBe('ninebot_max_g2');
	});

	it('generates key from name when matchedKey is absent', () => {
		const discovered = makeDiscovered({ name: 'Apollo City 2024', matchedKey: undefined });
		const candidate = createCandidate(discovered);
		expect(candidate.key).toBe('apollo_city_2024');
	});

	it('defaults year to current year when not provided', () => {
		const discovered = makeDiscovered({ year: undefined });
		const candidate = createCandidate(discovered);
		expect(candidate.year).toBe(new Date().getFullYear());
	});

	it('uses provided year', () => {
		const discovered = makeDiscovered({ year: 2023 });
		const candidate = createCandidate(discovered);
		expect(candidate.year).toBe(2023);
	});

	it('maps manufacturerSpecs correctly', () => {
		const discovered = makeDiscovered({
			specs: { topSpeed: 25, range: 65, batteryWh: 551, price: 899, motorWatts: 350 },
		});
		const candidate = createCandidate(discovered);
		expect(candidate.manufacturerSpecs.topSpeed).toBe(25);
		expect(candidate.manufacturerSpecs.range).toBe(65);
		expect(candidate.manufacturerSpecs.batteryWh).toBe(551);
		expect(candidate.manufacturerSpecs.price).toBe(899);
		expect(candidate.manufacturerSpecs.motorWatts).toBe(350);
	});

	it('records discoveredFrom source', () => {
		const discovered = makeDiscovered({ manufacturer: 'Segway-Ninebot' });
		const candidate = createCandidate(discovered);
		expect(candidate.sources.discoveredFrom).toBe('Segway-Ninebot');
	});

	it('extractedAt is a valid ISO string', () => {
		const candidate = createCandidate(makeDiscovered());
		expect(() => new Date(candidate.sources.extractedAt)).not.toThrow();
		expect(new Date(candidate.sources.extractedAt).getTime()).not.toBeNaN();
	});

	it('produces a validation object', () => {
		const candidate = createCandidate(makeDiscovered({ specs: { batteryWh: 500, motorWatts: 350 } }));
		expect(candidate.validation).toBeDefined();
		expect(typeof candidate.validation.confidence).toBe('number');
	});

	it('uses verification data when provided (verified value takes priority)', () => {
		const discovered = makeDiscovered({ specs: { topSpeed: 25 } });
		const verification = {
			scooterKey: 'ninebot_max_g2',
			fields: {
				topSpeed: {
					status: 'verified' as const,
					sources: [],
					confidence: 95,
					verifiedValue: 30,
				},
			},
			priceHistory: [],
			lastUpdated: new Date().toISOString(),
			overallConfidence: 95,
		};
		const candidate = createCandidate(discovered, verification);
		expect(candidate.manufacturerSpecs.topSpeed).toBe(30);
	});

	it('falls back to median of source values when no verifiedValue', () => {
		const discovered = makeDiscovered({ specs: {} });
		const verification = {
			scooterKey: 'test_scooter',
			fields: {
				topSpeed: {
					status: 'unverified' as const,
					sources: [
						{
							id: '1',
							type: 'manufacturer' as const,
							name: 'Mfr',
							value: 20,
							unit: 'km/h',
							fetchedAt: '',
							addedBy: 'manual' as const,
						},
						{
							id: '2',
							type: 'review' as const,
							name: 'Review',
							value: 30,
							unit: 'km/h',
							fetchedAt: '',
							addedBy: 'manual' as const,
						},
						{
							id: '3',
							type: 'retailer' as const,
							name: 'Shop',
							value: 25,
							unit: 'km/h',
							fetchedAt: '',
							addedBy: 'manual' as const,
						},
					],
					confidence: 60,
				},
			},
			priceHistory: [],
			lastUpdated: new Date().toISOString(),
			overallConfidence: 60,
		};
		const candidate = createCandidate(discovered, verification);
		// Sorted values: [20, 25, 30] — median index 1 = 25
		expect(candidate.manufacturerSpecs.topSpeed).toBe(25);
	});
});

// ---------------------------------------------------------------------------
// generatePresetCode
// ---------------------------------------------------------------------------

describe('generatePresetCode', () => {
	function makeCandidate(key = 'ninebot_max_g2'): PresetCandidate {
		return {
			key,
			name: 'Ninebot Max G2',
			year: 2024,
			config: {
				v: 36,
				ah: 15.3,
				watts: 350,
				motors: 1,
				wheel: 10,
				weight: 80,
				style: 15,
				charger: 3,
				regen: 0,
				cost: 0.12,
				slope: 0,
				ridePosition: 0.5,
				dragCoefficient: 0.6,
				frontalArea: 0.5,
				rollingResistance: 0.015,
				soh: 1,
				ambientTemp: 20,
			},
			manufacturerSpecs: {
				topSpeed: 30,
				range: 65,
				batteryWh: 551,
				price: 899,
			},
			validation: { valid: true, issues: [], confidence: 90 },
			sources: { discoveredFrom: 'Segway', extractedAt: new Date().toISOString() },
			status: 'pending',
		};
	}

	it('returns a string', () => {
		expect(typeof generatePresetCode(makeCandidate())).toBe('string');
	});

	it('contains the preset key', () => {
		const code = generatePresetCode(makeCandidate('ninebot_max_g2'));
		expect(code).toContain('ninebot_max_g2');
	});

	it('contains // Config: and // Metadata: section headers', () => {
		const code = generatePresetCode(makeCandidate());
		expect(code).toContain('// Config:');
		expect(code).toContain('// Metadata:');
	});

	it('contains all required config fields', () => {
		const code = generatePresetCode(makeCandidate());
		expect(code).toContain('v: 36');
		expect(code).toContain('ah: 15.3');
		expect(code).toContain('watts: 350');
		expect(code).toContain('motors: 1');
		expect(code).toContain('wheel: 10');
	});

	it('contains the display name in metadata', () => {
		const code = generatePresetCode(makeCandidate());
		expect(code).toContain('"Ninebot Max G2"');
	});

	it('contains year in metadata', () => {
		const code = generatePresetCode(makeCandidate());
		expect(code).toContain('year: 2024');
	});

	it('includes topSpeed in metadata when present', () => {
		const code = generatePresetCode(makeCandidate());
		expect(code).toContain('topSpeed: 30');
	});

	it('includes range in metadata when present', () => {
		const code = generatePresetCode(makeCandidate());
		expect(code).toContain('range: 65');
	});

	it('includes price in metadata when present', () => {
		const code = generatePresetCode(makeCandidate());
		expect(code).toContain('price: 899');
	});

	it('includes scooterWeight line when scooterWeight is set', () => {
		const candidate = makeCandidate();
		candidate.config.scooterWeight = 22;
		const code = generatePresetCode(candidate);
		expect(code).toContain('scooterWeight: 22');
	});

	it('omits scooterWeight line when scooterWeight is not set', () => {
		const candidate = makeCandidate();
		candidate.config.scooterWeight = undefined;
		const code = generatePresetCode(candidate);
		expect(code).not.toContain('scooterWeight');
	});

	it('omits topSpeed line when not provided', () => {
		const candidate = makeCandidate();
		candidate.manufacturerSpecs.topSpeed = undefined;
		const code = generatePresetCode(candidate);
		expect(code).not.toContain('topSpeed');
	});

	it('contains status: current in metadata', () => {
		const code = generatePresetCode(makeCandidate());
		expect(code).toContain("status: 'current'");
	});
});
