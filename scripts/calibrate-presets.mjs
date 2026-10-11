#!/usr/bin/env node
/**
 * 1. Fit each preset's motor KV so the engine's top speed matches the claimed top
 *    speed. Presets with a firmware/legal `speedCap` keep their KV. Where the
 *    motor's power can't reach the claim at any KV, the RPM limit is set 15%
 *    above the claim and power decides the top speed (listed as power-limited).
 *
 * 2. Calibrate each preset's base consumption (`style`, Wh/km at reference
 * conditions) so the engine reproduces the manufacturer's claimed range under
 * claim conditions (75 kg rider, flat, ~15 km/h). Displayed ranges at normal
 * riding speed then come from the physics model.
 *
 * When a preset has an independently tested range (`tested.range`, measured in
 * regular riding), that is used instead: the style is set so the everyday range
 * matches the test.
 *
 *   node scripts/calibrate-presets.mjs           # dry run: print table + flags
 *   node scripts/calibrate-presets.mjs --write   # rewrite motorKv and style values in presets.ts
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
const KV_SEARCH_MAX = 400;
const KV_HEADROOM = 1.15;
const INCH_TO_METERS = 0.0254;

/** Rewrite (or add) a numeric field in a preset's config block. */
function setConfigField(source, key, field, value) {
	// The first `key: {` block is the config entry (metadata comes later).
	const start = source.indexOf(`\n\t${key}: {\n`);
	const end = source.indexOf('\n\t},', start);
	if (start < 0) throw new Error(`No config block found for ${key}`);
	const block = source.slice(start, end);
	const pattern = new RegExp(`(\\n\\t\\t${field}: )[\\d.]+,`);
	const updated = pattern.test(block) ? block.replace(pattern, `$1${value},`) : `${block}\n\t\t${field}: ${value},`;
	return source.slice(0, start) + updated + source.slice(end);
}

/** The motor KV that makes the calculated top speed match the claim. */
function fitMotorKv(config, claim, calculatePerformance) {
	const speedAt = (motorKv) => calculatePerformance({ ...config, motorKv }, 'spec').speed;
	if (speedAt(KV_SEARCH_MAX) < claim * 0.98) {
		const sag = config.batterySagPercent ?? 0.08;
		const circumferenceM = config.wheel * INCH_TO_METERS * Math.PI;
		const kv = (claim * KV_HEADROOM * 1000) / (60 * circumferenceM * config.v * (1 - sag));
		return { kv: Math.round(kv), powerLimited: true };
	}
	let lo = 5;
	let hi = KV_SEARCH_MAX;
	for (let i = 0; i < 40; i++) {
		const mid = (lo + hi) / 2;
		if (speedAt(mid) < claim) lo = mid;
		else hi = mid;
	}
	return { kv: Math.round(hi * 10) / 10, powerLimited: false };
}

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

	const kvFits = [];
	const powerLimited = [];
	for (const [key, config] of Object.entries(presets)) {
		const topSpeed = presetMetadata[key]?.manufacturer?.topSpeed;
		if (!topSpeed || config.speedCap !== undefined) continue;
		const { kv, powerLimited: limited } = fitMotorKv(config, topSpeed, calculatePerformance);
		// Later steps (style calibration) see the fitted KV.
		config.motorKv = kv;
		kvFits.push({ key, kv });
		if (limited)
			powerLimited.push(
				`${key}: claim ${topSpeed} km/h, power reaches ${calculatePerformance(config, 'spec').speed.toFixed(0)}`
			);
	}

	const rows = [];
	const flagged = [];
	const clamped = [];
	for (const [key, config] of Object.entries(presets)) {
		const claim = presetMetadata[key]?.manufacturer?.range;
		if (!claim) continue;
		const testedRange = presetMetadata[key]?.tested?.range;
		// Range is inversely proportional to style, so one evaluation rescales it.
		const raw = testedRange
			? (config.style * calculatePerformance(config, 'spec').totalRange) / testedRange
			: calibrateStyle(config, claim);
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
		rows.push({
			key,
			old: config.style,
			style,
			claim: testedRange ? `t${testedRange}` : claim,
			before,
			after,
			flagged: reasons.length > 0,
		});
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
	console.log(`\n${powerLimited.length} presets can't reach their claimed top speed with the listed power:`);
	for (const p of powerLimited) console.log(`  ${p}`);
	console.log(`\n${clamped.length} presets clamped to the physics floor (claim not physically achievable):`);
	for (const c of clamped) console.log(`  ${c}`);
	console.log(`\n${rows.length} presets, ${flagged.length} flagged for review (not written):`);
	for (const f of flagged) console.log(`  ${f.key}: ${f.reasons.join('; ')}`);

	if (WRITE) {
		let source = readFileSync(PRESETS_FILE, 'utf8');
		for (const { key, kv } of kvFits) source = setConfigField(source, key, 'motorKv', kv);
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
		console.log(
			`\nWrote ${kvFits.length} motor KV and ${written} style values to ${PRESETS_FILE} (flagged presets left unchanged).`
		);
	}
} finally {
	await server.close();
}
