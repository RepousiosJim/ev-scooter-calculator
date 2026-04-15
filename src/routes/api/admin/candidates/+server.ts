import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin, rateLimit } from '$lib/server/admin-guard';
import { logger } from '$lib/server/logger';
import {
	getCandidates,
	getCandidate,
	upsertCandidate,
	addCandidates,
	updateCandidateStatus,
	updateCandidateConfig,
	removeCandidate,
	getCandidateStats,
} from '$lib/server/verification/candidate-store';
import {
	createCandidate,
	generatePresetCode,
	generatePresetKey,
	specsToConfig,
	assessSpecsQuality,
	type PresetCandidate,
} from '$lib/server/verification/preset-generator';
import { validateConfig } from '$lib/server/verification/physics-validator';
import { logActivity } from '$lib/server/verification/activity-log';
import { addPresetToFile, removePresetFromFile, syncApprovedPresets } from '$lib/server/verification/preset-writer';
import { onCandidateApproved, onCandidateRejected } from '$lib/server/verification/pipeline-actions';
import type { DiscoveredScooter } from '$lib/server/verification/discovery';

/**
 * GET: List candidates with optional status filter.
 * Query params: ?status=pending|approved|rejected&key=specific_key
 */
export const GET: RequestHandler = async ({ url, cookies, getClientAddress }) => {
	await requireAdmin({ cookies });
	await rateLimit({ getClientAddress });

	const key = url.searchParams.get('key');
	if (key) {
		const candidate = await getCandidate(key);
		if (!candidate) throw error(404, 'Candidate not found');
		return json({
			candidate,
			code: generatePresetCode(candidate),
		});
	}

	const status = url.searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null;
	const candidates = await getCandidates(status || undefined);
	const stats = await getCandidateStats();

	return json({ candidates, stats });
};

/**
 * POST: Create candidates from discovered scooters, update status, or edit config.
 * Body: { action: 'create' | 'approve' | 'reject' | 'reset' | 'edit' | 'delete' | 'generate', ... }
 */
export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	await requireAdmin({ cookies });
	await rateLimit({ getClientAddress });

	const body = await request.json();
	const { action } = body as { action: string };

	switch (action) {
		/**
		 * Create candidates from an array of discovered scooters.
		 * Body: { action: 'create', scooters: DiscoveredScooter[] }
		 */
		case 'create': {
			const { scooters } = body as { scooters: DiscoveredScooter[] };
			if (!scooters?.length) throw error(400, 'No scooters provided');

			const candidates = scooters.map((s: DiscoveredScooter) => createCandidate(s));
			const result = await addCandidates(candidates);

			await logActivity(
				'discovery_completed',
				`Created ${result.added} preset candidates (${result.skipped} duplicates skipped)`,
				{
					added: result.added,
					skipped: result.skipped,
					keys: candidates.map((c) => c.key),
				}
			);

			return json({ success: true, ...result });
		}

		/**
		 * Approve a candidate.
		 * Body: { action: 'approve', key: string, notes?: string }
		 */
		case 'approve': {
			const { key, notes } = body as { key: string; notes?: string };
			if (!key) throw error(400, 'Key is required');

			const candidate = await updateCandidateStatus(key, 'approved', notes);
			if (!candidate) throw error(404, 'Candidate not found');

			// Auto-inject into presets.ts
			const writeResult = await addPresetToFile(candidate);

			// Pipeline: seed verification store + add dynamic sources
			try {
				await onCandidateApproved(key, candidate);
			} catch (e) {
				logger.error({ err: e, key }, 'onCandidateApproved failed');
			}

			await logActivity(
				'status_changed',
				`Approved preset candidate: ${candidate.name}${writeResult.success ? ' (auto-added to presets + verification seeded)' : ` (preset write failed: ${writeResult.error})`}`,
				{
					key,
					confidence: candidate.validation.confidence,
					presetWritten: writeResult.success,
				}
			);

			return json({
				success: true,
				candidate,
				code: generatePresetCode(candidate),
				presetWritten: writeResult.success,
				presetError: writeResult.error,
			});
		}

		/**
		 * Reject a candidate.
		 * Body: { action: 'reject', key: string, notes?: string }
		 */
		case 'reject': {
			const { key, notes } = body as { key: string; notes?: string };
			if (!key) throw error(400, 'Key is required');

			const candidate = await updateCandidateStatus(key, 'rejected', notes);
			if (!candidate) throw error(404, 'Candidate not found');

			// Remove from presets.ts if it was previously added
			const removeResult = await removePresetFromFile(key);

			// Pipeline: cleanup dynamic sources
			try {
				await onCandidateRejected(key);
			} catch (e) {
				logger.error({ err: e, key }, 'onCandidateRejected failed');
			}

			await logActivity(
				'status_changed',
				`Rejected preset candidate: ${candidate.name}${removeResult.success ? ' (removed from presets + sources cleaned)' : ''}`,
				{
					key,
					reason: notes,
				}
			);

			return json({ success: true, candidate, presetRemoved: removeResult.success });
		}

		/**
		 * Reset a candidate back to pending.
		 * Body: { action: 'reset', key: string }
		 */
		case 'reset': {
			const { key } = body as { key: string };
			if (!key) throw error(400, 'Key is required');

			const candidate = await updateCandidateStatus(key, 'pending');
			if (!candidate) throw error(404, 'Candidate not found');

			return json({ success: true, candidate });
		}

		/**
		 * Edit candidate config (admin override).
		 * Body: { action: 'edit', key: string, updates: Partial<PresetCandidate> }
		 */
		case 'edit': {
			const { key, updates } = body as { key: string; updates: Record<string, unknown> };
			if (!key) throw error(400, 'Key is required');

			// Whitelist allowed fields — prevents bypassing the status-change audit trail
			// (e.g. sending { status: 'approved' } through the edit path)
			const ALLOWED_EDIT_KEYS = ['config', 'name', 'year', 'manufacturerSpecs', 'notes'] as const;
			const safeUpdates = Object.fromEntries(
				Object.entries(updates).filter(([k]) => (ALLOWED_EDIT_KEYS as readonly string[]).includes(k))
			);

			const candidate = await updateCandidateConfig(key, safeUpdates);
			if (!candidate) throw error(404, 'Candidate not found');

			// Re-validate after edit
			const revalidation = validateConfig(candidate.config, {
				batteryWh: candidate.manufacturerSpecs.batteryWh,
			});
			candidate.validation = revalidation;
			await upsertCandidate(candidate);

			return json({
				success: true,
				candidate,
				code: generatePresetCode(candidate),
			});
		}

		/**
		 * Delete a candidate entirely.
		 * Body: { action: 'delete', key: string }
		 */
		case 'delete': {
			const { key } = body as { key: string };
			if (!key) throw error(400, 'Key is required');

			// Remove from presets.ts if it was there
			await removePresetFromFile(key);

			const removed = await removeCandidate(key);
			if (!removed) throw error(404, 'Candidate not found');

			return json({ success: true });
		}

		/**
		 * Generate code for a candidate (without changing status).
		 * Body: { action: 'generate', key: string }
		 */
		case 'generate': {
			const { key } = body as { key: string };
			if (!key) throw error(400, 'Key is required');

			const candidate = await getCandidate(key);
			if (!candidate) throw error(404, 'Candidate not found');

			return json({
				success: true,
				code: generatePresetCode(candidate),
			});
		}

		/**
		 * Manually add a candidate by entering specs directly.
		 * Body: { action: 'manual', name: string, year: number, specs: { voltage?, batteryWh?, motorWatts?, weight?, wheelSize?, topSpeed?, range?, price? } }
		 */
		case 'manual': {
			const { name, year, specs } = body as {
				name: string;
				year?: number;
				specs: Record<string, number | undefined>;
			};
			if (!name?.trim()) throw error(400, 'Scooter name is required');

			const config = specsToConfig(specs || {});
			const validation = validateConfig(config, { batteryWh: specs?.batteryWh });
			const key = generatePresetKey(name);

			const candidate: PresetCandidate = {
				key,
				name: name.trim(),
				year: year || new Date().getFullYear(),
				config,
				manufacturerSpecs: {
					topSpeed: specs?.topSpeed,
					range: specs?.range,
					batteryWh: specs?.batteryWh,
					price: specs?.price,
					motorWatts: specs?.motorWatts,
					weight: specs?.weight,
					wheelSize: specs?.wheelSize,
				},
				specsQuality: assessSpecsQuality(specs || {}),
				validation,
				sources: {
					discoveredFrom: 'Manual Entry',
					extractedAt: new Date().toISOString(),
				},
				status: 'pending',
			};

			await upsertCandidate(candidate);

			await logActivity('source_added', `Manually added preset candidate: ${name}`, {
				key,
				confidence: validation.confidence,
			});

			return json({
				success: true,
				candidate,
				code: generatePresetCode(candidate),
			});
		}

		/**
		 * Sync all approved candidates into presets.ts.
		 * Body: { action: 'sync' }
		 */
		case 'sync': {
			const syncResult = await syncApprovedPresets();

			await logActivity(
				'source_added',
				`Synced presets: ${syncResult.added.length} added, ${syncResult.removed.length} removed`,
				{
					added: syncResult.added,
					removed: syncResult.removed,
					errors: syncResult.errors,
				}
			);

			return json({
				success: true,
				...syncResult,
			});
		}

		default:
			throw error(400, `Unknown action: ${action}`);
	}
};
