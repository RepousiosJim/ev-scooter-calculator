/**
 * Serialize structured data for a `<script type="application/ld+json">` block.
 * Escapes `<` so a value containing `</script>` (e.g. a scraped product name)
 * can't close the script element and inject markup.
 */
export function serializeJsonLd(data: unknown): string {
	return JSON.stringify(data).replace(/</g, '\\u003c');
}
