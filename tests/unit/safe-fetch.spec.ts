import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { lookup as dnsLookup } from 'node:dns';
import { isBlockedAddress } from '$lib/server/net/ip-blocklist';
import { assertFetchableUrl, createSafeFetch, safeFetch, SafeFetchError } from '$lib/server/net/safe-fetch';

describe('isBlockedAddress', () => {
	it.each([
		'0.0.0.0',
		'10.1.2.3',
		'100.64.0.1',
		'127.0.0.1',
		'169.254.169.254',
		'172.16.0.1',
		'172.31.255.255',
		'192.168.1.1',
		'198.18.0.1',
		'224.0.0.1',
		'255.255.255.255',
		'::',
		'::1',
		'::127.0.0.1', // IPv4-compatible
		'::ffff:127.0.0.1', // IPv4-mapped
		'::ffff:7f00:1', // IPv4-mapped, hex form
		'::ffff:10.0.0.1',
		'64:ff9b::7f00:1', // NAT64
		'2002:7f00:1::', // 6to4 of 127.0.0.1
		'2001:0:4136:e378::1', // Teredo
		'fd00::1',
		'fe80::1',
		'fec0::1',
		'ff02::1',
		'[::1]',
	])('blocks %s', (address) => {
		expect(isBlockedAddress(address)).toBe(true);
	});

	it.each(['8.8.8.8', '1.1.1.1', '93.184.216.34', '172.32.0.1', '2606:4700:4700::1111', '::ffff:8.8.8.8'])(
		'allows public address %s',
		(address) => {
			expect(isBlockedAddress(address)).toBe(false);
		}
	);

	it('treats non-IP input as blocked', () => {
		expect(isBlockedAddress('example.com')).toBe(true);
		expect(isBlockedAddress('')).toBe(true);
	});
});

describe('assertFetchableUrl', () => {
	it.each([
		['http://0x7f.1/', 'shorthand hex IPv4'],
		['http://2130706433/', 'decimal IPv4'],
		['http://127.1/', 'short-form IPv4'],
		['http://017700000001/', 'octal IPv4'],
		['http://[::ffff:127.0.0.1]/', 'IPv4-mapped IPv6'],
		['http://169.254.169.254/latest/meta-data/', 'metadata endpoint'],
		['ftp://example.com/', 'non-HTTP protocol'],
		['http://user:pw@example.com/', 'credentials'],
		['http://example.com:8080/', 'non-default port'],
		['http://localhost/', 'localhost'],
		['http://foo.localhost/', '.localhost suffix'],
		['http://metadata.google.internal/', 'internal hostname'],
		['not a url', 'invalid URL'],
	])('rejects %s (%s)', (url) => {
		expect(() => assertFetchableUrl(url)).toThrow(SafeFetchError);
	});

	it('accepts public http(s) URLs on default ports', () => {
		expect(assertFetchableUrl('https://www.apolloscooters.com/products').hostname).toBe('www.apolloscooters.com');
		expect(assertFetchableUrl('http://example.com:80/x').href).toBe('http://example.com/x');
	});
});

describe('safeFetch against a local server', () => {
	let server: http.Server;
	let base: string;
	let origin: string;

	beforeAll(async () => {
		server = http.createServer((req, res) => {
			switch (req.url) {
				case '/page':
					res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
					res.end('<html>ok</html>');
					break;
				case '/redirect-relative':
					res.writeHead(302, { location: '/page' });
					res.end();
					break;
				case '/redirect-metadata':
					res.writeHead(302, { location: 'http://169.254.169.254/latest/meta-data/' });
					res.end();
					break;
				case '/loop':
					res.writeHead(302, { location: '/loop' });
					res.end();
					break;
				case '/big':
					// No Content-Length: chunked, so the cap must be enforced while streaming.
					res.writeHead(200, { 'content-type': 'text/html' });
					res.write('x'.repeat(4096));
					res.end('x'.repeat(4096));
					break;
				case '/binary':
					res.writeHead(200, { 'content-type': 'application/octet-stream' });
					res.end('bin');
					break;
				default:
					res.writeHead(404, { 'content-type': 'text/html' });
					res.end('nope');
			}
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		const { port } = server.address() as AddressInfo;
		origin = `http://127.0.0.1:${port}`;
		base = `http://shop.test:${port}`;
	});

	afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

	// Resolve the fake hostname shop.test to the local server.
	const fakeLookup = ((_host: string, _opts: unknown, cb: (...args: unknown[]) => void) =>
		cb(null, [{ address: '127.0.0.1', family: 4 }])) as unknown as typeof dnsLookup;

	it('refuses a hostname that resolves to a private address', async () => {
		const fetcher = createSafeFetch({ allowAnyPort: true, lookup: fakeLookup });
		await expect(fetcher(`${base}/page`)).rejects.toThrow(/resolves to a private\/internal address/);
	});

	it('refuses an IP-literal private host before connecting', async () => {
		await expect(safeFetch(`${origin}/page`)).rejects.toThrow(SafeFetchError);
	});

	describe('with loopback allowed (simulating a public host)', () => {
		const allowLoopback = (a: string) => isBlockedAddress(a) && !a.startsWith('127.');
		const fetcher = createSafeFetch({ allowAnyPort: true, lookup: fakeLookup, isBlocked: allowLoopback });

		it('fetches an HTML page', async () => {
			const res = await fetcher(`${base}/page`);
			expect(res).toMatchObject({ ok: true, status: 200, body: '<html>ok</html>' });
		});

		it('follows a same-host redirect and reports the final URL', async () => {
			const res = await fetcher(`${base}/redirect-relative`);
			expect(res.ok).toBe(true);
			expect(res.finalUrl).toBe(`${base}/page`);
		});

		it('re-validates redirect targets', async () => {
			await expect(fetcher(`${base}/redirect-metadata`)).rejects.toThrow(/private\/internal IP/);
		});

		it('stops after maxRedirects', async () => {
			await expect(fetcher(`${base}/loop`, { maxRedirects: 3 })).rejects.toThrow(/Too many redirects/);
		});

		it('enforces the byte cap while streaming', async () => {
			await expect(fetcher(`${base}/big`, { maxBytes: 1000 })).rejects.toThrow(/exceeds limit/);
			const res = await fetcher(`${base}/big`, { maxBytes: 10_000 });
			expect(res.body.length).toBe(8192);
		});

		it('rejects unexpected content types', async () => {
			await expect(fetcher(`${base}/binary`)).rejects.toThrow(/Unexpected content-type/);
		});

		it('returns ok=false for HTTP errors', async () => {
			const res = await fetcher(`${base}/missing`);
			expect(res).toMatchObject({ ok: false, status: 404, body: '' });
		});
	});
});
