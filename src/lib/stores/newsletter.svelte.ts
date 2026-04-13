export interface NewsletterState {
	email: string | null;
	subscribedAt: string | null;
	dismissed: boolean;
}

const STORAGE_KEY = 'ev_newsletter';

function defaultState(): NewsletterState {
	return { email: null, subscribedAt: null, dismissed: false };
}

export function getNewsletterState(): NewsletterState {
	if (typeof localStorage === 'undefined') return defaultState();
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaultState();
		return JSON.parse(raw) as NewsletterState;
	} catch {
		return defaultState();
	}
}

function save(state: NewsletterState): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function setSubscribed(email: string): void {
	save({ email, subscribedAt: new Date().toISOString(), dismissed: false });
}

export function setDismissed(): void {
	const current = getNewsletterState();
	save({ ...current, dismissed: true });
}

export function isSubscribed(): boolean {
	return !!getNewsletterState().subscribedAt;
}

export function isDismissed(): boolean {
	return getNewsletterState().dismissed;
}

export function clearSubscription(): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem(STORAGE_KEY);
}
