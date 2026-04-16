import { describe, expect, it } from 'vitest';
import { presets, presetMetadata } from '../../src/lib/data/presets';
import { validateConfig } from '../../src/lib/server/verification/physics-validator';
import { calculatePerformance } from '../../src/lib/physics';

/**
 * Continuous data-quality audit. Runs validateConfig against every preset and
 * fails CI if any entry has a validation error. Warnings are surfaced via
 * console for visibility but do not fail the build.
 *
 * If a new preset legitimately needs an exception, fix the validator threshold
 * rather than silencing this test — the validator is the single source of truth
 * for "what counts as physically plausible".
 */
describe('preset catalog data quality', () => {
	it('every preset passes physics validation with zero errors', () => {
		const errors: string[] = [];
		const warnings: string[] = [];

		for (const key of Object.keys(presets)) {
			if (key === 'custom') continue;
			const config = presets[key];
			const claimedWh = presetMetadata[key]?.manufacturer?.batteryWh;
			const result = validateConfig(config, { batteryWh: claimedWh });
			for (const issue of result.issues) {
				const line = `[${key}] ${issue.field}: ${issue.message}`;
				if (issue.severity === 'error') errors.push(line);
				else warnings.push(line);
			}
		}

		if (warnings.length > 0) {
			console.warn(`\nCatalog audit — ${warnings.length} warning(s):`);
			for (const w of warnings) console.warn('  ' + w);
		}

		expect(errors, `Catalog has ${errors.length} validation error(s):\n  ${errors.join('\n  ')}`).toEqual([]);
	});

	/**
	 * Cross-reference every preset's calculated physics output against its
	 * manufacturer-claimed spec. Protects against data-entry bugs that slip
	 * past range checks — e.g. a preset with plausible-looking V/Ah/watts
	 * but the wrong motor power, which would produce a top speed wildly
	 * different from the advertised one.
	 *
	 * Thresholds are intentionally loose because real manufacturer specs and
	 * our nominal-load physics model legitimately disagree:
	 *   - Top speed: many scooters are firmware-limited well below hardware
	 *     capability (e.g. UK 15.5 mph cap on a 500W scooter).
	 *   - Range: marketing claims are typically measured in eco mode at low
	 *     speed with a light rider; real-world spec-mode range is often half.
	 * The error thresholds (85%) only catch order-of-magnitude bugs; the
	 * warning thresholds (20% / 35%) surface everything else for review.
	 */
	it('every preset has calculated specs within range of manufacturer claims', () => {
		const errors: string[] = [];
		const warnings: string[] = [];

		for (const key of Object.keys(presets)) {
			if (key === 'custom') continue;
			const config = presets[key];
			const claim = presetMetadata[key]?.manufacturer;
			if (!claim) continue;

			const calc = calculatePerformance(config, 'spec');

			// --- Top speed (km/h) ---
			if (claim.topSpeed > 0 && calc.speed > 0) {
				const diff = Math.abs(calc.speed - claim.topSpeed) / claim.topSpeed;
				const line = `[${key}] topSpeed: claimed ${claim.topSpeed} km/h, calculated ${calc.speed.toFixed(1)} km/h (${(diff * 100).toFixed(0)}% off)`;
				if (diff > 0.85) errors.push(line);
				else if (diff > 0.2) warnings.push(line);
			}

			// --- Range (km) ---
			if (claim.range > 0 && calc.totalRange > 0) {
				const diff = Math.abs(calc.totalRange - claim.range) / claim.range;
				const line = `[${key}] range: claimed ${claim.range} km, calculated ${calc.totalRange.toFixed(1)} km (${(diff * 100).toFixed(0)}% off)`;
				if (diff > 0.85) errors.push(line);
				else if (diff > 0.35) warnings.push(line);
			}
		}

		if (warnings.length > 0) {
			console.warn(`\nClaim-vs-calc audit — ${warnings.length} warning(s):`);
			for (const w of warnings) console.warn('  ' + w);
		}

		expect(errors, `Catalog has ${errors.length} claim-vs-calc divergence(s):\n  ${errors.join('\n  ')}`).toEqual([]);
	});
});
