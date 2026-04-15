/**
 * Normalizes electric scooter model names for deduplication and key generation.
 *
 * Handles marketing fluff removal, manufacturer prefix stripping,
 * equivalence checks via Jaccard bigram similarity, and clean key generation
 * suitable for preset identifiers.
 */

/** Marketing suffixes to strip (matched case-insensitively, longest first) */
const MARKETING_SUFFIXES = [
	'built for daily commutes',
	'for kids and adults',
	'foldable handlebar',
	'2026 upgraded',
	'2025 upgraded',
	'upgraded version',
	'electric scooter',
	'kick scooter',
	'single motor',
	'eco friendly',
	'eco-friendly',
	'all terrain',
	'all-terrain',
	'new release',
	'new arrival',
	'long range',
	'dual motor',
	'big wheel',
	'big-wheel',
	'for adults',
	'off road',
	'off-road',
	'high end',
	'high-end',
	'e-scooter',
	'commuting',
	'foldable',
	'powerful',
	'escooter',
	'premium',
	'urban',
	'smart',
];

/** Known manufacturer identifiers used for prefix stripping */
const KNOWN_MANUFACTURERS = [
	'isinwheel',
	'nanrobot',
	'urbanglide',
	'turboant',
	'evercross',
	'dualtron',
	'inmotion',
	'speedway',
	'mercane',
	'teverun',
	'inokim',
	'segway',
	'xiaomi',
	'mukuta',
	'apollo',
	'gotrax',
	'hover',
	'hiboy',
	'navee',
	'vsett',
	'kaabo',
	'emove',
	'fluid',
	'varla',
	'joyor',
	'weped',
	'blade',
	'hooga',
	'razor',
	'yadea',
	'levy',
	'nami',
	'pure',
	'zero',
	'niu',
	'sxt',
];

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Computes Jaccard similarity on character bigrams.
 * Returns a value between 0 (no overlap) and 1 (identical bigram sets).
 */
function computeSimilarity(a: string, b: string): number {
	const bigramsA = new Set<string>();
	const bigramsB = new Set<string>();
	for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.slice(i, i + 2));
	for (let i = 0; i < b.length - 1; i++) bigramsB.add(b.slice(i, i + 2));

	let intersection = 0;
	for (const bg of bigramsA) if (bigramsB.has(bg)) intersection++;

	const union = bigramsA.size + bigramsB.size - intersection;
	return union === 0 ? 0 : intersection / union;
}

/**
 * Strips all known marketing suffixes from a lowercased string.
 * Runs in a loop so stacked suffixes are removed (e.g. "foldable electric scooter").
 */
function stripSuffixes(text: string): string {
	let prev = '';
	while (prev !== text) {
		prev = text;
		for (const suffix of MARKETING_SUFFIXES) {
			if (text.endsWith(suffix)) {
				text = text.slice(0, -suffix.length).trimEnd();
			}
		}
	}
	return text;
}

// ---------------------------------------------------------------------------
// Memoization caches
// ---------------------------------------------------------------------------

const normalizeCache = new Map<string, string>();
const extractCache = new Map<string, string>();
const CACHE_MAX = 1000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Strips marketing text and normalizes whitespace/punctuation in a model name.
 *
 * @example
 * normalizeModelName('Hiboy S2 Pro Electric Scooter for Adults')
 * // → 'hiboy s2 pro'
 */
function normalizeModelName(name: string): string {
	const cached = normalizeCache.get(name);
	if (cached !== undefined) return cached;

	let n = name.toLowerCase().trim();

	// Normalize symbols
	n = n.replace(/\+/g, ' plus').replace(/&/g, ' and');

	// Collapse whitespace
	n = n.replace(/\s+/g, ' ').trim();

	// Strip marketing suffixes (iterative to catch stacked ones)
	n = stripSuffixes(n);

	// Final cleanup
	const result = n.replace(/\s+/g, ' ').trim();

	if (normalizeCache.size >= CACHE_MAX) normalizeCache.clear();
	normalizeCache.set(name, result);
	return result;
}

/**
 * Extracts just the core model identifier, stripping manufacturer prefixes
 * and marketing text. Returns a lowercased, underscore-separated token.
 *
 * @param name           Raw product / model name
 * @param manufacturerId Optional manufacturer slug to strip from the front
 *
 * @example
 * extractCoreModel('isinwheel GT2 Electric Scooter', 'isinwheel')
 * // → 'gt2'
 */
export function extractCoreModel(name: string, manufacturerId?: string): string {
	const cacheKey = `${name}|${manufacturerId ?? ''}`;
	const cached = extractCache.get(cacheKey);
	if (cached !== undefined) return cached;

	let core = normalizeModelName(name);

	// Strip explicit manufacturer prefix first
	if (manufacturerId) {
		const mfr = manufacturerId.toLowerCase();
		if (core.startsWith(mfr)) {
			core = core.slice(mfr.length).trimStart();
		}
	}

	// Strip any known manufacturer prefix
	for (const mfr of KNOWN_MANUFACTURERS) {
		if (core.startsWith(mfr + ' ') || core === mfr) {
			core = core.slice(mfr.length).trimStart();
			break; // only strip one
		}
	}

	// Convert to underscore-separated identifier
	const result = core
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.replace(/_{2,}/g, '_');

	if (extractCache.size >= CACHE_MAX) extractCache.clear();
	extractCache.set(cacheKey, result);
	return result;
}

/**
 * Determines whether two model names refer to the same scooter model.
 *
 * Checks (in order):
 * 1. Identical core model identifiers
 * 2. One core model is a substring of the other (min length 4)
 * 3. Jaccard bigram similarity > 0.8 on normalized names
 *
 * @example
 * areModelsEquivalent('Hiboy S2 Pro', 'HIBOY S2 PRO Electric Scooter')
 * // → true
 */
export function areModelsEquivalent(a: string, b: string, manufacturerA?: string, manufacturerB?: string): boolean {
	const coreA = extractCoreModel(a, manufacturerA);
	const coreB = extractCoreModel(b, manufacturerB);

	// 1. Exact match
	if (coreA === coreB) return true;

	// 2. Substring containment (min length 4 to avoid trivial matches)
	if (coreA.length >= 4 && coreB.includes(coreA)) return true;
	if (coreB.length >= 4 && coreA.includes(coreB)) return true;

	// 3. Jaccard bigram similarity on normalized (not core) names
	const normA = normalizeModelName(a);
	const normB = normalizeModelName(b);
	return computeSimilarity(normA, normB) > 0.8;
}
