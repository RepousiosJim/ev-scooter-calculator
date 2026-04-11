export const uiState = $state({
  showAdvanced: false,
  compareMode: false,
  activeTab: 'configuration' as 'configuration' | 'upgrades' | 'compare',
  isTabLoading: false,
  pendingTab: null as 'configuration' | 'upgrades' | 'compare' | null,
  unitSystem: 'metric' as 'metric' | 'imperial'
});

export function toggleAdvanced(next?: boolean) {
  uiState.showAdvanced = typeof next === 'boolean' ? next : !uiState.showAdvanced;
}

export function toggleCompareMode(enabled: boolean) {
  uiState.compareMode = enabled;
}

export function setActiveTab(tab: 'configuration' | 'upgrades' | 'compare') {
  uiState.activeTab = tab;
}

/**
 * Set active tab with a brief loading skeleton for improved perceived performance.
 * Shows skeleton for a minimum duration to prevent flash, then transitions to content.
 */
export function setActiveTabWithLoading(tab: 'configuration' | 'upgrades' | 'compare') {
  if (tab === uiState.activeTab) return;

  uiState.isTabLoading = true;
  uiState.pendingTab = tab;

  // Brief delay for skeleton to appear (improves perceived performance)
  setTimeout(() => {
    uiState.activeTab = tab;

    // Allow content to render before hiding skeleton
    setTimeout(() => {
      uiState.isTabLoading = false;
      uiState.pendingTab = null;
    }, 100);
  }, 50);
}

/**
 * Clear loading state (useful for cleanup)
 */
export function clearTabLoading() {
  uiState.isTabLoading = false;
  uiState.pendingTab = null;
}
