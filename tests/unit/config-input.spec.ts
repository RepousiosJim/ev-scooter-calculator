/**
 * Unit tests for config-input.ts
 *
 * The module imports from:
 *   - '$lib/stores/calculator.svelte' (updateConfig)
 *   - '$lib/utils/debounce'
 *
 * We mock both so we can test the pure logic in isolation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module-level mocks (must be at top level, before any imports)
// ---------------------------------------------------------------------------

vi.mock('$lib/stores/calculator.svelte', () => ({
	updateConfig: vi.fn(),
}));

// Use the real debounce implementation — it is simple enough and gives us
// proper async/timer behaviour through vi.useFakeTimers().
// If you prefer a stub just swap the factory below.
vi.mock('$lib/utils/debounce', () => ({
	debounce: vi.fn((fn: (...args: any[]) => any, _wait: number) => {
		// Synchronous stub: call fn immediately so tests don't need timer helpers
		return (...args: any[]) => fn(...args);
	}),
}));

import { handleRangeInput, handleNumberInput, createDebouncedUpdate } from '$lib/utils/config-input';
import { updateConfig } from '$lib/stores/calculator.svelte';
import { debounce } from '$lib/utils/debounce';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInputEvent(valueAsNumber: number): Event {
	const input = {
		valueAsNumber,
		value: String(valueAsNumber),
	} as unknown as HTMLInputElement;

	return {
		currentTarget: input,
	} as unknown as Event;
}

// ---------------------------------------------------------------------------
// createDebouncedUpdate
// ---------------------------------------------------------------------------

describe('createDebouncedUpdate', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns a function', () => {
		const debounced = createDebouncedUpdate();
		expect(typeof debounced).toBe('function');
	});

	it('calls updateConfig when invoked (via synchronous debounce stub)', () => {
		const debounced = createDebouncedUpdate();
		debounced('v', 48);
		expect(updateConfig).toHaveBeenCalledWith('v', 48);
	});

	it('passes the correct key and value', () => {
		const debounced = createDebouncedUpdate();
		debounced('ah', 15.5);
		expect(updateConfig).toHaveBeenCalledWith('ah', 15.5);
	});

	it('uses default delay of 150ms (debounce is called with 150)', () => {
		vi.clearAllMocks();
		createDebouncedUpdate();
		expect(debounce).toHaveBeenCalledWith(expect.any(Function), 150);
	});

	it('accepts a custom delay', () => {
		vi.clearAllMocks();
		createDebouncedUpdate(300);
		expect(debounce).toHaveBeenCalledWith(expect.any(Function), 300);
	});
});

// ---------------------------------------------------------------------------
// handleRangeInput
// ---------------------------------------------------------------------------

describe('handleRangeInput', () => {
	let debouncedUpdate: ReturnType<typeof createDebouncedUpdate>;

	beforeEach(() => {
		vi.clearAllMocks();
		debouncedUpdate = createDebouncedUpdate();
	});

	it('calls debouncedUpdate with the correct key and value', () => {
		const event = makeInputEvent(48);
		handleRangeInput(debouncedUpdate, 'v', event);
		expect(updateConfig).toHaveBeenCalledWith('v', 48);
	});

	it('passes a decimal value correctly', () => {
		const event = makeInputEvent(15.5);
		handleRangeInput(debouncedUpdate, 'ah', event);
		expect(updateConfig).toHaveBeenCalledWith('ah', 15.5);
	});

	it('does nothing when valueAsNumber is NaN', () => {
		const event = makeInputEvent(NaN);
		handleRangeInput(debouncedUpdate, 'v', event);
		expect(updateConfig).not.toHaveBeenCalled();
	});

	it('does nothing when valueAsNumber is Infinity', () => {
		const event = makeInputEvent(Infinity);
		handleRangeInput(debouncedUpdate, 'v', event);
		expect(updateConfig).not.toHaveBeenCalled();
	});

	it('does nothing when valueAsNumber is -Infinity', () => {
		const event = makeInputEvent(-Infinity);
		handleRangeInput(debouncedUpdate, 'v', event);
		expect(updateConfig).not.toHaveBeenCalled();
	});

	it('calls debouncedUpdate with 0 (valid finite number)', () => {
		const event = makeInputEvent(0);
		handleRangeInput(debouncedUpdate, 'slope', event);
		expect(updateConfig).toHaveBeenCalledWith('slope', 0);
	});

	it('calls debouncedUpdate with negative number (valid finite)', () => {
		const event = makeInputEvent(-5);
		handleRangeInput(debouncedUpdate, 'slope', event);
		expect(updateConfig).toHaveBeenCalledWith('slope', -5);
	});
});

// ---------------------------------------------------------------------------
// handleNumberInput
// ---------------------------------------------------------------------------

describe('handleNumberInput', () => {
	let debouncedUpdate: ReturnType<typeof createDebouncedUpdate>;
	let localValues: Record<string, number>;

	beforeEach(() => {
		vi.clearAllMocks();
		debouncedUpdate = createDebouncedUpdate();
		localValues = {};
	});

	it('calls debouncedUpdate with the correct key and value', () => {
		const event = makeInputEvent(350);
		handleNumberInput(debouncedUpdate, localValues, 'watts', event);
		expect(updateConfig).toHaveBeenCalledWith('watts', 350);
	});

	it('updates localValues[key] with the new value', () => {
		const event = makeInputEvent(350);
		handleNumberInput(debouncedUpdate, localValues, 'watts', event);
		expect(localValues['watts']).toBe(350);
	});

	it('does nothing when valueAsNumber is NaN', () => {
		const event = makeInputEvent(NaN);
		handleNumberInput(debouncedUpdate, localValues, 'watts', event);
		expect(updateConfig).not.toHaveBeenCalled();
		expect(localValues['watts']).toBeUndefined();
	});

	it('does nothing when valueAsNumber is Infinity', () => {
		const event = makeInputEvent(Infinity);
		handleNumberInput(debouncedUpdate, localValues, 'watts', event);
		expect(updateConfig).not.toHaveBeenCalled();
	});

	it('updates multiple keys independently', () => {
		handleNumberInput(debouncedUpdate, localValues, 'v', makeInputEvent(48));
		handleNumberInput(debouncedUpdate, localValues, 'ah', makeInputEvent(15));
		expect(localValues['v']).toBe(48);
		expect(localValues['ah']).toBe(15);
	});

	it('overwrites existing localValues entry', () => {
		localValues['watts'] = 300;
		const event = makeInputEvent(500);
		handleNumberInput(debouncedUpdate, localValues, 'watts', event);
		expect(localValues['watts']).toBe(500);
	});

	it('handles 0 correctly', () => {
		const event = makeInputEvent(0);
		handleNumberInput(debouncedUpdate, localValues, 'regen', event);
		expect(localValues['regen']).toBe(0);
		expect(updateConfig).toHaveBeenCalledWith('regen', 0);
	});
});
