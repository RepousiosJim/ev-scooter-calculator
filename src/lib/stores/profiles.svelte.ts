import { showToast } from './toast.svelte';
import type { ScooterConfig } from '$lib/types';

const STORAGE_KEY = 'ev-scooter-profiles';
const MAX_PROFILES = 20;

export interface SavedProfile {
	id: string; // crypto.randomUUID() or fallback
	name: string;
	config: ScooterConfig;
	presetKey: string; // which preset it was based on, or 'custom'
	createdAt: string; // ISO date
	updatedAt: string; // ISO date
	isFavorite?: boolean;
}

export const profilesState = $state({
	profiles: [] as SavedProfile[],
	activeProfileId: null as string | null,
});

// --- Private helpers ---

function generateId(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function persistProfiles(): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(profilesState.profiles));
	} catch {
		// Storage quota exceeded or unavailable — fail silently.
	}
}

// --- Public API ---

export function loadProfiles(): void {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return;
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed)) {
			profilesState.profiles = parsed as SavedProfile[];
		}
	} catch {
		// Corrupted data — reset to empty.
		profilesState.profiles = [];
	}
}

export function saveProfile(name: string, config: ScooterConfig, presetKey: string): SavedProfile | null {
	if (profilesState.profiles.length >= MAX_PROFILES) {
		showToast(`Profile limit reached (${MAX_PROFILES} max). Delete an existing profile first.`, 'warning');
		return null;
	}

	const now = new Date().toISOString();
	const profile: SavedProfile = {
		id: generateId(),
		name,
		config,
		presetKey,
		createdAt: now,
		updatedAt: now,
	};

	profilesState.profiles = [...profilesState.profiles, profile];
	persistProfiles();
	showToast(`Profile "${name}" saved.`, 'success');
	return profile;
}

export function updateProfile(id: string, config: ScooterConfig, presetKey: string): void {
	profilesState.profiles = profilesState.profiles.map((p) =>
		p.id === id ? { ...p, config, presetKey, updatedAt: new Date().toISOString() } : p
	);
	persistProfiles();
}

export function deleteProfile(id: string): void {
	const target = profilesState.profiles.find((p) => p.id === id);
	profilesState.profiles = profilesState.profiles.filter((p) => p.id !== id);
	if (profilesState.activeProfileId === id) {
		profilesState.activeProfileId = null;
	}
	persistProfiles();
	if (target) {
		showToast(`Profile "${target.name}" deleted.`, 'info');
	}
}

export function renameProfile(id: string, newName: string): void {
	profilesState.profiles = profilesState.profiles.map((p) =>
		p.id === id ? { ...p, name: newName, updatedAt: new Date().toISOString() } : p
	);
	persistProfiles();
	showToast(`Profile renamed to "${newName}".`, 'success');
}

export function setActiveProfile(id: string | null): void {
	profilesState.activeProfileId = id;
}

export function toggleFavorite(id: string): void {
	profilesState.profiles = profilesState.profiles.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p));
	persistProfiles();
}

export function getProfileCount(): number {
	return profilesState.profiles.length;
}
