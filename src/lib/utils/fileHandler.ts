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

      reader.onerror = () => {
        resolve(null);
      };

      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          if (!isValidScooterConfig(parsed)) {
            resolve(null);
            return;
          }
          resolve(parsed as ScooterConfig);
        } catch {
          resolve(null);
        }
      };

      reader.readAsText(file);
    };
    input.click();
  });
}

function isValidScooterConfig(obj: unknown): obj is ScooterConfig {
  if (!obj || typeof obj !== 'object') return false;

  const config = obj as Partial<ScooterConfig>;

  return (
    typeof config.v === 'number' &&
    typeof config.ah === 'number' &&
    typeof config.motors === 'number' &&
    typeof config.watts === 'number'
  );
}

export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}
