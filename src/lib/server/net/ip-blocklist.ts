import { BlockList, isIP } from 'node:net';

/**
 * Addresses a server-side fetch must never reach: private, loopback, link-local,
 * shared, multicast, documentation and other special-purpose ranges (IANA IPv4/IPv6
 * Special-Purpose Address Registries), plus IPv6 ranges that embed an IPv4 address
 * (6to4, Teredo, NAT64, IPv4-compatible) and could smuggle a private IPv4 target.
 *
 * Node's BlockList matches IPv4 rules against IPv4-mapped IPv6 addresses
 * (::ffff:127.0.0.1), so no separate ::ffff:0:0/96 rule is needed — and one must
 * NOT be added: it would match every IPv4 address.
 */
const blockList = new BlockList();

const IPV4_RANGES: [string, number][] = [
	['0.0.0.0', 8], // "this" network
	['10.0.0.0', 8], // private
	['100.64.0.0', 10], // shared address space (CGNAT)
	['127.0.0.0', 8], // loopback
	['169.254.0.0', 16], // link-local / cloud metadata
	['172.16.0.0', 12], // private
	['192.0.0.0', 24], // IETF protocol assignments
	['192.0.2.0', 24], // documentation
	['192.88.99.0', 24], // 6to4 relay anycast
	['192.168.0.0', 16], // private
	['198.18.0.0', 15], // benchmarking
	['198.51.100.0', 24], // documentation
	['203.0.113.0', 24], // documentation
	['224.0.0.0', 4], // multicast
	['240.0.0.0', 4], // reserved + broadcast
];

const IPV6_RANGES: [string, number][] = [
	['::', 96], // unspecified, loopback and IPv4-compatible (::a.b.c.d)
	['64:ff9b::', 96], // NAT64
	['64:ff9b:1::', 48], // local-use NAT64
	['100::', 64], // discard-only
	['2001::', 23], // IETF protocol assignments (incl. Teredo 2001::/32)
	['2001:db8::', 32], // documentation
	['2002::', 16], // 6to4
	['fc00::', 7], // unique local
	['fe80::', 10], // link-local
	['fec0::', 10], // site-local (deprecated)
	['ff00::', 8], // multicast
];

for (const [net, prefix] of IPV4_RANGES) blockList.addSubnet(net, prefix, 'ipv4');
for (const [net, prefix] of IPV6_RANGES) blockList.addSubnet(net, prefix, 'ipv6');

/** True if `address` (an IP literal) is in a blocked range. Non-IP input is treated as blocked. */
export function isBlockedAddress(address: string): boolean {
	const bare = address.replace(/^\[|\]$/g, '');
	const family = isIP(bare);
	if (family === 4) return blockList.check(bare, 'ipv4');
	if (family === 6) return blockList.check(bare, 'ipv6');
	return true;
}
