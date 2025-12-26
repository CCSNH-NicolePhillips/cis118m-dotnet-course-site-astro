import { useEffect, useState } from "react";
import { getWeekProgress, PageSlug } from "../../lib/progress";

const labels: Record<PageSlug, string> = {
  "lesson-1": "Lesson 1",
  "lesson-2": "Lesson 2",
  "extra-practice": "Extra practice",
  lab: "Lab",
  homework: "Homework",
};

type Props = {
  week: string;
  items?: PageSlug[];
};

const ProgressBadge = ({ week, items = ["lesson-1", "lesson-2", "extra-practice", "lab", "homework"] }: Props) => {
  const [status, setStatus] = useState<Record<PageSlug, boolean>>({
    "lesson-1": false,
    "lesson-2": false,
    "extra-practice": false,
    lab: false,
    homework: false,
  });

  useEffect(() => {
    const wp = getWeekProgress(week);
    setStatus(wp.viewed);
  }, [week]);

  return (
    <div className="progress-badge">
      {items.map((slug) => (
        <span key={slug} className={status[slug] ? "pill done" : "pill todo"}>
          {status[slug] ? "✓" : "•"} {labels[slug]}
        </span>
      ))}
    </div>
  );
};

export default ProgressBadge;
