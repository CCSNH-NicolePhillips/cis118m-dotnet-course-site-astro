export const padWeek = (week: string) => week.padStart(2, "0");

export const starterIdFor = (week: string, slug: string) => `week-${padWeek(week)}-${slug}`;

export const editorUrl = (week: string, slug: string) =>
  `/editor/?week=${padWeek(week)}&starter=${starterIdFor(week, slug)}`;

// Backward compatibility for existing calls
export const buildEditorUrl = editorUrl;
