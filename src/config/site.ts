export const COURSE = {
  code: "CIS118M",
  title: "Intro to .NET",
  term: "Spring 2026",
  crn: "20754",
  instructorEmail: "MCCCISOnline1@ccsnh.edu",
  // Optional: link your browser editor/runner once Step 5 is ready
  editorUrl: "/editor/?week=01",
};

export const WEEKS = Array.from({ length: 16 }, (_, i) => {
  const n = i + 1;
  const slug = String(n).padStart(2, "0");
  return {
    n,
    slug,
    title: `Week ${n}`,
    href: `/week-${slug}/`,
    lesson1: `/week-${slug}/lesson-1/`,
    lesson2: `/week-${slug}/lesson-2/`,
    extra: `/week-${slug}/extra-practice/`,
  };
});
