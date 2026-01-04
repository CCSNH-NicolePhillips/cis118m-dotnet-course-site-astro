import { useEffect, useState } from "react";
import { getWeekProgress, markSelfMarked } from "../../lib/progress";

type SlugType = "lab" | "homework" | "start-here" | "syllabus";

const MarkCompleteButton = () => {
  const [done, setDone] = useState(false);
  const [week, setWeek] = useState<string | null>(null);
  const [slug, setSlug] = useState<SlugType | null>(null);

  useEffect(() => {
    // Extract week and slug from URL path
    const path = window.location.pathname;
    const weekMatch = path.match(/\/week-(\d{2})\//);
    const slugMatch = path.match(/\/(lab-01|lab|homework|start-here|syllabus)\/?$/);
    
    if (weekMatch) {
      setWeek(weekMatch[1]);
    }
    if (slugMatch) {
      // Normalize lab-01 to lab
      const rawSlug = slugMatch[1];
      setSlug(rawSlug === "lab-01" ? "lab" : rawSlug as SlugType);
    }
  }, []);

  useEffect(() => {
    if (!week || !slug) return;
    // Only lab and homework are tracked in selfMarked
    if (slug === "lab" || slug === "homework") {
      const wp = getWeekProgress(week);
      setDone(!!wp.selfMarked?.[slug]);
    }
  }, [week, slug]);

  const toggle = () => {
    if (!week || !slug) return;
    if (slug !== "lab" && slug !== "homework") return;
    
    const next = !done;
    markSelfMarked(week, slug, next);
    setDone(next);
  };

  // Don't render until we have week info
  if (!week) return null;

  return (
    <button 
      className={`mark-complete-button ${done ? 'completed' : ''}`}
      onClick={toggle} 
      aria-pressed={done}
    >
      {done ? "✓ Marked complete" : "Mark complete"}
    </button>
  );
};

export default MarkCompleteButton;
export { MarkCompleteButton };
