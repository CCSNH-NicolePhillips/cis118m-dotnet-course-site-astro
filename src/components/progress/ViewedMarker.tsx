import { useEffect } from "react";
import { markViewed } from "../../lib/progress";

type Props = {
  week: string;
  slug: "lesson-1" | "lesson-2" | "extra-practice" | "lab" | "homework";
};

const ViewedMarker = ({ week, slug }: Props) => {
  useEffect(() => {
    markViewed(week, slug);
  }, [week, slug]);
  return null;
};

export default ViewedMarker;
