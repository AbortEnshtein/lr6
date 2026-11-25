import defaultProfile from '@/data/default-profile.json';
import { db } from './store.js';
import { validateProfile } from './validation.js';

const KEY = 'profile';

export async function getProfile() {
  const stored = await db.get(KEY);
  return stored ? { ...defaultProfile, ...stored } : defaultProfile;
}

export async function saveProfile(input) {
  const profile = { ...validateProfile(input), updatedAt: new Date().toISOString() };
  await db.set(KEY, profile);
  return profile;
}
