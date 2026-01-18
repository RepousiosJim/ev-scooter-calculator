function getFocusableElements(element: HTMLElement): HTMLElement[] {
  const selector = 'button, [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable], [tabindex]:not([tabindex="-1"]):not([disabled])';
  const elements = element.querySelectorAll<HTMLElement>(selector);

  return Array.from(elements).filter((el) => {
    const rect = el.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0;
    const isNotHidden = window.getComputedStyle(el).visibility !== 'hidden';
    const isNotContentEditableFalse = el.getAttribute('contenteditable') !== 'false';
    return isVisible && isNotHidden && isNotContentEditableFalse;
  });
}

export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = getFocusableElements(element);

  if (focusableElements.length === 0) {
    return () => {};
  }

  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  function handleTabKey(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;

    const currentFocusableElements = getFocusableElements(element);
    const currentFirst = currentFocusableElements[0];
    const currentLast = currentFocusableElements[currentFocusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === currentFirst) {
        e.preventDefault();
        currentLast?.focus();
      }
    } else {
      if (document.activeElement === currentLast) {
        e.preventDefault();
        currentFirst?.focus();
      }
    }
  }

  element.addEventListener('keydown', handleTabKey);
  return () => element.removeEventListener('keydown', handleTabKey);
}

export function focusFirstDescendant(element: HTMLElement): void {
  const focusable = getFocusableElements(element);
  focusable[0]?.focus();
}
