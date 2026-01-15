export function handleError(error: unknown, context: string): void {
  console.error(`[${context}]`, error);
}

export function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    handleError(error, 'localStorage.getItem');
    return null;
  }
}

export function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    handleError(error, 'localStorage.setItem');
  }
}

export function safeLocalStorageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    handleError(error, 'localStorage.removeItem');
  }
}
