import type { TerrainModePreset } from '$lib/types';

export const terrainModePresets: Record<string, TerrainModePreset> = {
	urban: {
		id: 'urban',
		name: 'Urban',
		description: 'City streets with frequent stops and gentle inclines',
		icon: 'terrain-urban',
		slope: 2,
	},
	suburban: {
		id: 'suburban',
		name: 'Suburban',
		description: 'Mixed roads with moderate hills and flowing traffic',
		icon: 'terrain-suburban',
		slope: 4,
	},
	highway: {
		id: 'highway',
		name: 'Highway',
		description: 'Fast roads with minimal elevation change',
		icon: 'terrain-highway',
		slope: 1,
	},
	hilly: {
		id: 'hilly',
		name: 'Hilly',
		description: 'Significant climbs and descents throughout the ride',
		icon: 'terrain-hilly',
		slope: 8,
	},
};

export const terrainModeIds: string[] = ['urban', 'suburban', 'highway', 'hilly'];
