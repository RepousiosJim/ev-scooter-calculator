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
		localStorage.setItem('ev-calc-unit-system', uiState.unitSystem);
	}
}

/**
 * Load persisted unit system from localStorage (call once on app mount, browser-only).
 */
export function initUnitSystem() {
	if (typeof localStorage !== 'undefined') {
		const saved = localStorage.getItem('ev-calc-unit-system');
		if (saved === 'metric' || saved === 'imperial') {
			uiState.unitSystem = saved;
		}
	}
}
