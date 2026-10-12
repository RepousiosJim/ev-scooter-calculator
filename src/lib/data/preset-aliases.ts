/**
 * Preset keys that were removed from the catalog because they duplicated another
 * entry or were filed under the wrong model name, mapped to the key that replaced
 * them. Old /scooter, /compare and ?preset= links keep working through these.
 * Keys removed because the model doesn't exist are not listed: they 404.
 */
export const presetAliases: Readonly<Record<string, string>> = {
	// Duplicates of another entry
	compact: 'dualtron_compact',
	levy_electric_plus: 'levy_plus',
	m365_pro_2: 'xiaomi_pro_2',
	segway_ninebot_max_g2: 'segway_max_g2',
	falcon_urban_commuting_electric_scooter: 'varla_falcon',
	teverun_fighter_supreme_7260r_v5_electric_scooter: 'teverun_fighter_supreme',
	inmotion_rs_midnight: 'inmotion_rs',
	niu_kqi_sport: 'niu_kqi3_sport_electric_scooter_17_4mph',
	fluidfreeride_mantis_lite: 'kaabo_mantis_lite',
	fluid_free_mosquito_pro: 'fluid_mosquito',
	vsett_10_plus_72v: 'vsett_11_super_72v',
	vsett_10_single_motor_electric_scooter: 'vsett_10_plus',
	// Filed under the wrong model name
	apollo_city_5: 'apollo_city_2_0',
	vsett_8_plus_apex: 'vsett_8_plus',
	mantis_2025_fluid_edition: 'kaabo_mantis_v2_fluid_edition',
	gt4_2400w_dual_motor_off_road_electric_scooter: 'isinwheel_gt4_dual',
	s_nova_pro_commuting_electric_scooter: 'isinwheel_s_nova_pro',
	s_nova_commuting_electric_scooter: 'isinwheel_s_nova',
	segway_ninebot_f3_plus: 'segway_ninebot_f3',
	emove_touring_xl: 'emove_touring',
	emove_cruiser_max: 'emove_cruiser_v2',
	punk_rider: 'punk_rider_pro',
	// Discovery-pipeline key for the original seated RoadRunner Pro
	emove_roadrunner_pro_v1_seated: 'emove_roadrunner_pro',
};

/**
 * Preset keys removed because the model doesn't exist (catalog audit, Oct 2026).
 * Their pages 404; admin data stored under them is deleted by the catalog sync.
 */
export const removedPresetKeys: readonly string[] = [
	'vsett_7_plus',
	'turboant_thunder_t1',
	'niu_rqi_c',
	'inokim_mini_5',
	'pure_electric_s1_pro',
	'hiboy_ve2_pro',
	'evercross_a6',
	'spin_s100',
	'yume_d5',
	'yume_y11',
	'yume_m11',
	'joyor_a5s',
	'pure_electric_advance_rider',
];

/** The current key for a preset key, following a rename or merge if there was one. */
export function resolvePresetKey(key: string): string {
	return Object.hasOwn(presetAliases, key) ? presetAliases[key] : key;
}

/**
 * The canonical path for a /scooter/<key> or /compare/<a>-vs-<b> URL that uses a
 * retired key, or null when the path needs no redirect.
 */
export function canonicalPresetPath(pathname: string): string | null {
	const scooter = /^\/scooter\/([^/]+)\/?$/.exec(pathname);
	if (scooter) {
		const key = scooter[1];
		const resolved = resolvePresetKey(key);
		return resolved === key ? null : `/scooter/${resolved}`;
	}

	const compare = /^\/compare\/([^/]+)\/?$/.exec(pathname);
	if (compare) {
		const parts = compare[1].split('-vs-');
		if (parts.length !== 2) return null;
		const [a, b] = parts.map((p) => p.replace(/-/g, '_'));
		const [ra, rb] = [resolvePresetKey(a), resolvePresetKey(b)];
		if ((ra === a && rb === b) || ra === rb) return null;
		const [x, y] = [ra, rb].sort();
		return `/compare/${x.replace(/_/g, '-')}-vs-${y.replace(/_/g, '-')}`;
	}

	return null;
}
