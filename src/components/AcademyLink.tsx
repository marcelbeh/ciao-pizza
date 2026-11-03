import { Link } from "react-router-dom";
import { academyPath } from "../core/academy/links";
export function AcademyLink({
  article,
  section,
  children,
}: {
  article: string;
  section?: string;
  children: React.ReactNode;
}) {
  return (
    <p className="academy-context">
      <Link to={academyPath(article, section)}>Academy · {children} →</Link>
    </p>
  );
}
