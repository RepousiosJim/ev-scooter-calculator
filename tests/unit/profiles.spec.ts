/**
 * Unit tests for src/lib/stores/profiles.svelte.ts.
 *
 * localStorage is replaced with a vi.stubGlobal mock so no real browser storage
 * is accessed.  The toast module is vi.mock'd to prevent side-effects and allow
 * us to assert which toasts were emitted.
 *
 * Because profilesState is a module-level $state object (Svelte 5 runes), we
 * reset it manually in beforeEach rather than re-importing the module.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock: toast module
// ---------------------------------------------------------------------------

vi.mock('$lib/stores/toast.svelte', () => ({
	showToast: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock: localStorage
// ---------------------------------------------------------------------------

const mockStorage: Record<string, string> = {};

const localStorageMock = {
	getItem: vi.fn((key: string) => mockStorage[key] ?? null),
	setItem: vi.fn((key: string, value: string) => {
		mockStorage[key] = value;
	}),
	removeItem: vi.fn((key: string) => {
		delete mockStorage[key];
	}),
	clear: vi.fn(() => {
		Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
	}),
};

vi.stubGlobal('localStorage', localStorageMock);

// ---------------------------------------------------------------------------
// Imports (after mocks are registered)
// ---------------------------------------------------------------------------

import {
	profilesState,
	loadProfiles,
	saveProfile,
	updateProfile,
	deleteProfile,
	renameProfile,
	setActiveProfile,
	getProfileCount,
} from '$lib/stores/profiles.svelte';
import { showToast } from '$lib/stores/toast.svelte';

// ---------------------------------------------------------------------------
// Shared test fixture
// ---------------------------------------------------------------------------

const testConfig = {
	v: 48,
	ah: 20,
	motors: 2,
	watts: 1000,
	style: 24,
	weight: 80,
	wheel: 10,
	charger: 3,
	regen: 0.08,
	cost: 0.2,
	slope: 0,
	ridePosition: 0.5,
	soh: 1,
	ambientTemp: 20,
};

const STORAGE_KEY = 'ev-scooter-profiles';

// ---------------------------------------------------------------------------
// beforeEach — reset mocks and shared module state
// ---------------------------------------------------------------------------

beforeEach(() => {
	// Wipe in-memory mock storage
	Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
	// Reset all mock call histories
	vi.clearAllMocks();
	// Reset the shared $state object so each test starts clean
	profilesState.profiles = [];
	profilesState.activeProfileId = null;
});

// ===========================================================================
// loadProfiles
// ===========================================================================

describe('loadProfiles', () => {
	it('does nothing when localStorage is empty', () => {
		loadProfiles();
		expect(profilesState.profiles).toHaveLength(0);
	});

	it('does nothing when the key is absent (getItem returns null)', () => {
		// Default mock returns null for unknown keys (via ?? null fallback)
		loadProfiles();
		expect(profilesState.profiles).toHaveLength(0);
	});

	it('loads a valid array of profiles from localStorage', () => {
		const stored = [
			{
				id: 'abc-123',
				name: 'My Profile',
				config: testConfig,
				presetKey: 'custom',
				createdAt: '2025-01-01T00:00:00.000Z',
				updatedAt: '2025-01-01T00:00:00.000Z',
			},
		];
		mockStorage[STORAGE_KEY] = JSON.stringify(stored);

		loadProfiles();

		expect(profilesState.profiles).toHaveLength(1);
		expect(profilesState.profiles[0].id).toBe('abc-123');
		expect(profilesState.profiles[0].name).toBe('My Profile');
	});

	it('loads multiple profiles preserving order', () => {
		const stored = [
			{ id: 'id-1', name: 'Alpha', config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
			{ id: 'id-2', name: 'Beta', config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
		];
		mockStorage[STORAGE_KEY] = JSON.stringify(stored);

		loadProfiles();

		expect(profilesState.profiles).toHaveLength(2);
		expect(profilesState.profiles[0].id).toBe('id-1');
		expect(profilesState.profiles[1].id).toBe('id-2');
	});

	it('resets profiles to [] on corrupted JSON', () => {
		profilesState.profiles = [
			{ id: 'x', name: 'existing', config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
		];
		mockStorage[STORAGE_KEY] = '{ invalid json :::';

		loadProfiles();

		expect(profilesState.profiles).toHaveLength(0);
	});

	it('ignores non-array parsed data and leaves profiles unchanged', () => {
		// JSON.parse succeeds, but the result is not an array
		mockStorage[STORAGE_KEY] = JSON.stringify({ id: 'oops', name: 'not an array' });

		loadProfiles();

		// profilesState.profiles was reset to [] in beforeEach, should stay empty
		expect(profilesState.profiles).toHaveLength(0);
	});
});

// ===========================================================================
// saveProfile
// ===========================================================================

describe('saveProfile', () => {
	it('creates a profile with the supplied name, config, and presetKey', () => {
		const result = saveProfile('Sprint Build', testConfig, 'sport');

		expect(result).not.toBeNull();
		expect(result!.name).toBe('Sprint Build');
		expect(result!.config).toEqual(testConfig);
		expect(result!.presetKey).toBe('sport');
	});

	it('assigns a non-empty string id', () => {
		const result = saveProfile('Test', testConfig, 'custom');
		expect(typeof result!.id).toBe('string');
		expect(result!.id.length).toBeGreaterThan(0);
	});

	it('sets createdAt and updatedAt to equal ISO strings', () => {
		const before = new Date().toISOString();
		const result = saveProfile('Test', testConfig, 'custom');
		const after = new Date().toISOString();

		expect(result!.createdAt >= before).toBe(true);
		expect(result!.createdAt <= after).toBe(true);
		expect(result!.createdAt).toBe(result!.updatedAt);
	});

	it('appends the new profile to profilesState.profiles', () => {
		saveProfile('First', testConfig, 'custom');
		saveProfile('Second', testConfig, 'sport');

		expect(profilesState.profiles).toHaveLength(2);
		expect(profilesState.profiles[0].name).toBe('First');
		expect(profilesState.profiles[1].name).toBe('Second');
	});

	it('persists the updated profiles array to localStorage', () => {
		saveProfile('Persisted', testConfig, 'custom');

		expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));

		const written = JSON.parse(localStorageMock.setItem.mock.calls[0][1] as string);
		expect(Array.isArray(written)).toBe(true);
		expect(written[0].name).toBe('Persisted');
	});

	it('shows a success toast with the profile name', () => {
		saveProfile('My Build', testConfig, 'custom');
		expect(showToast).toHaveBeenCalledWith('Profile "My Build" saved.', 'success');
	});

	it('returns null when the 20-profile limit is reached', () => {
		// Fill up to MAX_PROFILES (20)
		for (let i = 0; i < 20; i++) {
			profilesState.profiles = [
				...profilesState.profiles,
				{ id: `id-${i}`, name: `Profile ${i}`, config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
			];
		}

		const result = saveProfile('One Too Many', testConfig, 'custom');
		expect(result).toBeNull();
	});

	it('shows a warning toast when the limit is reached', () => {
		for (let i = 0; i < 20; i++) {
			profilesState.profiles = [
				...profilesState.profiles,
				{ id: `id-${i}`, name: `Profile ${i}`, config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
			];
		}

		saveProfile('One Too Many', testConfig, 'custom');
		expect(showToast).toHaveBeenCalledWith(expect.stringContaining('20 max'), 'warning');
	});

	it('does not modify profilesState when limit is reached', () => {
		for (let i = 0; i < 20; i++) {
			profilesState.profiles = [
				...profilesState.profiles,
				{ id: `id-${i}`, name: `Profile ${i}`, config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
			];
		}

		saveProfile('One Too Many', testConfig, 'custom');
		expect(profilesState.profiles).toHaveLength(20);
	});
});

// ===========================================================================
// updateProfile
// ===========================================================================

describe('updateProfile', () => {
	it('updates config and presetKey for the matching profile', () => {
		profilesState.profiles = [
			{
				id: 'prof-1',
				name: 'Existing',
				config: testConfig,
				presetKey: 'custom',
				createdAt: '2025-01-01T00:00:00.000Z',
				updatedAt: '2025-01-01T00:00:00.000Z',
			},
		];

		const newConfig = { ...testConfig, ah: 30 };
		updateProfile('prof-1', newConfig, 'sport');

		expect(profilesState.profiles[0].config.ah).toBe(30);
		expect(profilesState.profiles[0].presetKey).toBe('sport');
	});

	it('advances updatedAt to a new timestamp', () => {
		const oldUpdatedAt = '2025-01-01T00:00:00.000Z';
		profilesState.profiles = [
			{
				id: 'prof-1',
				name: 'Existing',
				config: testConfig,
				presetKey: 'custom',
				createdAt: oldUpdatedAt,
				updatedAt: oldUpdatedAt,
			},
		];

		const before = new Date().toISOString();
		updateProfile('prof-1', testConfig, 'custom');
		const after = new Date().toISOString();

		const { updatedAt } = profilesState.profiles[0];
		expect(updatedAt >= before).toBe(true);
		expect(updatedAt <= after).toBe(true);
		expect(updatedAt > oldUpdatedAt).toBe(true);
	});

	it('does not modify profiles whose id does not match', () => {
		profilesState.profiles = [
			{ id: 'prof-1', name: 'Alpha', config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
			{ id: 'prof-2', name: 'Beta', config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
		];

		const newConfig = { ...testConfig, v: 72 };
		updateProfile('prof-1', newConfig, 'sport');

		expect(profilesState.profiles[1].config.v).toBe(testConfig.v); // unchanged
		expect(profilesState.profiles[1].presetKey).toBe('custom'); // unchanged
	});

	it('persists to localStorage after update', () => {
		profilesState.profiles = [
			{ id: 'prof-1', name: 'Existing', config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
		];

		updateProfile('prof-1', testConfig, 'sport');

		expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
	});
});

// ===========================================================================
// deleteProfile
// ===========================================================================

describe('deleteProfile', () => {
	it('removes the target profile from state', () => {
		profilesState.profiles = [
			{ id: 'del-1', name: 'Delete Me', config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
			{ id: 'keep-2', name: 'Keep Me', config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
		];

		deleteProfile('del-1');

		expect(profilesState.profiles).toHaveLength(1);
		expect(profilesState.profiles[0].id).toBe('keep-2');
	});

	it('persists to localStorage after deletion', () => {
		profilesState.profiles = [
			{ id: 'del-1', name: 'Gone', config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
		];

		deleteProfile('del-1');

		expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
		const written = JSON.parse(localStorageMock.setItem.mock.calls[0][1] as string);
		expect(written).toHaveLength(0);
	});

	it('clears activeProfileId when the active profile is deleted', () => {
		profilesState.profiles = [
			{ id: 'active-1', name: 'Active', config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
		];
		profilesState.activeProfileId = 'active-1';

		deleteProfile('active-1');

		expect(profilesState.activeProfileId).toBeNull();
	});

	it('does not clear activeProfileId when a different profile is deleted', () => {
		profilesState.profiles = [
			{ id: 'active-1', name: 'Active', config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
			{ id: 'other-2', name: 'Other', config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
		];
		profilesState.activeProfileId = 'active-1';

		deleteProfile('other-2');

		expect(profilesState.activeProfileId).toBe('active-1');
	});

	it('shows an info toast with the deleted profile name', () => {
		profilesState.profiles = [
			{ id: 'del-1', name: 'Sprint Setup', config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
		];

		deleteProfile('del-1');

		expect(showToast).toHaveBeenCalledWith('Profile "Sprint Setup" deleted.', 'info');
	});

	it('does not show a toast when the id does not match any profile', () => {
		profilesState.profiles = [
			{ id: 'real-1', name: 'Real', config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
		];

		deleteProfile('non-existent-id');

		expect(showToast).not.toHaveBeenCalled();
	});
});

// ===========================================================================
// renameProfile
// ===========================================================================

describe('renameProfile', () => {
	it('updates the name of the matching profile', () => {
		profilesState.profiles = [
			{ id: 'ren-1', name: 'Old Name', config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
		];

		renameProfile('ren-1', 'New Name');

		expect(profilesState.profiles[0].name).toBe('New Name');
	});

	it('advances updatedAt after rename', () => {
		const oldUpdatedAt = '2025-01-01T00:00:00.000Z';
		profilesState.profiles = [
			{
				id: 'ren-1',
				name: 'Old',
				config: testConfig,
				presetKey: 'custom',
				createdAt: oldUpdatedAt,
				updatedAt: oldUpdatedAt,
			},
		];

		const before = new Date().toISOString();
		renameProfile('ren-1', 'New');
		const after = new Date().toISOString();

		const { updatedAt } = profilesState.profiles[0];
		expect(updatedAt >= before).toBe(true);
		expect(updatedAt <= after).toBe(true);
		expect(updatedAt > oldUpdatedAt).toBe(true);
	});

	it('does not rename profiles with a different id', () => {
		profilesState.profiles = [
			{ id: 'ren-1', name: 'Target', config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
			{ id: 'ren-2', name: 'Bystander', config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
		];

		renameProfile('ren-1', 'Renamed');

		expect(profilesState.profiles[1].name).toBe('Bystander');
	});

	it('shows a success toast with the new name', () => {
		profilesState.profiles = [
			{ id: 'ren-1', name: 'Old', config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
		];

		renameProfile('ren-1', 'Freshly Named');

		expect(showToast).toHaveBeenCalledWith('Profile renamed to "Freshly Named".', 'success');
	});

	it('persists to localStorage after rename', () => {
		profilesState.profiles = [
			{ id: 'ren-1', name: 'Old', config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
		];

		renameProfile('ren-1', 'New');

		expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
		const written = JSON.parse(localStorageMock.setItem.mock.calls[0][1] as string);
		expect(written[0].name).toBe('New');
	});
});

// ===========================================================================
// setActiveProfile
// ===========================================================================

describe('setActiveProfile', () => {
	it('sets activeProfileId to the supplied id', () => {
		setActiveProfile('profile-xyz');
		expect(profilesState.activeProfileId).toBe('profile-xyz');
	});

	it('clears activeProfileId when called with null', () => {
		profilesState.activeProfileId = 'profile-xyz';
		setActiveProfile(null);
		expect(profilesState.activeProfileId).toBeNull();
	});

	it('replaces an existing activeProfileId', () => {
		setActiveProfile('first');
		setActiveProfile('second');
		expect(profilesState.activeProfileId).toBe('second');
	});
});

// ===========================================================================
// getProfileCount
// ===========================================================================

describe('getProfileCount', () => {
	it('returns 0 when there are no profiles', () => {
		expect(getProfileCount()).toBe(0);
	});

	it('returns the correct count after saves', () => {
		saveProfile('A', testConfig, 'custom');
		saveProfile('B', testConfig, 'custom');
		expect(getProfileCount()).toBe(2);
	});

	it('decrements after a delete', () => {
		profilesState.profiles = [
			{ id: 'c-1', name: 'C1', config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
			{ id: 'c-2', name: 'C2', config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
		];

		deleteProfile('c-1');

		expect(getProfileCount()).toBe(1);
	});
});

// ===========================================================================
// localStorage persistence — cross-operation checks
// ===========================================================================

describe('localStorage persistence', () => {
	it('setItem is called with the correct key on saveProfile', () => {
		saveProfile('Persist Check', testConfig, 'sport');
		expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
	});

	it('setItem is called with the correct key on updateProfile', () => {
		profilesState.profiles = [
			{ id: 'u-1', name: 'U', config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
		];
		updateProfile('u-1', { ...testConfig, ah: 25 }, 'custom');
		expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
	});

	it('setItem is called with the correct key on deleteProfile', () => {
		profilesState.profiles = [
			{ id: 'd-1', name: 'D', config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
		];
		deleteProfile('d-1');
		expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
	});

	it('setItem is called with the correct key on renameProfile', () => {
		profilesState.profiles = [
			{ id: 'r-1', name: 'R', config: testConfig, presetKey: 'custom', createdAt: '', updatedAt: '' },
		];
		renameProfile('r-1', 'Renamed');
		expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
	});

	it('the JSON written to localStorage round-trips back correctly', () => {
		saveProfile('Round Trip', testConfig, 'sport');

		const raw = mockStorage[STORAGE_KEY];
		expect(raw).toBeDefined();
		const parsed = JSON.parse(raw);
		expect(Array.isArray(parsed)).toBe(true);
		expect(parsed[0].name).toBe('Round Trip');
		expect(parsed[0].config).toEqual(testConfig);
	});

	it('loadProfiles → saveProfile → loadProfiles round-trip preserves data', () => {
		// Simulate a page reload: save a profile, persist to mock storage, reset
		// in-memory state, then reload.
		saveProfile('Reload Test', testConfig, 'custom');

		// Reset in-memory state (simulating a fresh page load)
		profilesState.profiles = [];

		loadProfiles();

		expect(profilesState.profiles).toHaveLength(1);
		expect(profilesState.profiles[0].name).toBe('Reload Test');
		expect(profilesState.profiles[0].config).toEqual(testConfig);
	});
});
