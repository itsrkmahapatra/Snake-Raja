/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

export interface UserProfile {
  id: string;
  username: string;
  avatar: 'snake' | 'skull' | 'robot';
  color: string;
  level: number;
  xp: number;
  wins: number;
  matchesPlayed: number;
  highestScore: number;
  totalKills: number;
  createdAt: number;
  lastLogin: number;
  isLoggedIn: boolean;
}

const STORAGE_KEY_ACTIVE = 'snake_raja_active_user';
const STORAGE_KEY_PROFILES = 'snake_raja_saved_accounts';

export const DEFAULT_AVATARS: ('snake' | 'skull' | 'robot')[] = ['snake', 'skull', 'robot'];

export function generateUserId(): string {
  return 'usr_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36).substring(4);
}

export function createDefaultProfile(username?: string, avatar: 'snake' | 'skull' | 'robot' = 'snake'): UserProfile {
  const finalName = username && username.trim()
    ? username.trim().substring(0, 16)
    : `Survivor_${Math.floor(Math.random() * 900 + 100)}`;

  return {
    id: generateUserId(),
    username: finalName,
    avatar,
    color: '#00ffff',
    level: 1,
    xp: 0,
    wins: 0,
    matchesPlayed: 0,
    highestScore: 0,
    totalKills: 0,
    createdAt: Date.now(),
    lastLogin: Date.now(),
    isLoggedIn: true,
  };
}

export function loadAllSavedProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (raw) {
      const parsed: UserProfile[] = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load saved accounts from device', e);
  }
  return [];
}

export function saveAllProfiles(profiles: UserProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  } catch (e) {
    console.error('Failed to save accounts to device', e);
  }
}

export function loadActiveProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE);
    if (raw) {
      const parsed: UserProfile = JSON.parse(raw);
      if (parsed && parsed.id) {
        parsed.lastLogin = Date.now();
        parsed.isLoggedIn = true;
        saveActiveProfile(parsed);
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load active user profile from device', e);
  }

  // Check if legacy name was stored
  const legacyName = localStorage.getItem('snake_raja_name');
  const legacyHead = (localStorage.getItem('snake_raja_head') as 'snake' | 'skull' | 'robot') || 'snake';
  const legacyXP = parseInt(localStorage.getItem('snake_raja_xp') || '0', 10);
  const legacyLevel = parseInt(localStorage.getItem('snake_raja_level') || '1', 10);

  const newProfile = createDefaultProfile(legacyName || undefined, legacyHead);
  newProfile.xp = legacyXP;
  newProfile.level = legacyLevel;

  saveActiveProfile(newProfile);
  return newProfile;
}

export function saveActiveProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(profile));
    localStorage.setItem('snake_raja_name', profile.username);
    localStorage.setItem('snake_raja_head', profile.avatar);
    localStorage.setItem('snake_raja_xp', profile.xp.toString());
    localStorage.setItem('snake_raja_level', profile.level.toString());

    // Update in all profiles list
    const profiles = loadAllSavedProfiles();
    const idx = profiles.findIndex((p) => p.id === profile.id || p.username.toLowerCase() === profile.username.toLowerCase());
    if (idx >= 0) {
      profiles[idx] = profile;
    } else {
      profiles.unshift(profile);
    }
    saveAllProfiles(profiles);
  } catch (e) {
    console.error('Failed to persist user profile on device', e);
  }
}

export function loginUserProfile(username: string, avatar: 'snake' | 'skull' | 'robot'): UserProfile {
  const cleanName = username.trim().substring(0, 16);
  const profiles = loadAllSavedProfiles();

  // Check if account already exists on device with this username
  let target = profiles.find((p) => p.username.toLowerCase() === cleanName.toLowerCase());
  if (target) {
    target.avatar = avatar;
    target.lastLogin = Date.now();
    target.isLoggedIn = true;
  } else {
    target = createDefaultProfile(cleanName, avatar);
    profiles.unshift(target);
  }

  saveActiveProfile(target);
  saveAllProfiles(profiles);
  return target;
}
