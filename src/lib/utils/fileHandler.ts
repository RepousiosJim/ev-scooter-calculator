import type { ScooterConfig } from '$lib/types';

export function exportConfig(config: ScooterConfig): void {
  const data = JSON.stringify(config, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scooter-config-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importConfig(): Promise<ScooterConfig | null> {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  return new Promise((resolve) => {
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target?.result as string);
          resolve(config as ScooterConfig);
        } catch {
          resolve(null);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}
