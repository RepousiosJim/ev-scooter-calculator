#!/usr/bin/env node
/**
 * Calibrate each preset's base consumption (`style`, Wh/km at reference
 * conditions) so the engine reproduces the manufacturer's claimed range under
 * claim conditions (75 kg rider, flat, ~15 km/h). Displayed ranges at normal
 * riding speed then come from the physics model.
 *
 *   node scripts/calibrate-presets.mjs           # dry run: print table + flags
 *   node scripts/calibrate-presets.mjs --write   # rewrite style values in presets.ts
 *
 * Claims that need less energy than the physics floor (zero extra losses) are
 * impossible: those presets are clamped to the floor and listed, so their range
 * comes out honestly below the claim.
 *
 * Flagged and NOT written (likely bad spec or claim; review by hand):
 *   - calibrated style above 3× the physics estimate (physics alone under-predicts
 *     measured consumption by up to ~2× on fast scooters)
 *   - result outside the validator's 7–80 Wh/km range
 */
import { createServer } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';

const WRITE = process.argv.includes('--write');
const PRESETS_FILE = 'src/lib/data/presets.ts';
const STYLE_MIN = 7;
const STYLE_MAX = 80;
const MAX_PHYSICS_MULTIPLE = 3;

const server = await createServer({
	server: { middlewareMode: true },
	appType: 'custom',
	logLevel: 'error',
	optimizeDeps: { noDiscovery: true, include: [] },
});
try {
	const { presets, presetMetadata } = await server.ssrLoadModule('/src/lib/data/presets.ts');
	const { calculatePerformance } = await server.ssrLoadModule('/src/lib/physics/calculator.ts');
	const { calibrateStyle } = await server.ssrLoadModule('/src/lib/physics/calibration.ts');

	const rows = [];
	const flagged = [];
	const clamped = [];
	for (const [key, config] of Object.entries(presets)) {
		const claim = presetMetadata[key]?.manufacturer?.range;
		if (!claim) continue;
		const raw = calibrateStyle(config, claim);
		const physics = calculatePerformance(config, 'spec').referencePhysicsWhPerKm ?? 0;
		const clampedToFloor = raw < physics;
		const style = Math.ceil(Math.max(raw, physics) * 10) / 10;
		if (clampedToFloor)
			clamped.push(`${key}: claim needs ${raw.toFixed(1)} Wh/km < physics floor ${physics.toFixed(1)}`);
		const reasons = [];
		if (style > MAX_PHYSICS_MULTIPLE * physics)
			reasons.push(`style ${style} > ${MAX_PHYSICS_MULTIPLE}× physics ${physics.toFixed(1)}`);
		if (style < STYLE_MIN || style > STYLE_MAX) reasons.push(`style ${style} outside ${STYLE_MIN}-${STYLE_MAX}`);
		const before = calculatePerformance(config, 'spec').totalRange;
		const after = calculatePerformance({ ...config, style }, 'spec').totalRange;
		rows.push({ key, old: config.style, style, claim, before, after, flagged: reasons.length > 0 });
		if (reasons.length) flagged.push({ key, reasons });
	}

	console.log('key'.padEnd(40), 'style old→new'.padEnd(16), 'claim', 'range before→after');
	for (const r of rows) {
		console.log(
			r.key.padEnd(40),
			`${r.old}→${r.style}${r.flagged ? ' !' : ''}`.padEnd(16),
			String(r.claim).padStart(5),
			`${r.before.toFixed(0)}→${r.after.toFixed(0)} km`
		);
	}
	console.log(`\n${clamped.length} presets clamped to the physics floor (claim not physically achievable):`);
	for (const c of clamped) console.log(`  ${c}`);
	console.log(`\n${rows.length} presets, ${flagged.length} flagged for review (not written):`);
	for (const f of flagged) console.log(`  ${f.key}: ${f.reasons.join('; ')}`);

	if (WRITE) {
		let source = readFileSync(PRESETS_FILE, 'utf8');
		let written = 0;
		for (const r of rows) {
			if (r.flagged) continue;
			// The first `key: {` block is the config entry (metadata comes later).
			const start = source.indexOf(`\n\t${r.key}: {\n`);
			const end = source.indexOf('\n\t},', start);
			const block = source.slice(start, end);
			const stylePattern = /(\n\t\tstyle: )[\d.]+,/;
			if (start < 0 || !stylePattern.test(block)) throw new Error(`No style field found for ${r.key}`);
			const updated = block.replace(stylePattern, `$1${r.style},`);
			source = source.slice(0, start) + updated + source.slice(end);
			written++;
		}
		writeFileSync(PRESETS_FILE, source);
		console.log(`\nWrote ${written} style values to ${PRESETS_FILE} (flagged presets left unchanged).`);
	}
} finally {
	await server.close();
}
