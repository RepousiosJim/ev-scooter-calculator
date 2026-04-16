import { describe, expect, it } from 'vitest';
import { presets, presetMetadata } from '../../src/lib/data/presets';
import { validateConfig } from '../../src/lib/server/verification/physics-validator';

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
});
