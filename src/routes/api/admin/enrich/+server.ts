import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/admin-guard';
import { getCandidates, upsertCandidate } from '$lib/server/verification/candidate-store';
import { enrichBatch, applyEnrichment } from '$lib/server/verification/spec-enrichment';
import { specsToConfig, assessSpecsQuality } from '$lib/server/verification/preset-generator';
import { validateConfig } from '$lib/server/verification/physics-validator';
import { logActivity } from '$lib/server/verification/activity-log';

/**
 * GET: Return enrichment stats for pending candidates.
 */
export const GET: RequestHandler = async ({ cookies }) => {
	await requireAdmin({ cookies });

	const pending = await getCandidates('pending');
	const stats = {
		total: pending.length,
		stubs: pending.filter((c) => c.specsQuality === 'stub').length,
		partial: pending.filter((c) => c.specsQuality === 'partial').length,
		complete: pending.filter((c) => c.specsQuality === 'complete').length,
		withUrl: pending.filter((c) => !!c.sources.discoveredFrom).length,
		withoutUrl: pending.filter((c) => !c.sources.discoveredFrom).length,
	};

	return json({
		stats,
		candidates: pending.map((c) => ({
			key: c.key,
			name: c.name,
			specsQuality: c.specsQuality,
			url: c.sources.discoveredFrom,
		})),
	});
};

/**
 * POST: Trigger enrichment for candidates.
 * Body: { action: 'enrich', keys?: string[] }
 *   - keys: specific candidate keys to enrich (defaults to all stubs)
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	await requireAdmin({ cookies });

	const body = await request.json();
	const { action, keys } = body;

	if (action !== 'enrich') {
		throw error(400, `Unknown action: ${action}`);
	}

	const allPending = await getCandidates('pending');

	let targets;
	if (keys && Array.isArray(keys) && keys.length > 0) {
		targets = allPending.filter((c) => keys.includes(c.key));
	} else {
		// Default: enrich all stubs that have a URL
		targets = allPending.filter((c) => c.specsQuality === 'stub' && c.sources.discoveredFrom);
	}

	if (targets.length === 0) {
		return json({ success: true, message: 'No candidates to enrich', enriched: 0, total: 0 });
	}

	// Limit batch size to avoid timeouts
	const maxBatch = 20;
	const batch = targets.slice(0, maxBatch);

	const batchResult = await enrichBatch(batch, { concurrency: 3, delayMs: 1200 });

	// Apply enrichment results and save
	let saved = 0;
	for (const candidate of batch) {
		const result = batchResult.results.get(candidate.key);
		if (!result || !result.success) continue;

		const updated = applyEnrichment(candidate, result);

		// Recompute config from enriched specs
		const specInput = {
			voltage:
				updated.manufacturerSpecs.batteryWh && updated.manufacturerSpecs.ampHours
					? Math.round(updated.manufacturerSpecs.batteryWh / updated.manufacturerSpecs.ampHours)
					: undefined,
			batteryWh: updated.manufacturerSpecs.batteryWh,
			motorWatts: updated.manufacturerSpecs.motorWatts,
			topSpeed: updated.manufacturerSpecs.topSpeed,
			range: updated.manufacturerSpecs.range,
			weight: updated.manufacturerSpecs.weight,
			wheelSize: updated.manufacturerSpecs.wheelSize,
			price: updated.manufacturerSpecs.price,
		};

		updated.config = specsToConfig(specInput);
		updated.specsQuality = assessSpecsQuality(specInput);
		updated.validation = validateConfig(updated.config, { batteryWh: specInput.batteryWh });

		await upsertCandidate(updated);
		saved++;
	}

	await logActivity(
		'discovery_completed',
		`Enrichment: ${batchResult.enriched} of ${batch.length} candidates enriched`,
		{
			total: batch.length,
			enriched: batchResult.enriched,
			stillStub: batchResult.stillStub,
			saved,
			errors: batchResult.errors.slice(0, 10),
			truncated: targets.length > maxBatch,
			remaining: Math.max(0, targets.length - maxBatch),
		}
	);

	return json({
		success: true,
		total: batch.length,
		enriched: batchResult.enriched,
		stillStub: batchResult.stillStub,
		saved,
		errors: batchResult.errors.slice(0, 10),
		remaining: Math.max(0, targets.length - maxBatch),
	});
};
