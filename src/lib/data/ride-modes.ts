import type { RideModePreset } from '$lib/types';

/**
 * Ride modes work like real scooter firmware: a speed cap and a current (power)
 * cap relative to the scooter's own full capability, plus a regen setting.
 * They do NOT change the scooter's base consumption (`style`) — lower speed and
 * power reduce consumption through the physics model instead.
 */
export const rideModePresets: Record<RideModePreset['id'], RideModePreset> = {
	eco: {
		id: 'eco',
		name: 'Eco',
		description: 'Maximum range with reduced speed and power',
		speedFactor: 0.6,
		powerLimit: 0.5,
		regen: 0.12,
	},
	normal: {
		id: 'normal',
		name: 'Normal',
		description: 'Balanced performance for everyday riding',
		speedFactor: 0.8,
		powerLimit: 0.75,
		regen: 0.08,
	},
	sport: {
		id: 'sport',
		name: 'Sport',
		description: 'Higher performance with increased acceleration',
		speedFactor: 0.95,
		powerLimit: 0.9,
		regen: 0.05,
	},
	turbo: {
		id: 'turbo',
		name: 'Turbo',
		description: 'Full speed and power (the scooter as specified)',
		speedFactor: 1,
		powerLimit: 1,
		regen: 0.03,
	},
};

export const rideModeIds: RideModePreset['id'][] = ['eco', 'normal', 'sport', 'turbo'];
