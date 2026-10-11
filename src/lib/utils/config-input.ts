import { updateConfig } from '$lib/stores/calculator.svelte';
import { debounce } from '$lib/utils/debounce';
import { normalizeConfigValue, type ConfigNumericKey } from '$lib/utils/validators';

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
 * Handle number input events — clamps to the field's valid range, shows the
 * clamped value in the input, and debounces the store update.
 */
export function handleNumberInput(
	debouncedUpdate: ReturnType<typeof createDebouncedUpdate>,
	localValues: Record<string, number>,
	key: ConfigNumericKey,
	event: Event
) {
	const target = event.currentTarget as HTMLInputElement;
	const value = target.valueAsNumber;
	if (!Number.isFinite(value)) {
		// Revert an empty/invalid entry to the last valid value
		if (Number.isFinite(localValues[key])) target.valueAsNumber = localValues[key];
		return;
	}
	const normalized = normalizeConfigValue(key, value, localValues[key]) ?? value;
	localValues[key] = normalized;
	// Write back directly: if the clamped value equals the previous local value,
	// the one-way `value` binding won't re-render the input.
	if (normalized !== value) target.valueAsNumber = normalized;
	debouncedUpdate(key, normalized);
}
