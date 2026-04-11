import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSession } from '$lib/server/auth';
import { getSettings, updateSettings, maskSettings } from '$lib/server/verification/settings';
import { logActivity } from '$lib/server/verification/activity-log';

export const GET: RequestHandler = async ({ cookies }) => {
	if (!validateSession(cookies.get('admin_session'))) {
		throw error(401, 'Unauthorized');
	}

	const settings = await getSettings();
	return json(maskSettings(settings));
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	if (!validateSession(cookies.get('admin_session'))) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { geminiApiKey, autoVerifyThreshold, outdatedDays, batchDelayMs, maxConcurrentScrapes, llmEnabled, geminiModel } = body;

	const updates: Record<string, unknown> = {};
	if (geminiApiKey !== undefined && geminiApiKey !== '••••••••') updates.geminiApiKey = geminiApiKey;
	if (typeof autoVerifyThreshold === 'number') updates.autoVerifyThreshold = autoVerifyThreshold;
	if (typeof outdatedDays === 'number') updates.outdatedDays = outdatedDays;
	if (typeof batchDelayMs === 'number') updates.batchDelayMs = batchDelayMs;
	if (typeof maxConcurrentScrapes === 'number') updates.maxConcurrentScrapes = maxConcurrentScrapes;
	if (typeof llmEnabled === 'boolean') updates.llmEnabled = llmEnabled;
	if (typeof geminiModel === 'string') updates.geminiModel = geminiModel;

	const updated = await updateSettings(updates as any);

	const changedKeys = Object.keys(updates).filter((k) => k !== 'geminiApiKey');
	if (updates.geminiApiKey !== undefined) changedKeys.push('geminiApiKey');
	await logActivity('settings_changed', `Settings updated: ${changedKeys.join(', ')}`, { changedKeys });

	return json(maskSettings(updated));
};
