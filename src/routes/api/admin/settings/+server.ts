import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/admin-guard';
import { getSettings, updateSettings, maskSettings, type AdminSettings } from '$lib/server/verification/settings';
import { logActivity } from '$lib/server/verification/activity-log';

export const GET: RequestHandler = async ({ cookies }) => {
	await requireAdmin({ cookies });

	const settings = await getSettings();
	return json(maskSettings(settings));
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	await requireAdmin({ cookies });

	const body = await request.json();
	const {
		geminiApiKey,
		autoVerifyThreshold,
		outdatedDays,
		batchDelayMs,
		maxConcurrentScrapes,
		llmEnabled,
		geminiModel,
	} = body;

	const updates: Partial<AdminSettings> = {};
	if (geminiApiKey !== undefined && geminiApiKey !== '••••••••') updates.geminiApiKey = geminiApiKey;
	if (typeof autoVerifyThreshold === 'number') updates.autoVerifyThreshold = autoVerifyThreshold;
	if (typeof outdatedDays === 'number') updates.outdatedDays = outdatedDays;
	if (typeof batchDelayMs === 'number') updates.batchDelayMs = batchDelayMs;
	if (typeof maxConcurrentScrapes === 'number') updates.maxConcurrentScrapes = maxConcurrentScrapes;
	if (typeof llmEnabled === 'boolean') updates.llmEnabled = llmEnabled;
	if (typeof geminiModel === 'string') updates.geminiModel = geminiModel;

	const updated = await updateSettings(updates);

	const changedKeys = Object.keys(updates).filter((k) => k !== 'geminiApiKey');
	if (updates.geminiApiKey !== undefined) changedKeys.push('geminiApiKey');
	await logActivity('settings_changed', `Settings updated: ${changedKeys.join(', ')}`, { changedKeys });

	return json(maskSettings(updated));
};
