/**
 * Unit tests for src/lib/utils/units.ts
 *
 * uiState is mocked so we can flip the unit system without a real Svelte store.
 * vi.mock factory is hoisted by vitest, so we use vi.hoisted() to create the
 * shared mock state object before the factory runs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted runs before vi.mock factories, making the object available inside them
const mockUiState = vi.hoisted(() => ({ unitSystem: 'metric' as 'metric' | 'imperial' }));

vi.mock('$lib/stores/ui.svelte', () => ({
	uiState: mockUiState,
}));

import {
	isImperial,
	distanceVal,
	speedVal,
	weightVal,
	tempVal,
	tempToMetric,
	weightToMetric,
	distanceUnit,
	speedUnit,
	weightUnit,
	tempUnit,
	costDistanceLabel,
	costPer100Val,
} from '$lib/utils/units';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setMetric() {
	mockUiState.unitSystem = 'metric';
}

function setImperial() {
	mockUiState.unitSystem = 'imperial';
}

beforeEach(() => setMetric());

// ---------------------------------------------------------------------------
// isImperial
// ---------------------------------------------------------------------------

describe('isImperial', () => {
	it('returns false in metric mode', () => {
		setMetric();
		expect(isImperial()).toBe(false);
	});

	it('returns true in imperial mode', () => {
		setImperial();
		expect(isImperial()).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// distanceVal
// ---------------------------------------------------------------------------

describe('distanceVal', () => {
	it('returns km unchanged in metric', () => {
		expect(distanceVal(100)).toBe(100);
	});

	it('converts km to miles in imperial', () => {
		setImperial();
		expect(distanceVal(100)).toBeCloseTo(62.1371, 2);
	});

	it('returns 0 for 0 input in metric', () => {
		expect(distanceVal(0)).toBe(0);
	});

	it('returns 0 for 0 input in imperial', () => {
		setImperial();
		expect(distanceVal(0)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// speedVal
// ---------------------------------------------------------------------------

describe('speedVal', () => {
	it('returns km/h unchanged in metric', () => {
		expect(speedVal(50)).toBe(50);
	});

	it('converts km/h to mph in imperial', () => {
		setImperial();
		expect(speedVal(50)).toBeCloseTo(31.0686, 2);
	});
});

// ---------------------------------------------------------------------------
// weightVal
// ---------------------------------------------------------------------------

describe('weightVal', () => {
	it('returns kg unchanged in metric', () => {
		expect(weightVal(80)).toBe(80);
	});

	it('converts kg to lbs in imperial', () => {
		setImperial();
		expect(weightVal(80)).toBeCloseTo(176.37, 1);
	});
});

// ---------------------------------------------------------------------------
// tempVal
// ---------------------------------------------------------------------------

describe('tempVal', () => {
	it('returns °C unchanged in metric', () => {
		expect(tempVal(25)).toBe(25);
	});

	it('converts 25 °C to 77 °F in imperial', () => {
		setImperial();
		expect(tempVal(25)).toBe(77);
	});

	it('converts 0 °C to 32 °F in imperial', () => {
		setImperial();
		expect(tempVal(0)).toBe(32);
	});

	it('converts -40 °C to -40 °F in imperial', () => {
		setImperial();
		expect(tempVal(-40)).toBe(-40);
	});
});

// ---------------------------------------------------------------------------
// tempToMetric
// ---------------------------------------------------------------------------

describe('tempToMetric', () => {
	it('returns value unchanged in metric', () => {
		expect(tempToMetric(25)).toBe(25);
	});

	it('converts 77 °F back to 25 °C in imperial', () => {
		setImperial();
		expect(tempToMetric(77)).toBeCloseTo(25, 5);
	});

	it('converts 32 °F back to 0 °C in imperial', () => {
		setImperial();
		expect(tempToMetric(32)).toBeCloseTo(0, 5);
	});

	it('round-trips: tempToMetric(tempVal(x)) === x', () => {
		setImperial();
		expect(tempToMetric(tempVal(37))).toBeCloseTo(37, 5);
	});
});

// ---------------------------------------------------------------------------
// weightToMetric
// ---------------------------------------------------------------------------

describe('weightToMetric', () => {
	it('returns value unchanged in metric', () => {
		expect(weightToMetric(80)).toBe(80);
	});

	it('converts lbs back to kg in imperial', () => {
		setImperial();
		// 80 kg → 176.37 lbs → back to 80 kg
		expect(weightToMetric(weightVal(80))).toBeCloseTo(80, 4);
	});
});

// ---------------------------------------------------------------------------
// distanceUnit
// ---------------------------------------------------------------------------

describe('distanceUnit', () => {
	it('returns "km" in metric', () => {
		expect(distanceUnit()).toBe('km');
	});

	it('returns "mi" in imperial', () => {
		setImperial();
		expect(distanceUnit()).toBe('mi');
	});
});

// ---------------------------------------------------------------------------
// speedUnit
// ---------------------------------------------------------------------------

describe('speedUnit', () => {
	it('returns "km/h" in metric', () => {
		expect(speedUnit()).toBe('km/h');
	});

	it('returns "mph" in imperial', () => {
		setImperial();
		expect(speedUnit()).toBe('mph');
	});
});

// ---------------------------------------------------------------------------
// weightUnit
// ---------------------------------------------------------------------------

describe('weightUnit', () => {
	it('returns "kg" in metric', () => {
		expect(weightUnit()).toBe('kg');
	});

	it('returns "lbs" in imperial', () => {
		setImperial();
		expect(weightUnit()).toBe('lbs');
	});
});

// ---------------------------------------------------------------------------
// tempUnit
// ---------------------------------------------------------------------------

describe('tempUnit', () => {
	it('returns "°C" in metric', () => {
		expect(tempUnit()).toBe('°C');
	});

	it('returns "°F" in imperial', () => {
		setImperial();
		expect(tempUnit()).toBe('°F');
	});
});

// ---------------------------------------------------------------------------
// costDistanceLabel
// ---------------------------------------------------------------------------

describe('costDistanceLabel', () => {
	it('returns "per 100km" in metric', () => {
		expect(costDistanceLabel()).toBe('per 100km');
	});

	it('returns "per 100mi" in imperial', () => {
		setImperial();
		expect(costDistanceLabel()).toBe('per 100mi');
	});
});

// ---------------------------------------------------------------------------
// costPer100Val
// ---------------------------------------------------------------------------

describe('costPer100Val', () => {
	it('returns value unchanged in metric', () => {
		expect(costPer100Val(5)).toBe(5);
	});

	it('converts cost-per-100km to cost-per-100mi in imperial', () => {
		setImperial();
		// cost per 100mi = costPer100km / KM_TO_MILES (0.621371)
		expect(costPer100Val(5)).toBeCloseTo(5 / 0.621371, 3);
	});

	it('returns 0 for 0 input', () => {
		expect(costPer100Val(0)).toBe(0);
	});
});
