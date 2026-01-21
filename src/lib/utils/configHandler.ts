import { exportConfig, importConfig } from '$lib/utils/fileHandler';
import { calculatorState, applyConfig } from '$lib/stores/calculator.svelte';

export function exportConfiguration(): void {
  exportConfig(calculatorState.config);
}

export async function importConfiguration(): Promise<void> {
  const imported = await importConfig();
  if (imported) {
    applyConfig(imported);
  }
}
