/**
 * Unit tests for preset-writer.ts.
 *
 * fs/promises is mocked so no actual filesystem access occurs.
 * All tests operate on fabricated string representations of presets.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock fs/promises BEFORE importing the module under test
// ---------------------------------------------------------------------------

const { mockReadFile, mockWriteFile } = vi.hoisted(() => {
	const mockReadFile = vi.fn();
	const mockWriteFile = vi.fn().mockResolvedValue(undefined);
	return { mockReadFile, mockWriteFile };
});

vi.mock('fs/promises', () => ({
	readFile: mockReadFile,
	writeFile: mockWriteFile,
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
		specsQuality: 'partial' as const,
		sources: { discoveredFrom: 'https://test.com', extractedAt: new Date().toISOString() },
		status: 'pending',
	};
}

// ---------------------------------------------------------------------------
// isPresetInFile
// ---------------------------------------------------------------------------

describe('isPresetInFile', () => {
	it('returns true when the key exists in the config object', async () => {
		mockReadFile.mockResolvedValue(makePresetsFileContent({ keys: ['varla_eagle'] }));
		expect(await isPresetInFile('varla_eagle')).toBe(true);
	});

	it('returns false when the key does not exist', async () => {
		mockReadFile.mockResolvedValue(makePresetsFileContent({ keys: [] }));
		expect(await isPresetInFile('does_not_exist')).toBe(false);
	});

	it('returns true for the ninebot_max key that is always present', async () => {
		mockReadFile.mockResolvedValue(makePresetsFileContent());
		expect(await isPresetInFile('ninebot_max')).toBe(true);
	});

	it('returns false for a partial key match (e.g. ninebot vs ninebot_max)', async () => {
		mockReadFile.mockResolvedValue(makePresetsFileContent());
		// 'ninebot' alone does not match a `  ninebot: {` pattern
		expect(await isPresetInFile('ninebot')).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// addPresetToFile – new key, no auto section yet
// ---------------------------------------------------------------------------

describe('addPresetToFile – fresh file (no auto section)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockWriteFile.mockResolvedValue(undefined);
	});

	it('returns success: true', async () => {
		mockReadFile.mockResolvedValue(makePresetsFileContent());
		const candidate = makeCandidate('varla_eagle_one');
		const result = await addPresetToFile(candidate);
		expect(result.success).toBe(true);
	});

	it('calls writeFile with content that includes the new key', async () => {
		mockReadFile.mockResolvedValue(makePresetsFileContent());
		await addPresetToFile(makeCandidate('varla_eagle_one'));

		const written = mockWriteFile.mock.calls[0][1] as string;
		expect(written).toContain('varla_eagle_one:');
	});

	it('includes the candidate name in the metadata section', async () => {
		mockReadFile.mockResolvedValue(makePresetsFileContent());
		await addPresetToFile(makeCandidate('varla_eagle_one'));

		const written = mockWriteFile.mock.calls[0][1] as string;
		expect(written).toContain('"varla eagle one"');
	});

	it('bumps the CATALOG_VERSION patch number', async () => {
		mockReadFile.mockResolvedValue(makePresetsFileContent());
		await addPresetToFile(makeCandidate('varla_eagle_one'));

		const written = mockWriteFile.mock.calls[0][1] as string;
		// Original was "1.2.3" → should become "1.2.4"
		expect(written).toContain('CATALOG_VERSION = "1.2.4"');
	});

	it('updates CATALOG_LAST_UPDATED to today', async () => {
		mockReadFile.mockResolvedValue(makePresetsFileContent());
		await addPresetToFile(makeCandidate('varla_eagle_one'));

		const today = new Date().toISOString().slice(0, 10);
		const written = mockWriteFile.mock.calls[0][1] as string;
		expect(written).toContain(`CATALOG_LAST_UPDATED = "${today}"`);
	});

	it('returns error when defaultConfig marker is missing', async () => {
		mockReadFile.mockResolvedValue('export const presets = {}; // no defaultConfig');
		const result = await addPresetToFile(makeCandidate('my_scooter'));
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
		mockWriteFile.mockResolvedValue(undefined);
	});

	it('inserts config when file has auto section already', async () => {
		const contentWithBothMarkers = makePresetsFileContent({ includeAutoMarker: true }).replace(
			'};', // replace first `};` in metadata section — adds second auto marker
			'  // --- Auto-discovered Models ---\n};'
		);
		mockReadFile.mockResolvedValue(contentWithBothMarkers);

		await addPresetToFile(makeCandidate('new_scooter'));
		const written = mockWriteFile.mock.calls[0][1] as string;
		expect(written).toContain('new_scooter:');
	});
});

// ---------------------------------------------------------------------------
// addPresetToFile – key already exists → delegates to updatePresetInFile
// ---------------------------------------------------------------------------

describe('addPresetToFile – key already exists', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockWriteFile.mockResolvedValue(undefined);
	});

	it('calls writeFile (tries update path) when key exists', async () => {
		// The key 'ninebot_max' is always present in base content.
		// updatePresetInFile: read → remove → write, then addPresetToFile: read (no key) → write
		const base = makePresetsFileContent();

		let capturedAfterRemove: string | null = null;
		mockWriteFile.mockImplementation((_path: string, content: string) => {
			capturedAfterRemove = content;
			return Promise.resolve();
		});

		mockReadFile
			.mockResolvedValueOnce(base) // addPresetToFile reads file (key found → goes to update)
			.mockResolvedValueOnce(base) // updatePresetInFile reads the file again
			.mockImplementation(() => Promise.resolve(capturedAfterRemove ?? base)); // subsequent reads return modified

		const candidate = makeCandidate('ninebot_max');
		await addPresetToFile(candidate);
		expect(mockWriteFile).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// removePresetFromFile
// ---------------------------------------------------------------------------

describe('removePresetFromFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockWriteFile.mockResolvedValue(undefined);
	});

	it('returns success: true when key does not exist (nothing to remove)', async () => {
		mockReadFile.mockResolvedValue(makePresetsFileContent());
		const result = await removePresetFromFile('does_not_exist');
		expect(result.success).toBe(true);
		// writeFile should NOT be called since key was not found
		expect(mockWriteFile).not.toHaveBeenCalled();
	});

	it('removes the entry and writes the file when key exists', async () => {
		mockReadFile.mockResolvedValue(makePresetsFileContent({ keys: ['varla_eagle'] }));
		const result = await removePresetFromFile('varla_eagle');
		expect(result.success).toBe(true);
		expect(mockWriteFile).toHaveBeenCalled();

		const written = mockWriteFile.mock.calls[0][1] as string;
		// The varla_eagle config block should be gone
		expect(written).not.toContain('varla_eagle: {');
	});

	it('bumps the version after removal', async () => {
		mockReadFile.mockResolvedValue(makePresetsFileContent({ keys: ['varla_eagle'] }));
		await removePresetFromFile('varla_eagle');

		const written = mockWriteFile.mock.calls[0][1] as string;
		expect(written).toContain('CATALOG_VERSION = "1.2.4"');
	});

	it('leaves other keys intact after removal', async () => {
		mockReadFile.mockResolvedValue(makePresetsFileContent({ keys: ['varla_eagle', 'xiaomi_pro2'] }));
		await removePresetFromFile('varla_eagle');

		const written = mockWriteFile.mock.calls[0][1] as string;
		expect(written).toContain('xiaomi_pro2');
		expect(written).not.toContain('varla_eagle: {');
	});

	it('handles exceptions and returns error', async () => {
		mockReadFile.mockRejectedValue(new Error('File read failure'));

		const result = await removePresetFromFile('ninebot_max');
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
		mockWriteFile.mockResolvedValue(undefined);
	});

	it('calls writeFile at least once during update', async () => {
		const withKey = makePresetsFileContent({ keys: ['varla_eagle'] });
		let capturedContent: string | null = null;

		mockWriteFile.mockImplementation((_path: string, content: string) => {
			capturedContent = content;
			return Promise.resolve();
		});

		// 1st read: in updatePresetInFile (has key, will remove it)
		// 2nd read: in addPresetToFile (should NOT have key any more)
		// 3rd read onward: in addPresetToFile (proceeds to insert)
		mockReadFile
			.mockResolvedValueOnce(withKey) // updatePresetInFile reads file
			.mockImplementation(() => Promise.resolve(capturedContent ?? withKey)); // after first write, returns modified

		await updatePresetInFile(makeCandidate('varla_eagle'));
		expect(mockWriteFile).toHaveBeenCalled();
	});

	it('final written content does not throw when accessed as string', async () => {
		const withKey = makePresetsFileContent({ keys: ['varla_eagle'] });
		let capturedContent: string | null = null;

		mockWriteFile.mockImplementation((_path: string, content: string) => {
			capturedContent = content;
			return Promise.resolve();
		});

		mockReadFile.mockResolvedValueOnce(withKey).mockImplementation(() => Promise.resolve(capturedContent ?? withKey));

		await updatePresetInFile(makeCandidate('varla_eagle'));

		const allWritten = mockWriteFile.mock.calls.map((c) => c[1] as string);
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
		mockWriteFile.mockResolvedValue(undefined);
	});

	it('handles version "2.10.9" → "2.10.10"', async () => {
		const content = makePresetsFileContent().replace('CATALOG_VERSION = "1.2.3"', 'CATALOG_VERSION = "2.10.9"');
		mockReadFile.mockResolvedValue(content);

		await addPresetToFile(makeCandidate('new_scooter'));

		const written = mockWriteFile.mock.calls[0][1] as string;
		expect(written).toContain('CATALOG_VERSION = "2.10.10"');
	});

	it('does not double-bump on re-reads', async () => {
		mockReadFile.mockResolvedValue(makePresetsFileContent());
		await addPresetToFile(makeCandidate('another_scooter'));

		const written = mockWriteFile.mock.calls[0][1] as string;
		// "1.2.3" → "1.2.4" (not "1.2.5" or higher)
		expect(written).toContain('"1.2.4"');
		expect(written).not.toContain('"1.2.5"');
	});
});
