import type { Profile } from '$lib/types';
import type { ScooterConfig } from '$lib/types';

export const profilesStore = $state({
  profiles: [] as Profile[],
  isLoaded: false
});

// Load profiles from localStorage
export function loadProfiles() {
  if (typeof localStorage === 'undefined') {
    profilesStore.isLoaded = true;
    return;
  }

  try {
    const saved = localStorage.getItem('scooterProfiles');
    if (saved) {
      profilesStore.profiles = JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load profiles:', e);
    profilesStore.profiles = [];
  }
  profilesStore.isLoaded = true;
}

// Save profiles to localStorage
export function saveProfile(name: string, config: ScooterConfig) {
  const profile: Profile = {
    id: Date.now(),
    name,
    config: { ...config }
  };
  profilesStore.profiles = [...profilesStore.profiles, profile];
  saveToStorage();
}

export function deleteProfile(id: number) {
  profilesStore.profiles = profilesStore.profiles.filter(p => p.id !== id);
  saveToStorage();
}

export function updateProfile(id: number, name: string, config: ScooterConfig) {
  profilesStore.profiles = profilesStore.profiles.map(p =>
    p.id === id ? { ...p, name, config: { ...config } } : p
  );
  saveToStorage();
}

function saveToStorage() {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('scooterProfiles', JSON.stringify(profilesStore.profiles));
}

// Initialize on import
loadProfiles();
