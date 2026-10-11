export const uiState = $state({
	activeTab: 'configuration' as 'configuration' | 'upgrades' | 'compare',
	unitSystem: 'metric' as 'metric' | 'imperial',
});

export function setActiveTab(tab: 'configuration' | 'upgrades' | 'compare') {
	uiState.activeTab = tab;
}

/**
 * Toggle between metric and imperial unit systems, persisting the choice to localStorage.
 */
export function toggleUnitSystem() {
	uiState.unitSystem = uiState.unitSystem === 'metric' ? 'imperial' : 'metric';
	if (typeof localStorage !== 'undefined') {
		try {
			localStorage.setItem('ev-calc-unit-system', uiState.unitSystem);
		} catch {
			// Storage unavailable — the choice just won't persist.
		}
	}
}

/**
 * Load persisted unit system from localStorage (call once on app mount, browser-only).
 */
export function initUnitSystem() {
	if (typeof localStorage === 'undefined') return;
	try {
		const saved = localStorage.getItem('ev-calc-unit-system');
		if (saved === 'metric' || saved === 'imperial') {
			uiState.unitSystem = saved;
		}
	} catch {
		// Storage unavailable — keep the default unit system.
	}
}
