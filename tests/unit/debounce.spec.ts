import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from '$lib/utils/debounce';

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('debounce', () => {
	it('does not execute the function immediately', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 200);

		debounced();
		expect(fn).not.toHaveBeenCalled();
	});

	it('executes the function after the specified wait time', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 200);

		debounced();
		vi.advanceTimersByTime(200);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('does not execute before the wait time has elapsed', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 200);

		debounced();
		vi.advanceTimersByTime(199);
		expect(fn).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('cancels previous timer when called multiple times in rapid succession', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 200);

		debounced();
		vi.advanceTimersByTime(100);
		debounced();
		vi.advanceTimersByTime(100);
		debounced();
		vi.advanceTimersByTime(100);

		// Total time elapsed: 300ms, but last call was 100ms ago — not fired yet
		expect(fn).not.toHaveBeenCalled();
	});

	it('executes only once after multiple rapid calls once timer expires', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 200);

		debounced();
		debounced();
		debounced();
		debounced();
		debounced();

		vi.advanceTimersByTime(200);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('passes the latest arguments to the function', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 200);

		debounced('first');
		debounced('second');
		debounced('third');

		vi.advanceTimersByTime(200);
		expect(fn).toHaveBeenCalledWith('third');
	});

	it('passes multiple arguments correctly', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced(1, 2, 3);
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledWith(1, 2, 3);
	});

	it('can be called again after previous debounce period expired', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced('call-1');
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(1);

		debounced('call-2');
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(2);
		expect(fn).toHaveBeenLastCalledWith('call-2');
	});

	it('does not call function if timer is reset before expiry each time', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 500);

		// Simulate typing: call every 100ms for 2 seconds
		for (let i = 0; i < 20; i++) {
			debounced(i);
			vi.advanceTimersByTime(100);
		}
		// Still within debounce window after last call
		expect(fn).not.toHaveBeenCalled();

		// Now let the final timer expire
		vi.advanceTimersByTime(500);
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(19);
	});

	it('works with zero wait time', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 0);

		debounced();
		expect(fn).not.toHaveBeenCalled();
		vi.advanceTimersByTime(0);
		expect(fn).toHaveBeenCalledTimes(1);
	});
});
