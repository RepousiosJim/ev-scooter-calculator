/**
 * Unit tests for preset-writer.ts.
 *
 * fs is mocked so no actual filesystem access occurs.
 * All tests operate on fabricated string representations of presets.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock fs BEFORE importing the module under test
// ---------------------------------------------------------------------------

const { mockReadFileSync, mockWriteFileSync } = vi.hoisted(() => {
	const mockReadFileSync = vi.fn();
	const mockWriteFileSync = vi.fn();
	return { mockReadFileSync, mockWriteFileSync };
});

vi.mock('fs', () => ({
	readFileSync: mockReadFileSync,
	writeFileSync: mockWriteFileSync,
	existsSync: vi.fn(() => true),
}));

// Mock candidate-store for syncApprovedPresets
vi.mock('$lib/server/verification/candidate-store', () => ({
	getCandidates: vi.fn().mockResolvedValue([]),
}));

import {
	isPresetInFile,
	addPresetToFile,
	removePresetFromFile,
	updatePresetInFile,
} from '$lib/server/verification/preset-writer';
import type { PresetCandidate } from '$lib/server/verification/preset-generator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal but structurally valid presets.ts string */
function makePresetsFileContent(
	options: {
		includeAutoMarker?: boolean;
		keys?: string[];
	} = {}
): string {
	const { includeAutoMarker = false, keys = [] } = options;

	const existingEntries = keys
		.map(
			(k) =>
				`  ${k}: {\n    v: 48, ah: 15, watts: 500, motors: 1, wheel: 10,\n    drivetrainEfficiency: 0.9, batterySagPercent: 0.08,\n    charger: 3, regen: 0, cost: 0.12,\n    weight: 80, style: 15,\n    slope: 0, ridePosition: 0.5, soh: 1, ambientTemp: 20,\n  },`
		)
		.join('\n');

	const metaEntries = keys
		.map(
			(k) =>
				`  ${k}: {\n    name: "${k}", year: 2024,\n    manufacturer: { topSpeed: 45, range: 40, batteryWh: 720 },\n    addedDate: "2024-01-01", lastVerified: "2024-01-01",\n    source: "manual", status: "current",\n  },`
		)
		.join('\n');

	const autoSection = includeAutoMarker ? '  // --- Auto-discovered Models ---\n' : '';

	const content = `export const CATALOG_VERSION = "1.2.3";
export const CATALOG_LAST_UPDATED = "2024-01-01";

export const presets: Record<string, ScooterConfig> = {
  ninebot_max: {
    v: 36, ah: 15, watts: 350, motors: 1, wheel: 10,
    drivetrainEfficiency: 0.9, batterySagPercent: 0.08,
    charger: 2, regen: 0, cost: 0.12,
    weight: 80, style: 15,
    slope: 0, ridePosition: 0.5, soh: 1, ambientTemp: 20,
  },
${existingEntries ? existingEntries + '\n' : ''}${autoSection}};

export const defaultConfig: ScooterConfig = {
  v: 36, ah: 10, watts: 350, motors: 1, wheel: 10,
  drivetrainEfficiency: 0.9, batterySagPercent: 0.08,
  charger: 2, regen: 0, cost: 0.12,
  weight: 80, style: 15,
  slope: 0, ridePosition: 0.5, soh: 1, ambientTemp: 20,
};

export const presetMetadata: Record<string, PresetMetadata> = {
  ninebot_max: {
    name: "Ninebot Max", year: 2021,
    manufacturer: { topSpeed: 30, range: 65, batteryWh: 551 },
    addedDate: "2024-01-01", lastVerified: "2024-01-01",
    source: "manual", status: "current",
  },
${metaEntries ? metaEntries + '\n' : ''}};`;

	return content;
}

/** A minimal PresetCandidate */
function makeCandidate(key: string): PresetCandidate {
	return {
		key,
		name: key.replace(/_/g, ' '),
		year: 2024,
		config: {
			v: 52,
			ah: 20,
			watts: 1000,
			motors: 2,
			wheel: 11,
			weight: 80,
			style: 15,
			charger: 3,
			regen: 0,
			cost: 0.12,
			slope: 0,
			ridePosition: 0.5,
			dragCoefficient: 0.6,
			frontalArea: 0.5,
			rollingResistance: 0.015,
			soh: 1,
			ambientTemp: 20,
			drivetrainEfficiency: 0.9,
			batterySagPercent: 0.08,
		} as any,
		manufacturerSpecs: {
			topSpeed: 65,
			range: 50,
			batteryWh: 1040,
			price: 1500,
		},
		validation: { isValid: true, warnings: [], errors: [], confidence: 80 } as any,
		sources: { discoveredFrom: 'https://test.com', extractedAt: new Date().toISOString() },
		status: 'pending',
	};
}

// ---------------------------------------------------------------------------
// isPresetInFile
// ---------------------------------------------------------------------------

describe('isPresetInFile', () => {
	it('returns true when the key exists in the config object', () => {
		mockReadFileSync.mockReturnValue(makePresetsFileContent({ keys: ['varla_eagle'] }));
		expect(isPresetInFile('varla_eagle')).toBe(true);
	});

	it('returns false when the key does not exist', () => {
		mockReadFileSync.mockReturnValue(makePresetsFileContent({ keys: [] }));
		expect(isPresetInFile('does_not_exist')).toBe(false);
	});

	it('returns true for the ninebot_max key that is always present', () => {
		mockReadFileSync.mockReturnValue(makePresetsFileContent());
		expect(isPresetInFile('ninebot_max')).toBe(true);
	});

	it('returns false for a partial key match (e.g. ninebot vs ninebot_max)', () => {
		mockReadFileSync.mockReturnValue(makePresetsFileContent());
		// 'ninebot' alone does not match a `  ninebot: {` pattern
		expect(isPresetInFile('ninebot')).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// addPresetToFile – new key, no auto section yet
// ---------------------------------------------------------------------------

describe('addPresetToFile – fresh file (no auto section)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns success: true', () => {
		mockReadFileSync.mockReturnValue(makePresetsFileContent());
		const candidate = makeCandidate('varla_eagle_one');
		const result = addPresetToFile(candidate);
		expect(result.success).toBe(true);
	});

	it('calls writeFileSync with content that includes the new key', () => {
		mockReadFileSync.mockReturnValue(makePresetsFileContent());
		addPresetToFile(makeCandidate('varla_eagle_one'));

		const written = mockWriteFileSync.mock.calls[0][1] as string;
		expect(written).toContain('varla_eagle_one:');
	});

	it('includes the candidate name in the metadata section', () => {
		mockReadFileSync.mockReturnValue(makePresetsFileContent());
		addPresetToFile(makeCandidate('varla_eagle_one'));

		const written = mockWriteFileSync.mock.calls[0][1] as string;
		expect(written).toContain('"varla eagle one"');
	});

	it('bumps the CATALOG_VERSION patch number', () => {
		mockReadFileSync.mockReturnValue(makePresetsFileContent());
		addPresetToFile(makeCandidate('varla_eagle_one'));

		const written = mockWriteFileSync.mock.calls[0][1] as string;
		// Original was "1.2.3" → should become "1.2.4"
		expect(written).toContain('CATALOG_VERSION = "1.2.4"');
	});

	it('updates CATALOG_LAST_UPDATED to today', () => {
		mockReadFileSync.mockReturnValue(makePresetsFileContent());
		addPresetToFile(makeCandidate('varla_eagle_one'));

		const today = new Date().toISOString().slice(0, 10);
		const written = mockWriteFileSync.mock.calls[0][1] as string;
		expect(written).toContain(`CATALOG_LAST_UPDATED = "${today}"`);
	});

	it('returns error when defaultConfig marker is missing', () => {
		mockReadFileSync.mockReturnValue('export const presets = {}; // no defaultConfig');
		const result = addPresetToFile(makeCandidate('my_scooter'));
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// addPresetToFile – file already has auto-discovered section
// ---------------------------------------------------------------------------

describe('addPresetToFile – file with existing auto section', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('inserts config when file has auto section already', () => {
		const contentWithBothMarkers = makePresetsFileContent({ includeAutoMarker: true }).replace(
			'};', // replace first `};` in metadata section — adds second auto marker
			'  // --- Auto-discovered Models ---\n};'
		);
		mockReadFileSync.mockReturnValue(contentWithBothMarkers);

		addPresetToFile(makeCandidate('new_scooter'));
		const written = mockWriteFileSync.mock.calls[0][1] as string;
		expect(written).toContain('new_scooter:');
	});
});

// ---------------------------------------------------------------------------
// addPresetToFile – key already exists → delegates to updatePresetInFile
// ---------------------------------------------------------------------------

describe('addPresetToFile – key already exists', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('calls writeFileSync (tries update path) when key exists', () => {
		// The key 'ninebot_max' is always present in base content.
		// updatePresetInFile: read → remove → write, then addPresetToFile: read (no key) → write
		// We simulate this: 1st read=original, 2nd read=without key, 3rd read=without key
		const base = makePresetsFileContent();
		const _withoutKey = makePresetsFileContent({ keys: [] }); // no ninebot_max in extras, but original still has it

		// After removeEntryFromContent the key should be gone.
		// Let writeFileSync capture the content after removal, then readFileSync returns it.
		let capturedAfterRemove: string | null = null;
		mockWriteFileSync.mockImplementation((_path: string, content: string) => {
			capturedAfterRemove = content;
		});

		mockReadFileSync
			.mockReturnValueOnce(base) // First isPresetInFile check (key found → goes to update)
			.mockReturnValueOnce(base) // updatePresetInFile reads the file again
			.mockImplementation(() => capturedAfterRemove ?? base); // subsequent reads return modified

		const candidate = makeCandidate('ninebot_max');
		// Should not throw; may succeed or fail depending on content flow
		const _result = addPresetToFile(candidate);
		// The test just verifies it attempted to write (went through update path)
		expect(mockWriteFileSync).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// removePresetFromFile
// ---------------------------------------------------------------------------

describe('removePresetFromFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns success: true when key does not exist (nothing to remove)', () => {
		mockReadFileSync.mockReturnValue(makePresetsFileContent());
		const result = removePresetFromFile('does_not_exist');
		expect(result.success).toBe(true);
		// writeFileSync should NOT be called since key was not found
		expect(mockWriteFileSync).not.toHaveBeenCalled();
	});

	it('removes the entry and writes the file when key exists', () => {
		mockReadFileSync.mockReturnValue(makePresetsFileContent({ keys: ['varla_eagle'] }));
		const result = removePresetFromFile('varla_eagle');
		expect(result.success).toBe(true);
		expect(mockWriteFileSync).toHaveBeenCalled();

		const written = mockWriteFileSync.mock.calls[0][1] as string;
		// The varla_eagle config block should be gone
		expect(written).not.toContain('varla_eagle: {');
	});

	it('bumps the version after removal', () => {
		mockReadFileSync.mockReturnValue(makePresetsFileContent({ keys: ['varla_eagle'] }));
		removePresetFromFile('varla_eagle');

		const written = mockWriteFileSync.mock.calls[0][1] as string;
		expect(written).toContain('CATALOG_VERSION = "1.2.4"');
	});

	it('leaves other keys intact after removal', () => {
		mockReadFileSync.mockReturnValue(makePresetsFileContent({ keys: ['varla_eagle', 'xiaomi_pro2'] }));
		removePresetFromFile('varla_eagle');

		const written = mockWriteFileSync.mock.calls[0][1] as string;
		expect(written).toContain('xiaomi_pro2');
		expect(written).not.toContain('varla_eagle: {');
	});

	it('handles exceptions and returns error', () => {
		mockReadFileSync.mockImplementation(() => {
			throw new Error('File read failure');
		});

		const result = removePresetFromFile('ninebot_max');
		expect(result.success).toBe(false);
		expect(result.error).toContain('File read failure');
	});
});

// ---------------------------------------------------------------------------
// updatePresetInFile
// ---------------------------------------------------------------------------

describe('updatePresetInFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('calls writeFileSync at least once during update', () => {
		// updatePresetInFile: read → remove → write intermediate → addPresetToFile → read → write final
		const withKey = makePresetsFileContent({ keys: ['varla_eagle'] });
		let capturedContent: string | null = null;

		mockWriteFileSync.mockImplementation((_path: string, content: string) => {
			capturedContent = content;
		});

		// 1st read: in updatePresetInFile (has key, will remove it)
		// 2nd read: in addPresetToFile's isPresetInFile (should NOT have key any more)
		// 3rd read onward: in addPresetToFile (proceeds to insert)
		mockReadFileSync
			.mockReturnValueOnce(withKey) // updatePresetInFile reads file
			.mockImplementation(() => capturedContent ?? withKey); // after first write, returns modified

		updatePresetInFile(makeCandidate('varla_eagle'));
		expect(mockWriteFileSync).toHaveBeenCalled();
	});

	it('final written content does not throw when accessed as string', () => {
		const withKey = makePresetsFileContent({ keys: ['varla_eagle'] });
		let capturedContent: string | null = null;

		mockWriteFileSync.mockImplementation((_path: string, content: string) => {
			capturedContent = content;
		});

		mockReadFileSync.mockReturnValueOnce(withKey).mockImplementation(() => capturedContent ?? withKey);

		updatePresetInFile(makeCandidate('varla_eagle'));

		const allWritten = mockWriteFileSync.mock.calls.map((c) => c[1] as string);
		const finalWrite = allWritten[allWritten.length - 1];
		expect(typeof finalWrite).toBe('string');
		expect(finalWrite.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// bumpCatalogVersion (tested via public API)
// ---------------------------------------------------------------------------

describe('bumpCatalogVersion (via addPresetToFile)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('handles version "2.10.9" → "2.10.10"', () => {
		const content = makePresetsFileContent().replace('CATALOG_VERSION = "1.2.3"', 'CATALOG_VERSION = "2.10.9"');
		mockReadFileSync.mockReturnValue(content);

		addPresetToFile(makeCandidate('new_scooter'));

		const written = mockWriteFileSync.mock.calls[0][1] as string;
		expect(written).toContain('CATALOG_VERSION = "2.10.10"');
	});

	it('does not double-bump on re-reads', () => {
		mockReadFileSync.mockReturnValue(makePresetsFileContent());
		addPresetToFile(makeCandidate('another_scooter'));

		const written = mockWriteFileSync.mock.calls[0][1] as string;
		// "1.2.3" → "1.2.4" (not "1.2.5" or higher)
		expect(written).toContain('"1.2.4"');
		expect(written).not.toContain('"1.2.5"');
	});
});
