/**
 * Unit tests for spec-enrichment.ts
 * Tests spec extraction strategies from HTML content.
 */
import { describe, it, expect } from 'vitest';
import {
	parseSpecsFromText,
	extractSpecsFromHtml,
	enrichCandidate,
	applyEnrichment,
	stripTags,
} from '$lib/server/verification/spec-enrichment';
import type { PresetCandidate } from '$lib/server/verification/preset-generator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCandidate(overrides: Partial<PresetCandidate> = {}): PresetCandidate {
	return {
		key: 'test_scooter',
		name: 'Test Scooter Pro',
		year: 2024,
		config: {
			v: 48,
			ah: 10,
			watts: 500,
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
		} as any,
		manufacturerSpecs: {},
		validation: { valid: true, issues: [], confidence: 20 } as any,
		specsQuality: 'stub' as const,
		sources: { discoveredFrom: 'https://example.com/scooter', extractedAt: new Date().toISOString() },
		status: 'pending',
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// stripTags
// ---------------------------------------------------------------------------

describe('stripTags', () => {
	it('removes HTML tags', () => {
		expect(stripTags('<p>Hello <b>world</b></p>')).toBe('Hello world');
	});

	it('collapses whitespace', () => {
		expect(stripTags('<div>  a   b  </div>')).toBe('a b');
	});
});

// ---------------------------------------------------------------------------
// parseSpecsFromText
// ---------------------------------------------------------------------------

describe('parseSpecsFromText', () => {
	it('extracts voltage', () => {
		const result = parseSpecsFromText('Battery: 48V 15.3Ah lithium-ion');
		expect(result.voltage).toBe(48);
	});

	it('extracts battery Wh', () => {
		const result = parseSpecsFromText('Battery capacity: 748Wh');
		expect(result.batteryWh).toBe(748);
	});

	it('extracts Ah', () => {
		const result = parseSpecsFromText('15.3Ah battery');
		expect(result.ampHours).toBe(15.3);
	});

	it('computes Wh from V * Ah when Wh not present', () => {
		const result = parseSpecsFromText('48V 20Ah lithium battery');
		expect(result.voltage).toBe(48);
		expect(result.ampHours).toBe(20);
		expect(result.batteryWh).toBe(960);
	});

	it('extracts motor watts', () => {
		const result = parseSpecsFromText('Dual 1200W motor');
		expect(result.motorWatts).toBe(1200);
	});

	it('extracts top speed in km/h', () => {
		const result = parseSpecsFromText('Top speed: 65 km/h');
		expect(result.topSpeed).toBe(65);
	});

	it('converts mph to km/h', () => {
		const result = parseSpecsFromText('Max speed 40 mph');
		expect(result.topSpeed).toBeCloseTo(64.4, 0);
	});

	it('extracts range in km', () => {
		const result = parseSpecsFromText('Range: 80 km');
		expect(result.range).toBe(80);
	});

	it('converts miles to km', () => {
		const result = parseSpecsFromText('Range up to 50 miles');
		expect(result.range).toBeCloseTo(80.5, 0);
	});

	it('extracts weight in kg', () => {
		const result = parseSpecsFromText('Weight: 23 kg');
		expect(result.weight).toBe(23);
	});

	it('converts lbs to kg', () => {
		const result = parseSpecsFromText('Weight: 55 lbs');
		expect(result.weight).toBeCloseTo(24.9, 0);
	});

	it('extracts wheel size', () => {
		const result = parseSpecsFromText('10 inch pneumatic tires');
		expect(result.wheelSize).toBe(10);
	});

	it('extracts charge time', () => {
		const result = parseSpecsFromText('Charge time: 6 hours to full');
		expect(result.chargeTime).toBe(6);
	});

	it('extracts max rider weight', () => {
		const result = parseSpecsFromText('Maximum load capacity: 120 kg');
		expect(result.maxRiderWeight).toBe(120);
	});

	it('extracts hill grade', () => {
		const result = parseSpecsFromText('Climbing ability: 25° hill grade');
		expect(result.hillGrade).toBe(25);
	});

	it('handles realistic product description', () => {
		const desc = `
			The VSETT 10+ features dual 1400W motors (2800W total), a 60V 25.6Ah
			lithium battery (1536Wh), and reaches a top speed of 80 km/h.
			Range of up to 90 km on a single charge. Weight: 35 kg.
			10 inch pneumatic tires. 6-8 hours charge time.
		`;
		const result = parseSpecsFromText(desc);
		expect(result.voltage).toBe(60);
		expect(result.ampHours).toBe(25.6);
		expect(result.motorWatts).toBe(1400);
		expect(result.topSpeed).toBe(80);
		expect(result.range).toBe(90);
		expect(result.weight).toBe(35);
		expect(result.wheelSize).toBe(10);
	});

	it('rejects out-of-range values', () => {
		const result = parseSpecsFromText('Motor: 50W, Range: 1 km, Weight: 200 kg');
		expect(result.motorWatts).toBeUndefined(); // 50W too low
		expect(result.range).toBeUndefined(); // 1km too low
		expect(result.weight).toBeUndefined(); // 200kg too high
	});
});

// ---------------------------------------------------------------------------
// extractSpecsFromHtml
// ---------------------------------------------------------------------------

describe('extractSpecsFromHtml', () => {
	it('extracts from JSON-LD Product schema', () => {
		const html = `
			<html><body>
			<script type="application/ld+json">
			{
				"@type": "Product",
				"name": "VSETT 10+",
				"offers": { "price": "2199.00" },
				"weight": { "value": "35", "unitText": "kg" },
				"description": "Dual 1400W motors, 60V 25.6Ah battery, top speed 80 km/h"
			}
			</script>
			</body></html>
		`;
		const { specs, strategies } = extractSpecsFromHtml(html);
		expect(strategies).toContain('json-ld');
		expect(specs.price).toBe(2199);
		expect(specs.weight).toBe(35);
		expect(specs.motorWatts).toBe(1400);
	});

	it('extracts from spec tables', () => {
		const html = `
			<html><body>
			<table>
				<tr><th>Battery</th><td>48V 15.3Ah (748Wh)</td></tr>
				<tr><th>Motor Power</th><td>500W</td></tr>
				<tr><th>Top Speed</th><td>30 km/h</td></tr>
				<tr><th>Range</th><td>65 km</td></tr>
				<tr><th>Weight</th><td>19.5 kg</td></tr>
				<tr><th>Wheel Size</th><td>10 inch</td></tr>
			</table>
			</body></html>
		`;
		const { specs, strategies } = extractSpecsFromHtml(html);
		expect(strategies).toContain('spec-table');
		expect(specs.batteryWh).toBe(748);
		expect(specs.motorWatts).toBe(500);
		expect(specs.topSpeed).toBe(30);
		expect(specs.range).toBe(65);
		expect(specs.weight).toBe(19.5);
		expect(specs.wheelSize).toBe(10);
	});

	it('extracts from definition lists', () => {
		const html = `
			<html><body>
			<dl>
				<dt>Voltage</dt><dd>52V</dd>
				<dt>Battery Capacity</dt><dd>1040Wh</dd>
				<dt>Motor</dt><dd>2000W</dd>
			</dl>
			</body></html>
		`;
		const { specs, strategies } = extractSpecsFromHtml(html);
		expect(strategies).toContain('spec-table');
		expect(specs.voltage).toBe(52);
		expect(specs.batteryWh).toBe(1040);
		expect(specs.motorWatts).toBe(2000);
	});

	it('falls back to text mining', () => {
		const html = `
			<html><body>
			<div>
				<p>This electric scooter features a 48V 20Ah battery,
				1000W motor, and reaches 45 km/h top speed with 60 km range.</p>
			</div>
			</body></html>
		`;
		const { specs, strategies } = extractSpecsFromHtml(html);
		expect(strategies).toContain('text-mining');
		expect(specs.voltage).toBe(48);
		expect(specs.motorWatts).toBe(1000);
		expect(specs.topSpeed).toBe(45);
		expect(specs.range).toBe(60);
	});

	it('merges specs from multiple strategies without overwriting', () => {
		const html = `
			<html><body>
			<script type="application/ld+json">
			{
				"@type": "Product",
				"name": "Test Scooter",
				"offers": { "price": "899" }
			}
			</script>
			<table>
				<tr><th>Motor</th><td>500W</td></tr>
				<tr><th>Battery</th><td>748Wh</td></tr>
			</table>
			<p>Top speed 30 km/h, range 65 km, weight 19.5 kg</p>
			</body></html>
		`;
		const { specs } = extractSpecsFromHtml(html);
		expect(specs.price).toBe(899);
		expect(specs.motorWatts).toBe(500);
		expect(specs.batteryWh).toBe(748);
		expect(specs.topSpeed).toBe(30);
		expect(specs.range).toBe(65);
	});

	it('returns empty specs for HTML with no product data', () => {
		const html = '<html><body><p>Hello world</p></body></html>';
		const { specs, strategies } = extractSpecsFromHtml(html);
		expect(Object.keys(specs).length).toBe(0);
		expect(strategies.length).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// enrichCandidate
// ---------------------------------------------------------------------------

describe('enrichCandidate', () => {
	it('returns error when no source URL', async () => {
		const candidate = makeCandidate({ sources: { extractedAt: new Date().toISOString() } });
		const result = await enrichCandidate(candidate);
		expect(result.success).toBe(false);
		expect(result.errors).toContain('No source URL available');
	});
});

// ---------------------------------------------------------------------------
// applyEnrichment
// ---------------------------------------------------------------------------

describe('applyEnrichment', () => {
	it('applies found specs to candidate', () => {
		const candidate = makeCandidate();
		const result = {
			success: true as const,
			specsFound: { topSpeed: 45, range: 60, batteryWh: 748, motorWatts: 500, weight: 19 },
			specsQuality: 'complete' as const,
			strategies: ['spec-table'],
		};
		const updated = applyEnrichment(candidate, result);
		expect(updated.manufacturerSpecs.topSpeed).toBe(45);
		expect(updated.manufacturerSpecs.range).toBe(60);
		expect(updated.manufacturerSpecs.batteryWh).toBe(748);
		expect(updated.manufacturerSpecs.motorWatts).toBe(500);
		expect(updated.manufacturerSpecs.weight).toBe(19);
		expect(updated.specsQuality).toBe('complete');
	});

	it('does not overwrite existing specs', () => {
		const candidate = makeCandidate({
			manufacturerSpecs: { topSpeed: 50 },
		});
		const result = {
			success: true as const,
			specsFound: { topSpeed: 45, range: 60 },
			specsQuality: 'partial' as const,
			strategies: ['text-mining'],
		};
		const updated = applyEnrichment(candidate, result);
		expect(updated.manufacturerSpecs.topSpeed).toBe(50); // kept original
		expect(updated.manufacturerSpecs.range).toBe(60); // filled gap
	});

	it('returns original candidate when enrichment failed', () => {
		const candidate = makeCandidate();
		const result = {
			success: false as const,
			specsFound: {},
			specsQuality: 'stub' as const,
			strategies: [],
			errors: ['Failed to fetch'],
		};
		const updated = applyEnrichment(candidate, result);
		expect(updated).toEqual(candidate);
	});
});
