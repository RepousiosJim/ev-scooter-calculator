/**
 * Accessibility Utilities
 *
 * Helper functions and utilities for WCAG AAA compliance
 * and enhanced accessibility support.
 */

// ============================================================================
// ARIA HELPERS
// ============================================================================

/**
 * Generates unique IDs for accessibility attributes
 */
export function generateAriaId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Creates ARIA attributes for form fields with errors
 */
export function getFieldErrorAttributes(
  fieldId: string,
  errorId: string,
  hasError: boolean
): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {
    id: fieldId,
    'aria-invalid': hasError ? 'true' : 'false',
  };
  if (hasError) {
    result['aria-describedby'] = errorId;
  }
  return result;
}

/**
 * Creates ARIA attributes for live regions
 */
export function getLiveRegionAttributes(polite: boolean = true): Record<string, string> {
  return {
    role: 'region',
    'aria-live': polite ? 'polite' : 'assertive',
    'aria-atomic': 'true',
  };
}

/**
 * Creates ARIA attributes for modal dialogs
 */
export function getModalAttributes(
  modalId: string,
  labelledBy: string,
  describedBy?: string
): Record<string, string> {
  const attributes: Record<string, string> = {
    id: modalId,
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': labelledBy,
  };

  if (describedBy) {
    attributes['aria-describedby'] = describedBy;
  }

  return attributes;
}

// ============================================================================
// FOCUS MANAGEMENT
// ============================================================================

let focusTrapStack: HTMLElement[] = [];

/**
 * Traps focus within a container element
 * Used for modals and dropdowns
 */
export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = element.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), ' +
    'input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  ) as NodeListOf<HTMLElement>;

  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab: Move to previous element
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      // Tab: Move to next element
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  };

  element.addEventListener('keydown', handleKeyDown);
  focusTrapStack.push(element);

  // Focus first element if none is focused
  if (!element.contains(document.activeElement)) {
    firstFocusable?.focus();
  }

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleKeyDown);
    focusTrapStack = focusTrapStack.filter((el) => el !== element);
  };
}

/**
 * Returns focus to previously focused element
 */
export function restoreFocus(previousElement: HTMLElement): void {
  previousElement.focus();
}

/**
 * Moves focus to next element in tab order
 */
export function moveFocusNext(currentElement: HTMLElement): void {
  const focusableElements = Array.from(
    document.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), ' +
      'input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ) as HTMLElement[];

  const currentIndex = focusableElements.indexOf(currentElement);
  const nextIndex = (currentIndex + 1) % focusableElements.length;

  focusableElements[nextIndex]?.focus();
}

/**
 * Moves focus to previous element in tab order
 */
export function moveFocusPrevious(currentElement: HTMLElement): void {
  const focusableElements = Array.from(
    document.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), ' +
      'input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ) as HTMLElement[];

  const currentIndex = focusableElements.indexOf(currentElement);
  const previousIndex = currentIndex === 0
    ? focusableElements.length - 1
    : currentIndex - 1;

  focusableElements[previousIndex]?.focus();
}

// ============================================================================
// KEYBOARD NAVIGATION
// ============================================================================

/**
 * Creates keyboard handler for common patterns
 */
export function createKeyboardHandler(
  handlers: {
    enter?: () => void;
    space?: () => void;
    escape?: () => void;
    arrowUp?: () => void;
    arrowDown?: () => void;
    arrowLeft?: () => void;
    arrowRight?: () => void;
    home?: () => void;
    end?: () => void;
  }
): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        handlers.enter?.();
        break;
      case ' ':
      case 'Space':
        if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
          e.preventDefault();
          handlers.space?.();
        }
        break;
      case 'Escape':
        handlers.escape?.();
        break;
      case 'ArrowUp':
        e.preventDefault();
        handlers.arrowUp?.();
        break;
      case 'ArrowDown':
        e.preventDefault();
        handlers.arrowDown?.();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        handlers.arrowLeft?.();
        break;
      case 'ArrowRight':
        e.preventDefault();
        handlers.arrowRight?.();
        break;
      case 'Home':
        e.preventDefault();
        handlers.home?.();
        break;
      case 'End':
        e.preventDefault();
        handlers.end?.();
        break;
    }
  };
}

/**
 * Checks if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();
  const isFocusableTag = ['a', 'button', 'input', 'select', 'textarea'].includes(tagName);
  const hasTabindex = element.hasAttribute('tabindex');
  const isDisabled = element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true';
  const isHidden = element.hidden || element.style.display === 'none';

  return !isDisabled && !isHidden && (isFocusableTag || hasTabindex);
}

// ============================================================================
// SCREEN READER HELPERS
// ============================================================================

/**
 * Announces a message to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const existingRegion = document.getElementById('aria-live-region');

  if (existingRegion) {
    existingRegion.textContent = message;
    existingRegion.setAttribute('aria-live', priority);
    return;
  }

  const region = document.createElement('div');
  region.id = 'aria-live-region';
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', priority);
  region.setAttribute('aria-atomic', 'true');

  Object.assign(region.style, {
    position: 'absolute',
    left: '-9999px',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
  });

  document.body.appendChild(region);
  region.textContent = message;
}

/**
 * Hides content visually but keeps it available to screen readers
 */
export function visuallyHide(element: HTMLElement): void {
  Object.assign(element.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    borderWidth: '0',
  });
}

/**
 * Shows visually hidden content
 */
export function visuallyShow(element: HTMLElement): void {
  Object.assign(element.style, {
    position: '',
    width: '',
    height: '',
    padding: '',
    margin: '',
    overflow: '',
    clip: '',
    whiteSpace: '',
    borderWidth: '',
  });
}

/**
 * Checks if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Checks if high contrast mode is preferred
 */
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches;
}

// ============================================================================
// COLOR CONTRAST
// ============================================================================

/**
 * Calculates relative luminance of a color
 * Based on WCAG 2.0 formula
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Parses hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculates contrast ratio between two colors
 * WCAG 2.0 formula: (L1 + 0.05) / (L2 + 0.05)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 0;

  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Checks if contrast meets WCAG AA or AAA level
 */
export function meetsContrastLevel(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  fontSize: 'normal' | 'large' = 'normal'
): boolean {
  const ratio = getContrastRatio(foreground, background);

  // WCAG 2.1 requirements
  const thresholds = {
    AA: fontSize === 'large' ? 3 : 4.5,
    AAA: fontSize === 'large' ? 4.5 : 7,
  };

  return ratio >= thresholds[level];
}

/**
 * Returns accessible text color for given background
 */
export function getAccessibleTextColor(background: string): '#000000' | '#ffffff' {
  const whiteContrast = getContrastRatio('#ffffff', background);
  const blackContrast = getContrastRatio('#000000', background);

  return whiteContrast > blackContrast ? '#ffffff' : '#000000';
}

// ============================================================================
// TOUCH TARGET HELPERS
// ============================================================================

/**
 * Ensures element meets minimum touch target size (44x44px)
 */
export function ensureTouchTargetSize(element: HTMLElement): void {
  const rect = element.getBoundingClientRect();
  const minSize = 44;

  if (rect.width < minSize || rect.height < minSize) {
    const wrapper = document.createElement('span');
    wrapper.style.display = 'inline-flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';
    wrapper.style.width = `${Math.max(rect.width, minSize)}px`;
    wrapper.style.height = `${Math.max(rect.height, minSize)}px`;

    element.parentNode?.insertBefore(wrapper, element);
    wrapper.appendChild(element);
  }
}

/**
 * Checks if device supports touch
 */
export function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

// ============================================================================
// HEADING HIERARCHY
// ============================================================================

/**
 * Checks if heading levels are in correct order
 */
export function validateHeadingHierarchy(): boolean {
  const headings = Array.from(
    document.querySelectorAll('h1, h2, h3, h4, h5, h6')
  );

  if (headings.length === 0) return false;

  // Should start with h1
  if (headings[0].tagName.toLowerCase() !== 'h1') return false;

  // Should not skip levels (e.g., h1 -> h3)
  for (let i = 1; i < headings.length; i++) {
    const currentLevel = parseInt(headings[i].tagName[1]);
    const previousLevel = parseInt(headings[i - 1].tagName[1]);

    if (currentLevel > previousLevel + 1) return false;
  }

  return true;
}

/**
 * Gets heading level as number
 */
export function getHeadingLevel(element: HTMLElement): number | null {
  const match = element.tagName.match(/^h([1-6])$/i);
  return match ? parseInt(match[1]) : null;
}

// ============================================================================
// LANDMARK HELPERS
// ============================================================================

/**
 * Adds landmark role if not already present
 */
export function ensureLandmark(element: HTMLElement, role: string): void {
  if (!element.hasAttribute('role')) {
    element.setAttribute('role', role);
  }
}

/**
 * Gets all landmarks on page
 */
export function getLandmarks(): HTMLElement[] {
  const selectors = [
    '[role="banner"]',
    '[role="navigation"]',
    '[role="main"]',
    '[role="complementary"]',
    '[role="contentinfo"]',
    '[role="search"]',
    'header',
    'nav',
    'main',
    'aside',
    'footer',
  ];

  return Array.from(document.querySelectorAll(selectors.join(',')));
}

// ============================================================================
// FORM HELPERS
// ============================================================================

/**
 * Creates label for input with proper association
 */
export function createLabel(text: string, inputId: string): HTMLLabelElement {
  const label = document.createElement('label');
  label.textContent = text;
  label.setAttribute('for', inputId);
  label.className = 'sr-only'; // Screen reader only

  return label;
}

/**
 * Groups form controls properly
 */
export function createFieldset(legend: string): HTMLFieldSetElement {
  const fieldset = document.createElement('fieldset');
  const legendElement = document.createElement('legend');
  legendElement.textContent = legend;
  fieldset.appendChild(legendElement);

  return fieldset;
}

// ============================================================================
// ANIMATION HELPERS
// ============================================================================

/**
 * Respects reduced motion preference for animations
 */
export function animateWithReducedMotion(
  element: HTMLElement,
  keyframes: Keyframe[],
  options?: KeyframeAnimationOptions
): Animation | null {
  if (prefersReducedMotion()) {
    // Skip animation if reduced motion preferred
    return null;
  }

  return element.animate(keyframes, options);
}

/**
 * Gets appropriate animation duration based on reduced motion preference
 */
export function getAnimationDuration(normalDuration: number): number {
  return prefersReducedMotion() ? 0.01 : normalDuration;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const a11y = {
  generateAriaId,
  getFieldErrorAttributes,
  getLiveRegionAttributes,
  getModalAttributes,
  trapFocus,
  restoreFocus,
  moveFocusNext,
  moveFocusPrevious,
  createKeyboardHandler,
  isFocusable,
  announce,
  visuallyHide,
  visuallyShow,
  prefersReducedMotion,
  prefersHighContrast,
  getContrastRatio,
  meetsContrastLevel,
  getAccessibleTextColor,
  ensureTouchTargetSize,
  isTouchDevice,
  validateHeadingHierarchy,
  getHeadingLevel,
  ensureLandmark,
  getLandmarks,
  createLabel,
  createFieldset,
  animateWithReducedMotion,
  getAnimationDuration,
};
