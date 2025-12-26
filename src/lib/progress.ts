export type WeekSlug = string;
export type PageSlug = "lesson-1" | "lesson-2" | "extra-practice" | "lab" | "homework";

export type WeekProgress = {
  viewed: Record<PageSlug, boolean>;
  selfMarked?: Record<"lab" | "homework", boolean>;
  lastUpdated?: string;
};

export type Progress = {
  weeks: Record<WeekSlug, WeekProgress>;
};

const STORAGE_KEY = "cis118m_progress_v1";
const defaultSelfMarked = () => ({ lab: false, homework: false });
const defaultWeek = (): WeekProgress => ({
  viewed: {
    "lesson-1": false,
    "lesson-2": false,
    "extra-practice": false,
    lab: false,
    homework: false,
  },
  selfMarked: defaultSelfMarked(),
  lastUpdated: new Date().toISOString(),
});

const defaultProgress = (): Progress => ({ weeks: {} });

const safeStorage = () => {
  if (typeof localStorage === "undefined") return null;
  return localStorage;
};

const hydrate = (raw: unknown): Progress => {
  if (!raw || typeof raw !== "object") return defaultProgress();
  const maybe = raw as Progress;
  if (!maybe.weeks || typeof maybe.weeks !== "object") return defaultProgress();
  return maybe;
};

export const loadProgress = (store = safeStorage()): Progress => {
  if (!store) return defaultProgress();
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    return hydrate(JSON.parse(raw));
  } catch (err) {
    return defaultProgress();
  }
};

export const saveProgress = (progress: Progress, store = safeStorage()): Progress => {
  if (!store) return progress;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    // ignore storage errors
  }
  return progress;
};

const ensureWeek = (progress: Progress, week: string): WeekProgress => {
  const slug = week.padStart(2, "0");
  if (!progress.weeks[slug]) {
    progress.weeks[slug] = defaultWeek();
  }
  return progress.weeks[slug];
};

export const markViewed = (
  week: string,
  page: PageSlug,
  store = safeStorage()
): Progress => {
  const progress = loadProgress(store);
  const wp = ensureWeek(progress, week);
  if (!wp.viewed) wp.viewed = defaultWeek().viewed;
  wp.viewed[page] = true;
  wp.lastUpdated = new Date().toISOString();
  return saveProgress(progress, store);
};

export const markSelfMarked = (
  week: string,
  page: "lab" | "homework",
  value = true,
  store = safeStorage()
): Progress => {
  const progress = loadProgress(store);
  const wp = ensureWeek(progress, week);
  if (!wp.selfMarked) wp.selfMarked = defaultSelfMarked();
  wp.selfMarked[page] = value;
  wp.lastUpdated = new Date().toISOString();
  return saveProgress(progress, store);
};

export const getWeekProgress = (week: string, store = safeStorage()): WeekProgress => {
  const progress = loadProgress(store);
  const wp = ensureWeek(progress, week);
  return {
    ...wp,
    viewed: { ...wp.viewed },
    selfMarked: { ...defaultSelfMarked(), ...(wp.selfMarked || {}) },
  };
};
