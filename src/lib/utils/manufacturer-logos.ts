// Manufacturer logos.
//
// The Clearbit Logo API this used was shut down in December 2025 (requests now
// fail to connect), and the Wikimedia entries hot-linked 1200px PNGs. The UI
// falls back to an initials badge, which is what every brand shows today.
// To add a logo, self-host a small SVG in static/logos/ and map the brand to
// its path here, e.g. Segway: '/logos/segway.svg'.
export const manufacturerLogos: Record<string, string> = {};

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
