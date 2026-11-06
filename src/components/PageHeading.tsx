export function PageHeading({ title, description }: { title: string; description: string }) {
  return <div className="page-heading"><h1>{title}</h1><p className="muted">{description}</p></div>;
}
