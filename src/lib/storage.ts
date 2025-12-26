const KEY_PREFIX = "cis118m-editor:";

const isBrowser = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

export const storageKey = (starterId: string) => `${KEY_PREFIX}${starterId}`;

export const loadSavedCode = (starterId: string): string | null => {
  if (!isBrowser()) return null;
  return localStorage.getItem(storageKey(starterId));
};

export const saveCode = (starterId: string, code: string) => {
  if (!isBrowser()) return;
  localStorage.setItem(storageKey(starterId), code);
};

export const resetCode = (starterId: string) => {
  if (!isBrowser()) return;
  localStorage.removeItem(storageKey(starterId));
};
