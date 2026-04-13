import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { presets, presetMetadata } from '$lib/data/presets';
import { getStore } from '$lib/server/verification/store';
import type { SpecField } from '$lib/server/verification/types';

export const load: PageServerLoad = async ({ params }) => {
	const { scooterKey } = params;
	const meta = presetMetadata[scooterKey];
	const config = presets[scooterKey];

	if (!meta || !config) {
		throw error(404, `Scooter "${scooterKey}" not found`);
	}

	const store = await getStore();
	const verification = await store.get(scooterKey);

	// Build the spec fields with current values from presets
	const specFields: {
		field: SpecField;
		label: string;
		unit: string;
		currentValue: number | undefined;
		source: string;
	}[] = [
		{
			field: 'topSpeed',
			label: 'Top Speed',
			unit: 'km/h',
			currentValue: meta.manufacturer.topSpeed,
			source: 'manufacturer',
		},
		{
			field: 'range',
			label: 'Range',
			unit: 'km',
			currentValue: meta.manufacturer.range,
			source: 'manufacturer',
		},
		{
			field: 'batteryWh',
			label: 'Battery',
			unit: 'Wh',
			currentValue: meta.manufacturer.batteryWh,
			source: 'manufacturer',
		},
		{
			field: 'price',
			label: 'Price',
			unit: 'USD',
			currentValue: meta.manufacturer.price,
			source: 'manufacturer',
		},
		{
			field: 'voltage',
			label: 'Voltage',
			unit: 'V',
			currentValue: config.v,
			source: 'config',
		},
		{
			field: 'motorWatts',
			label: 'Motor Power',
			unit: 'W',
			currentValue: config.watts * config.motors,
			source: 'config',
		},
		{
			field: 'weight',
			label: 'Scooter Weight',
			unit: 'kg',
			currentValue: config.scooterWeight,
			source: 'config',
		},
		{
			field: 'wheelSize',
			label: 'Wheel Size',
			unit: 'in',
			currentValue: config.wheel,
			source: 'config',
		},
		{
			field: 'powerToWeight',
			label: 'Power-to-Weight',
			unit: 'W/kg',
			currentValue: meta.manufacturer.powerToWeight,
			source: 'manufacturer',
		},
	];

	return {
		scooterKey,
		name: meta.name,
		year: meta.year,
		specFields,
		verification: verification || {
			scooterKey,
			fields: {},
			priceHistory: [],
			lastUpdated: null,
			overallConfidence: 0,
		},
	};
};
