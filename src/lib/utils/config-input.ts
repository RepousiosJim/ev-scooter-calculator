import { updateConfig } from '$lib/stores/calculator.svelte';
import { debounce } from '$lib/utils/debounce';
import type { ConfigNumericKey } from '$lib/utils/validators';

/**
 * Create a debounced config updater for use in calculator input components.
 */
export function createDebouncedUpdate(delayMs = 150) {
	return debounce((key: ConfigNumericKey, value: number) => {
		updateConfig(key, value);
	}, delayMs);
}

/**
 * Handle range/slider input events — validates and debounces the update.
 */
export function handleRangeInput(
	debouncedUpdate: ReturnType<typeof createDebouncedUpdate>,
	key: ConfigNumericKey,
	event: Event
) {
	const target = event.currentTarget as HTMLInputElement;
	const value = target.valueAsNumber;
	if (!Number.isFinite(value)) return;
	debouncedUpdate(key, value);
}

/**
 * Handle number input events — updates local state and debounces the store update.
 */
export function handleNumberInput(
	debouncedUpdate: ReturnType<typeof createDebouncedUpdate>,
	localValues: Record<string, number>,
	key: ConfigNumericKey,
	event: Event
) {
	const target = event.currentTarget as HTMLInputElement;
	const value = target.valueAsNumber;
	if (!Number.isFinite(value)) return;
	localValues[key] = value;
	debouncedUpdate(key, value);
}
