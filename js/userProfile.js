/**
 * @copyright (c) 2026 Raj Kishor Mahapatra. All rights reserved.
 * @author Raj Kishor Mahapatra
*/

const STORAGE_ACTIVE_USER = 'snake_raja_active_user';
const STORAGE_SAVED_PROFILES = 'snake_raja_saved_accounts';

export function loadActiveProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_ACTIVE_USER);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore error
  }
  const defaultProfile = {
    id: `usr_${Math.floor(Math.random() * 899999 + 100000)}`,
    username: 'Raja_Survivor',
    avatar: 'snake',
    level: 1,
    xp: 0,
    matchesPlayed: 0,
    wins: 0,
    highestScore: 0,
    totalKills: 0,
    createdDate: Date.now(),
  };
  saveActiveProfile(defaultProfile);
  return defaultProfile;
}

export function saveActiveProfile(profile) {
  try {
    localStorage.setItem(STORAGE_ACTIVE_USER, JSON.stringify(profile));
    saveProfileToAccountsList(profile);
  } catch {
    // Ignore error
  }
}

export function loadAllSavedProfiles() {
  try {
    const raw = localStorage.getItem(STORAGE_SAVED_PROFILES);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore error
  }
  const active = loadActiveProfile();
  const list = [active];
  saveAllProfiles(list);
  return list;
}

export function saveAllProfiles(profiles) {
  try {
    localStorage.setItem(STORAGE_SAVED_PROFILES, JSON.stringify(profiles));
  } catch {
    // Ignore error
  }
}

export function saveProfileToAccountsList(profile) {
  const all = loadAllSavedProfiles();
  const index = all.findIndex((p) => p.id === profile.id);
  if (index >= 0) {
    all[index] = profile;
  } else {
    all.push(profile);
  }
  saveAllProfiles(all);
}

export function loginUserProfile(username, avatar = 'snake') {
  const all = loadAllSavedProfiles();
  const cleanName = username.trim() || 'Raja_Survivor';
  const existing = all.find((p) => p.username.toLowerCase() === cleanName.toLowerCase());

  if (existing) {
    existing.avatar = avatar;
    saveActiveProfile(existing);
    return existing;
  }

  const newProfile = {
    id: `usr_${Date.now().toString(36)}`,
    username: cleanName,
    avatar,
    level: 1,
    xp: 0,
    matchesPlayed: 0,
    wins: 0,
    highestScore: 0,
    totalKills: 0,
    createdDate: Date.now(),
  };
  saveActiveProfile(newProfile);
  return newProfile;
}
