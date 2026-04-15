// Manufacturer logo URLs - primarily from official brand sources
export const manufacturerLogos: Record<string, string> = {
	Xiaomi: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Xiaomi_logo.svg',
	Segway:
		'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Segway_Inc_logo.svg/1200px-Segway_Inc_logo.svg.png',
	Ninebot:
		'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Segway_Inc_logo.svg/1200px-Segway_Inc_logo.svg.png',
	Kaabo: 'https://www.kaabo-official.com/assets/logo.png',
	Dualtron: 'https://www.dualtron.org/assets/logo.png',
	InMotion: 'https://www.inmotionworld.com/assets/logo.png',
	Hiboy: 'https://www.hiboy.com/cdn/shop/files/hiboy_logo.svg',
	NIU: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Niu_Technologies_logo.svg/1200px-Niu_Technologies_logo.svg.png',
	Navee: 'https://www.navee.com/assets/logo.svg',
	Apollo: 'https://www.apolloscooters.co/assets/logo.png',
	NAMI: 'https://www.nami.bike/assets/logo.svg',
	EMOVE: 'https://www.voromotors.com/assets/logo.svg',
	Turboant: 'https://www.turboant.com/assets/logo.png',
	VSETT: 'https://www.vsett.com/assets/logo.svg',
	Minimotors: 'https://www.minimotors.com/assets/logo.png',
	RoadRunner: 'https://www.roadrunnersports.com/assets/logo.png',
	Inokim: 'https://www.inokim.com/assets/logo.png',
	Uscooters: 'https://www.uscooters.com/assets/logo.svg',
	Unagi: 'https://www.unagi.com/assets/logo.svg',
	Mukuta: 'https://www.mukuta.com/assets/logo.png',
	EVERCROSS: 'https://www.evercross.com/assets/logo.svg',
	YUME: 'https://yumescooter.com/assets/logo.png',
	Teverun: 'https://www.teverun.com/assets/logo.svg',
	Joyor: 'https://www.joyorscooter.com/assets/logo.png',
	Gotrax: 'https://www.gotrax.com/assets/logo.svg',
	Varla: 'https://www.varlabikes.com/assets/logo.svg',
	Mercane: 'https://www.mercane.com/assets/logo.png',
	Levy: 'https://www.levyusa.com/assets/logo.svg',
	Spin: 'https://www.spin.app/assets/logo.svg',
	Bird: 'https://www.bird.co/assets/logo.svg',
	Hover1: 'https://hover-1.com/assets/logo.png',
	'Hover-1': 'https://hover-1.com/assets/logo.png',
	Fluid: 'https://www.fluidfreeride.com/assets/logo.svg',
	FluidFreeRide: 'https://www.fluidfreeride.com/assets/logo.svg',
	Nanrobot: 'https://www.nanrobot.us/assets/logo.svg',
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
