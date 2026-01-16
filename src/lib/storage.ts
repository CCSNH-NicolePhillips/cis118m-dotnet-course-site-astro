import type { StarterFile } from "./starters";

const KEY_PREFIX = "cis118m-editor:";

const isBrowser = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

export const storageKey = (starterId: string) => `${KEY_PREFIX}${starterId}`;

// Legacy single-file load (for backward compatibility)
export const loadSavedCode = (starterId: string): string | null => {
  if (!isBrowser()) return null;
  return localStorage.getItem(storageKey(starterId));
};

// Legacy single-file save
export const saveCode = (starterId: string, code: string) => {
  if (!isBrowser()) return;
  localStorage.setItem(storageKey(starterId), code);
};

// Multi-file storage key
export const multiFileStorageKey = (starterId: string) => `${KEY_PREFIX}files:${starterId}`;

// Load all files for a starter
export const loadSavedFiles = (starterId: string): StarterFile[] | null => {
  if (!isBrowser()) return null;
  const stored = localStorage.getItem(multiFileStorageKey(starterId));
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

// Save all files for a starter
export const saveFiles = (starterId: string, files: StarterFile[]) => {
  if (!isBrowser()) return;
  localStorage.setItem(multiFileStorageKey(starterId), JSON.stringify(files));
};

// Reset all files for a starter
export const resetCode = (starterId: string) => {
  if (!isBrowser()) return;
  localStorage.removeItem(storageKey(starterId));
  localStorage.removeItem(multiFileStorageKey(starterId));
};
