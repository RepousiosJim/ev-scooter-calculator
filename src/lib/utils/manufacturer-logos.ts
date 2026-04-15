// Manufacturer logo URLs.
// Wikipedia/Wikimedia: confirmed SVG sources for major brands.
// All others: Clearbit Logo API (https://logo.clearbit.com/{domain}) —
// purpose-built brand CDN, returns a clean 404 when unknown (silently handled
// by the onerror fallback in the UI). Already allowed by img-src CSP.
export const manufacturerLogos: Record<string, string> = {
	// Wikipedia/Wikimedia — confirmed working
	Xiaomi: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Xiaomi_logo.svg',
	Segway:
		'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Segway_Inc_logo.svg/1200px-Segway_Inc_logo.svg.png',
	Ninebot:
		'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Segway_Inc_logo.svg/1200px-Segway_Inc_logo.svg.png',
	NIU: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Niu_Technologies_logo.svg/1200px-Niu_Technologies_logo.svg.png',

	// Clearbit Logo API
	Apollo: 'https://logo.clearbit.com/apolloscooters.co',
	Bird: 'https://logo.clearbit.com/bird.co',
	Blade: 'https://logo.clearbit.com/bladescooters.com',
	Dualtron: 'https://logo.clearbit.com/minimotors.com',
	EMOVE: 'https://logo.clearbit.com/voromotors.com',
	EVERCROSS: 'https://logo.clearbit.com/evercross.com',
	Fluid: 'https://logo.clearbit.com/fluidfreeride.com',
	fluid: 'https://logo.clearbit.com/fluidfreeride.com',
	FluidFreeRide: 'https://logo.clearbit.com/fluidfreeride.com',
	Gotrax: 'https://logo.clearbit.com/gotrax.com',
	Hiboy: 'https://logo.clearbit.com/hiboy.com',
	'Hover-1': 'https://logo.clearbit.com/hover-1.com',
	Hover1: 'https://logo.clearbit.com/hover-1.com',
	Hooga: 'https://logo.clearbit.com/hoogascooters.com',
	InMotion: 'https://logo.clearbit.com/inmotionworld.com',
	Inokim: 'https://logo.clearbit.com/inokim.com',
	isinwheel: 'https://logo.clearbit.com/isinwheel.com',
	Joyor: 'https://logo.clearbit.com/joyorscooter.com',
	Kaabo: 'https://logo.clearbit.com/kaabo-official.com',
	Levy: 'https://logo.clearbit.com/levyelectric.com',
	Mercane: 'https://logo.clearbit.com/mercane.com',
	Minimotors: 'https://logo.clearbit.com/minimotors.com',
	Mukuta: 'https://logo.clearbit.com/mukuta.com',
	NAMI: 'https://logo.clearbit.com/nami.bike',
	NANROBOT: 'https://logo.clearbit.com/nanrobot.us',
	Nanrobot: 'https://logo.clearbit.com/nanrobot.us',
	NAVEE: 'https://logo.clearbit.com/navee.com',
	Navee: 'https://logo.clearbit.com/navee.com',
	Pure: 'https://logo.clearbit.com/pureelectric.com',
	RoadRunner: 'https://logo.clearbit.com/roadrunnerscooters.com',
	Spin: 'https://logo.clearbit.com/spin.app',
	Teverun: 'https://logo.clearbit.com/teverun.com',
	Turboant: 'https://logo.clearbit.com/turboant.com',
	Unagi: 'https://logo.clearbit.com/unagiscooter.com',
	Uscooters: 'https://logo.clearbit.com/uscooters.com',
	Varla: 'https://logo.clearbit.com/varlabikes.com',
	VSETT: 'https://logo.clearbit.com/vsett.com',
	Wolf: 'https://logo.clearbit.com/kaabo-official.com',
	YUME: 'https://logo.clearbit.com/yumescooter.com',
};

/**
 * Extract manufacturer from scooter name (first word)
 */
export function getManufacturer(name: string): string {
	return name.split(' ')[0];
}

/**
 * Get logo URL for a manufacturer
 */
export function getManufacturerLogo(manufacturerName: string): string | null {
	return manufacturerLogos[manufacturerName] || null;
}

/**
 * Get manufacturer initials as fallback
 */
export function getManufacturerInitials(manufacturerName: string): string {
	const words = manufacturerName.split(' ');
	if (words.length > 1) {
		return words
			.map((w) => w[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}
	return manufacturerName.slice(0, 2).toUpperCase();
}
