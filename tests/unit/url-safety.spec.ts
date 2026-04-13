import { describe, it, expect } from 'vitest';
import { validateScrapingUrl } from '$lib/server/verification/url-safety';

describe('validateScrapingUrl', () => {
	describe('valid URLs', () => {
		it('accepts valid HTTPS URLs', () => {
			expect(validateScrapingUrl('https://example.com')).toEqual({ ok: true });
			expect(validateScrapingUrl('https://www.apolloscooters.com/products')).toEqual({ ok: true });
			expect(validateScrapingUrl('https://fluidfreeride.com/collections/electric-scooters')).toEqual({ ok: true });
		});

		it('accepts valid HTTP URLs', () => {
			expect(validateScrapingUrl('http://example.com')).toEqual({ ok: true });
			expect(validateScrapingUrl('http://somesite.org/page?q=scooter')).toEqual({ ok: true });
		});

		it('accepts URLs with ports on public hosts', () => {
			expect(validateScrapingUrl('https://example.com:8443/path')).toEqual({ ok: true });
		});
	});

	describe('invalid URL format', () => {
		it('rejects completely invalid URL strings', () => {
			const result = validateScrapingUrl('not-a-url');
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toBe('Invalid URL');
		});

		it('rejects empty string', () => {
			const result = validateScrapingUrl('');
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toBe('Invalid URL');
		});

		it('rejects just a hostname without protocol', () => {
			const result = validateScrapingUrl('example.com');
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toBe('Invalid URL');
		});
	});

	describe('blocked protocols', () => {
		it('rejects ftp:// protocol', () => {
			const result = validateScrapingUrl('ftp://example.com/file.txt');
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toContain('Blocked protocol');
		});

		it('rejects file:// protocol', () => {
			const result = validateScrapingUrl('file:///etc/passwd');
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toContain('Blocked protocol');
		});

		it('rejects javascript: protocol', () => {
			const result = validateScrapingUrl('javascript:alert(1)');
			expect(result.ok).toBe(false);
		});

		it('rejects data: protocol', () => {
			const result = validateScrapingUrl('data:text/plain,hello');
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toContain('Blocked protocol');
		});
	});

	describe('blocked hostnames', () => {
		it('blocks localhost', () => {
			const result = validateScrapingUrl('http://localhost/admin');
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toBe('Blocked hostname');
		});

		it('blocks localhost on a port', () => {
			const result = validateScrapingUrl('http://localhost:3000');
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toBe('Blocked hostname');
		});

		it('blocks metadata.google.internal', () => {
			const result = validateScrapingUrl('http://metadata.google.internal/computeMetadata/v1/');
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toBe('Blocked hostname');
		});

		it('blocks metadata.google', () => {
			const result = validateScrapingUrl('http://metadata.google/');
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toBe('Blocked hostname');
		});
	});

	describe('private IP ranges', () => {
		it('blocks 127.0.0.1 (loopback)', () => {
			const result = validateScrapingUrl('http://127.0.0.1/');
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toContain('private/internal');
		});

		it('blocks 127.x.x.x range', () => {
			const result = validateScrapingUrl('http://127.255.255.255/');
			expect(result.ok).toBe(false);
		});

		it('blocks 10.x.x.x (class A private)', () => {
			const result = validateScrapingUrl('http://10.0.0.1/');
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toContain('private/internal');
		});

		it('blocks 10.100.200.50', () => {
			const result = validateScrapingUrl('http://10.100.200.50/secret');
			expect(result.ok).toBe(false);
		});

		it('blocks 172.16.x.x (class B private, lower boundary)', () => {
			const result = validateScrapingUrl('http://172.16.0.1/');
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toContain('private/internal');
		});

		it('blocks 172.31.x.x (class B private, upper boundary)', () => {
			const result = validateScrapingUrl('http://172.31.255.255/');
			expect(result.ok).toBe(false);
		});

		it('does NOT block 172.15.x.x (outside class B range)', () => {
			const result = validateScrapingUrl('http://172.15.0.1/');
			expect(result.ok).toBe(true);
		});

		it('does NOT block 172.32.x.x (outside class B range)', () => {
			const result = validateScrapingUrl('http://172.32.0.1/');
			expect(result.ok).toBe(true);
		});

		it('blocks 192.168.x.x (class C private)', () => {
			const result = validateScrapingUrl('http://192.168.1.1/');
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toContain('private/internal');
		});

		it('blocks 169.254.169.254 (cloud metadata / link-local)', () => {
			const result = validateScrapingUrl('http://169.254.169.254/latest/meta-data/');
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toContain('private/internal');
		});

		it('blocks 0.x.x.x network', () => {
			const result = validateScrapingUrl('http://0.0.0.1/');
			expect(result.ok).toBe(false);
		});
	});

	describe('bare numeric hostnames', () => {
		it('blocks a decimal-encoded private IP (Node URL resolves to 127.0.0.1)', () => {
			// Node's URL parser resolves 2130706433 → 127.0.0.1 (loopback)
			const result = validateScrapingUrl('http://2130706433/');
			expect(result.ok).toBe(false);
			// Caught as either private/internal IP (via 127. pattern) or numeric IP
			if (!result.ok) expect(result.reason).toMatch(/private\/internal|numeric IP/);
		});

		it('blocks a decimal-encoded private IP (Node URL resolves to 192.168.x.x)', () => {
			// 3232235777 = 192.168.1.1
			const result = validateScrapingUrl('http://3232235777/path');
			expect(result.ok).toBe(false);
		});

		it('blocks a genuinely numeric-only hostname that is not a valid IP number', () => {
			// A number that does not parse as a valid IPv4 integer — Node keeps it as-is
			// 99999999999 is too large for IPv4, Node may keep hostname as-is or reject
			// Use a simple number that remains numeric after parsing
			const result = validateScrapingUrl('http://12345/');
			// Node may resolve 12345 to 0.0.48.57 or keep numeric — either way should be blocked
			expect(result.ok).toBe(false);
		});
	});
});
