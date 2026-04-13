/**
 * Unit tests for src/lib/physics/cache.ts (LRUCache)
 *
 * Covers: get, set (insert + update), eviction, clear, size, edge cases.
 */
import { describe, it, expect } from 'vitest';
import { LRUCache } from '$lib/physics/cache';

// ---------------------------------------------------------------------------
// Basic get / set
// ---------------------------------------------------------------------------

describe('LRUCache – basic get/set', () => {
	it('returns undefined for a key that was never set', () => {
		const cache = new LRUCache<string, number>(5);
		expect(cache.get('missing')).toBeUndefined();
	});

	it('stores and retrieves a value', () => {
		const cache = new LRUCache<string, number>(5);
		cache.set('a', 42);
		expect(cache.get('a')).toBe(42);
	});

	it('stores multiple distinct keys', () => {
		const cache = new LRUCache<string, string>(5);
		cache.set('x', 'hello');
		cache.set('y', 'world');
		expect(cache.get('x')).toBe('hello');
		expect(cache.get('y')).toBe('world');
	});

	it('overwrites an existing key with a new value', () => {
		const cache = new LRUCache<string, number>(5);
		cache.set('k', 1);
		cache.set('k', 99);
		expect(cache.get('k')).toBe(99);
	});
});

// ---------------------------------------------------------------------------
// size
// ---------------------------------------------------------------------------

describe('LRUCache – size', () => {
	it('starts at 0', () => {
		const cache = new LRUCache<string, number>(10);
		expect(cache.size).toBe(0);
	});

	it('increments after each unique insertion', () => {
		const cache = new LRUCache<string, number>(10);
		cache.set('a', 1);
		expect(cache.size).toBe(1);
		cache.set('b', 2);
		expect(cache.size).toBe(2);
	});

	it('does not increase size when overwriting an existing key', () => {
		const cache = new LRUCache<string, number>(10);
		cache.set('a', 1);
		cache.set('a', 2);
		expect(cache.size).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// LRU eviction
// ---------------------------------------------------------------------------

describe('LRUCache – LRU eviction', () => {
	it('evicts the least-recently-used entry when maxSize is reached', () => {
		const cache = new LRUCache<string, number>(3);
		cache.set('a', 1);
		cache.set('b', 2);
		cache.set('c', 3);
		// 'a' is the LRU — adding 'd' should evict it
		cache.set('d', 4);
		expect(cache.get('a')).toBeUndefined();
		expect(cache.get('d')).toBe(4);
	});

	it('accessing a key promotes it and protects it from eviction', () => {
		const cache = new LRUCache<string, number>(3);
		cache.set('a', 1);
		cache.set('b', 2);
		cache.set('c', 3);
		// Access 'a' to make it recently used
		cache.get('a');
		// Now 'b' is the LRU — adding 'd' should evict 'b'
		cache.set('d', 4);
		expect(cache.get('b')).toBeUndefined();
		expect(cache.get('a')).toBe(1);
	});

	it('does not exceed maxSize after many insertions', () => {
		const cache = new LRUCache<number, number>(5);
		for (let i = 0; i < 20; i++) {
			cache.set(i, i * 2);
		}
		expect(cache.size).toBe(5);
	});

	it('keeps the most recently set entries after evictions', () => {
		const cache = new LRUCache<number, number>(3);
		for (let i = 0; i < 10; i++) {
			cache.set(i, i);
		}
		// The last 3 inserted entries should remain
		expect(cache.get(9)).toBe(9);
		expect(cache.get(8)).toBe(8);
		expect(cache.get(7)).toBe(7);
	});

	it('evicts only one entry per insertion when at capacity', () => {
		const cache = new LRUCache<string, number>(2);
		cache.set('a', 1);
		cache.set('b', 2);
		cache.set('c', 3); // evicts 'a'
		expect(cache.size).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// clear
// ---------------------------------------------------------------------------

describe('LRUCache – clear', () => {
	it('resets size to 0', () => {
		const cache = new LRUCache<string, number>(10);
		cache.set('a', 1);
		cache.set('b', 2);
		cache.clear();
		expect(cache.size).toBe(0);
	});

	it('makes previously set keys return undefined after clear', () => {
		const cache = new LRUCache<string, number>(10);
		cache.set('a', 1);
		cache.clear();
		expect(cache.get('a')).toBeUndefined();
	});

	it('allows new insertions after clear', () => {
		const cache = new LRUCache<string, number>(3);
		cache.set('a', 1);
		cache.set('b', 2);
		cache.set('c', 3);
		cache.clear();
		cache.set('x', 99);
		expect(cache.get('x')).toBe(99);
		expect(cache.size).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('LRUCache – edge cases', () => {
	it('handles maxSize=1 (single slot)', () => {
		const cache = new LRUCache<string, number>(1);
		cache.set('a', 1);
		cache.set('b', 2); // evicts 'a'
		expect(cache.get('a')).toBeUndefined();
		expect(cache.get('b')).toBe(2);
	});

	it('stores and retrieves object values', () => {
		const cache = new LRUCache<string, { score: number }>(5);
		cache.set('cfg', { score: 88 });
		expect(cache.get('cfg')).toEqual({ score: 88 });
	});

	it('stores and retrieves number keys', () => {
		const cache = new LRUCache<number, string>(5);
		cache.set(1, 'one');
		cache.set(2, 'two');
		expect(cache.get(1)).toBe('one');
	});
});
