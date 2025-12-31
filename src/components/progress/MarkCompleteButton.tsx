import { useEffect, useState } from "react";
import { getWeekProgress, markSelfMarked } from "../../lib/progress";

type Props = {
  week: string;
  slug: "lab" | "homework";
};

const MarkCompleteButton = ({ week, slug }: Props) => {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const wp = getWeekProgress(week);
    setDone(!!wp.selfMarked?.[slug]);
  }, [week, slug]);

  const toggle = () => {
    const next = !done;
    markSelfMarked(week, slug, next);
    setDone(next);
  };

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
