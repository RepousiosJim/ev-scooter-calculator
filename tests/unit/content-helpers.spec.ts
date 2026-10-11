import { describe, it, expect } from 'vitest';
import { serializeJsonLd } from '$lib/utils/json-ld';
import { getManufacturer, getManufacturerInitials, getManufacturerLogo } from '$lib/utils/manufacturer-logos';
import { collections, getCollection, buildCollectionEntries } from '$lib/data/collections';
import { CONTENT_YEAR } from '$lib/data/presets';

describe('serializeJsonLd', () => {
	it('escapes < so a value cannot close the script element', () => {
		const out = serializeJsonLd({ name: 'Evil</script><script>alert(1)</script>' });
		expect(out).not.toContain('</script>');
		expect(out).not.toContain('<');
		// Still valid JSON that round-trips to the original value.
		expect(JSON.parse(out)).toEqual({ name: 'Evil</script><script>alert(1)</script>' });
	});
});

describe('manufacturer helpers', () => {
	it('takes the brand from the first word of the name', () => {
		expect(getManufacturer('Gotrax GX2')).toBe('Gotrax');
	});

	it('has no remote logos (Clearbit is retired); the UI shows initials', () => {
		expect(getManufacturerLogo('Segway')).toBeNull();
		expect(getManufacturerInitials('Segway')).toBe('SE');
		expect(getManufacturerInitials('Pure Electric')).toBe('PE');
	});
});

describe('collections', () => {
	it('every collection builds a non-empty, correctly sized ranked list', () => {
		for (const collection of collections) {
			const entries = buildCollectionEntries(collection);
			expect(entries.length, collection.slug).toBeGreaterThan(0);
			expect(entries.length, collection.slug).toBeLessThanOrEqual(collection.limit);
			for (const e of entries) {
				expect(Number.isFinite(e.range) && e.range > 0, e.key).toBe(true);
				expect(Number.isFinite(e.score), e.key).toBe(true);
			}
		}
	});

	it('titles use the catalog year rather than a hard-coded one', () => {
		for (const c of collections.filter((c) => /\b20\d\d\b/.test(c.title))) {
			expect(c.title, c.slug).toContain(String(CONTENT_YEAR));
		}
	});

	it('looks collections up by slug', () => {
		const first = collections[0];
		expect(getCollection(first.slug)).toBe(first);
		expect(getCollection('no-such-collection')).toBeUndefined();
	});
});
