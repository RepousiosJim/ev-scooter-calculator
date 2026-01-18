let activeShortcuts = new Set<(event: KeyboardEvent) => void>();

export function keyboardShortcut(
  keys: string[],
  callback: (event: KeyboardEvent) => void,
  description?: string
) {
  const handler = (event: KeyboardEvent) => {
    // Ignore if typing in input fields or holding modifiers
    const target = event.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    const hasModifier = event.ctrlKey || event.metaKey || event.altKey || event.shiftKey;

    if (isInput || hasModifier) return;

    if (keys.some(key => key.toLowerCase() === event.key.toLowerCase())) {
      callback(event);
    }
  };

  document.addEventListener('keydown', handler);
  activeShortcuts.add(handler);

  if (description && typeof window !== 'undefined' && import.meta.env?.DEV) {
    console.log(`[Keyboard Shortcut] ${keys.join(' or ')}: ${description}`);
  }

  return {
    destroy() {
      document.removeEventListener('keydown', handler);
      activeShortcuts.delete(handler);
    }
  };
}

export function destroyAllShortcuts() {
  activeShortcuts.forEach(handler => {
    document.removeEventListener('keydown', handler);
  });
  activeShortcuts.clear();
}
