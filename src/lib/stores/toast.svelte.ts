// Toast state — extracted from calculator store so it can be used
// across the entire app (admin, rankings, etc.) without importing
// the calculator domain.

export const toastState = $state({
	toasts: [] as { id: string; message: string; type: 'success' | 'info' | 'warning' | 'error' }[],
});

function generateToastId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}-${Math.random().toString(36).slice(2, 11)}`;
}

export function showToast(
	message: string,
	type: 'success' | 'info' | 'warning' | 'error' = 'info',
	duration: number = 2500
) {
	const id = generateToastId();
	toastState.toasts.push({ id, message, type });

	setTimeout(() => {
		toastState.toasts = toastState.toasts.filter((t) => t.id !== id);
	}, duration);
}

export function clearToast(id: string) {
	toastState.toasts = toastState.toasts.filter((t) => t.id !== id);
}

export function clearAllToasts() {
	toastState.toasts = [];
}
