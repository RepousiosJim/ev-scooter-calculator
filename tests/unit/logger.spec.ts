/**
 * Unit tests for src/lib/server/logger.ts
 *
 * Pino is mocked so no actual log output is emitted.
 * We verify that the module exports the expected shapes and
 * that createRequestLogger produces a child logger.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock pino before importing the logger module
// vi.hoisted ensures variables are available when vi.mock factory runs
// ---------------------------------------------------------------------------
const { mockChild, mockPino } = vi.hoisted(() => {
	const mockChild = vi.fn().mockReturnValue({ child: vi.fn() });
	const mockPino = vi.fn().mockReturnValue({
		level: 'info',
		child: mockChild,
	});
	return { mockChild, mockPino };
});

vi.mock('pino', () => ({ default: mockPino }));

import { logger, createRequestLogger } from '$lib/server/logger';

// ---------------------------------------------------------------------------
// logger instance
// ---------------------------------------------------------------------------

describe('logger', () => {
	it('is exported as a non-null object', () => {
		expect(logger).toBeDefined();
		expect(logger).not.toBeNull();
	});

	it('has a child method', () => {
		expect(typeof logger.child).toBe('function');
	});
});

// ---------------------------------------------------------------------------
// createRequestLogger
// ---------------------------------------------------------------------------

describe('createRequestLogger', () => {
	beforeEach(() => {
		mockChild.mockClear();
	});

	it('returns an object (child logger)', () => {
		const childLogger = createRequestLogger('req-123');
		expect(childLogger).toBeDefined();
	});

	it('calls logger.child with the requestId binding', () => {
		createRequestLogger('req-abc');
		expect(mockChild).toHaveBeenCalledWith({ requestId: 'req-abc' });
	});

	it('passes different requestIds correctly', () => {
		createRequestLogger('req-xyz');
		expect(mockChild).toHaveBeenLastCalledWith({ requestId: 'req-xyz' });
	});

	it('can be called multiple times without error', () => {
		expect(() => {
			createRequestLogger('id-1');
			createRequestLogger('id-2');
			createRequestLogger('id-3');
		}).not.toThrow();
	});
});
