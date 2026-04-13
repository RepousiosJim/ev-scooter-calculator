/**
 * SSRF protection for server-side URL fetching.
 * Blocks requests to private networks, cloud metadata endpoints,
 * and non-HTTP(S) protocols.
 */

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal', 'metadata.google']);

const PRIVATE_IP_PATTERNS = [
	/^127\./, // loopback
	/^10\./, // class A private
	/^172\.(1[6-9]|2\d|3[01])\./, // class B private
	/^192\.168\./, // class C private
	/^169\.254\./, // link-local / cloud metadata
	/^0\./, // "this" network
	/^fc00:/i, // IPv6 unique local
	/^fe80:/i, // IPv6 link-local
	/^fe[cd]/i, // IPv6 site-local (deprecated, still block)
	/^::1$/, // IPv6 loopback (brackets stripped above)
	/^::$/, // IPv6 unspecified
	/^::ffff:/i, // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
	/^64:ff9b:/i, // IPv4/IPv6 translation
];

export function validateScrapingUrl(input: string): { ok: true } | { ok: false; reason: string } {
	let parsed: URL;
	try {
		parsed = new URL(input);
	} catch {
		return { ok: false, reason: 'Invalid URL' };
	}

	// Only allow HTTP(S)
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		return { ok: false, reason: `Blocked protocol: ${parsed.protocol}` };
	}

	// Strip IPv6 brackets so patterns match uniformly: [fc00::1] → fc00::1
	const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();

	// Block known dangerous hostnames
	if (BLOCKED_HOSTNAMES.has(hostname)) {
		return { ok: false, reason: 'Blocked hostname' };
	}

	// Block private/internal IP ranges
	for (const pattern of PRIVATE_IP_PATTERNS) {
		if (pattern.test(hostname)) {
			return { ok: false, reason: 'Blocked: private/internal IP address' };
		}
	}

	// Block numeric-only hostnames (bare IPs like 2130706433 = 127.0.0.1)
	if (/^\d+$/.test(hostname)) {
		return { ok: false, reason: 'Blocked: numeric IP address' };
	}

	return { ok: true };
}
