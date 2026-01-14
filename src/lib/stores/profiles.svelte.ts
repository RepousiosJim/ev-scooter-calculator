import type { Profile, ScooterConfig } from '$lib/types';
import { defaultConfig } from '$lib/data/presets';
import { normalizeConfig } from '$lib/utils/validators';


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
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        profilesStore.profiles = parsed
          .map((profile, index) => normalizeProfile(profile, index))
          .filter((profile): profile is Profile => profile !== null);
      } else {
        profilesStore.profiles = [];
      }
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
    config: normalizeConfig(config, defaultConfig)
  };
  profilesStore.profiles = [...profilesStore.profiles, profile];
  saveToStorage();
}

export function deleteProfile(id: number) {
  profilesStore.profiles = profilesStore.profiles.filter(p => p.id !== id);
  saveToStorage();
}

export function updateProfile(id: number, name: string, config: ScooterConfig) {
  const normalizedConfig = normalizeConfig(config, defaultConfig);
  profilesStore.profiles = profilesStore.profiles.map(p =>
    p.id === id ? { ...p, name, config: normalizedConfig } : p
  );
  saveToStorage();
}

function normalizeProfile(raw: unknown, index: number): Profile | null {
  if (!raw || typeof raw !== 'object') return null;

  const candidate = raw as Partial<Profile>;
  const name = typeof candidate.name === 'string'
    ? candidate.name
    : `Profile ${index + 1}`;
  const id = typeof candidate.id === 'number'
    ? candidate.id
    : Date.now() + index;
  const config = normalizeConfig(candidate.config ?? {}, defaultConfig);

  return { id, name, config };
}

function saveToStorage() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem('scooterProfiles', JSON.stringify(profilesStore.profiles));
  } catch (e) {
    console.error('Failed to save profiles:', e);
  }
}

// Initialize on import
loadProfiles();
