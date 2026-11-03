/** Stable hash-router targets, independent of the lazy-loaded article corpus. */
export function academyPath(article: string, section?: string) {
  return (
    "/pizza-academy?artikel=" +
    encodeURIComponent(article) +
    (section ? "&abschnitt=" + encodeURIComponent(section) : "")
  );
}
