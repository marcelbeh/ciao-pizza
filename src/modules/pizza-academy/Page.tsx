import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Field } from "../../components/planning/Shared";
import {
  articles,
  categories,
  searchArticles,
  sources,
  contentVersion,
  type Category,
} from "../../core/academy/library";
import { academyPath } from "../../core/academy/links";
import "./academy.css";
export default function Page() {
  const [params, setParams] = useSearchParams();
  const articleId = params.get("artikel");
  const article = articles.find((a) => a.id === articleId);
  const sectionId = params.get("abschnitt");
  const heading = useRef<HTMLHeadingElement>(null);
  const query = params.get("suche") ?? "";
  const category = categories.find((c) => c === params.get("kategorie"));
  const results = searchArticles(query, category);
  useEffect(() => {
    if (!articleId) return;
    const target =
      sectionId && article?.sections.some((s) => s.id === sectionId)
        ? document.getElementById(`academy-${sectionId}`)
        : heading.current;
    target?.focus();
    target?.scrollIntoView?.({ block: "start" });
  }, [articleId, sectionId, article]);
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }
  return (
    <div className="academy">
      <div className="page-intro">
        <p className="eyebrow">SAPERE · WISSEN MIT GESCHMACK</p>
        <h1>Pizza-Academy</h1>
        <p>
          Ein bisschen mehr verstehen. Mit Ruhe besser backen. Alle Artikel
          bleiben nach dem vollständigen Laden der App auch offline verfügbar.
        </p>
      </div>
      {articleId ? (
        article ? (
          <article className="dough-panel academy-article">
            <Link className="text-button" to="/pizza-academy">
              ← Zur Wissensbibliothek
            </Link>
            <p className="eyebrow">{article.category}</p>
            <h2 ref={heading} tabIndex={-1}>
              {article.title}
            </h2>
            <p className="academy-summary">{article.summary}</p>
            <nav aria-label="Artikelabschnitte">
              <ul>
                {article.sections.map((s) => (
                  <li key={s.id}>
                    <Link to={academyPath(article.id, s.id)}>{s.title}</Link>
                  </li>
                ))}
              </ul>
            </nav>
            {article.sections.map((s) => (
              <section key={s.id} aria-labelledby={`academy-${s.id}`}>
                <h3 id={`academy-${s.id}`} tabIndex={-1}>
                  {s.title}
                </h3>
                {s.paragraphs.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </section>
            ))}
            <aside className="academy-sources">
              <h3>Quellen & Einordnung</h3>
              <p>
                Redaktionell zusammengefasst für Weizen-Pizzateige. Zahlen sind
                Richtwerte; Mehl, Gerät und Teigzustand entscheiden mit. Externe
                Originalquellen benötigen Internet.
              </p>
              <ul>
                {article.sourceIds.map((id) => {
                  const source = sources[id as keyof typeof sources];
                  return (
                    <li key={id}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {source.title} ↗
                      </a>
                    </li>
                  );
                })}
              </ul>
              <small>Inhaltsstand: {contentVersion.split(".")[0]}</small>
            </aside>
          </article>
        ) : (
          <section className="dough-panel">
            <h2>Artikel nicht gefunden</h2>
            <p>Dieser Wissenslink ist nicht mehr gültig.</p>
            <Link className="button secondary" to="/pizza-academy">
              Zur Wissensbibliothek
            </Link>
          </section>
        )
      ) : (
        <>
          <section className="dough-panel" aria-label="Wissen finden">
            <div className="form-grid">
              <Field label="Wissen durchsuchen">
                <input
                  type="search"
                  value={query}
                  maxLength={200}
                  placeholder="Zum Beispiel W-Wert oder Stückgare"
                  onChange={(e) => filter("suche", e.target.value)}
                />
              </Field>
              <Field label="Kategorie">
                <select
                  value={category ?? ""}
                  onChange={(e) =>
                    filter("kategorie", e.target.value as Category)
                  }
                >
                  <option value="">Alle Themen</option>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>
            <p role="status">{results.length} Artikel gefunden</p>
            {(query || category) && (
              <button
                className="text-button"
                onClick={() => setParams({}, { replace: true })}
              >
                Filter zurücksetzen
              </button>
            )}
          </section>
          <div className="academy-grid">
            {results.map((a) => (
              <article className="dough-panel" key={a.id}>
                <p className="eyebrow">{a.category}</p>
                <h2>
                  <Link to={academyPath(a.id)}>{a.title}</Link>
                </h2>
                <p>{a.summary}</p>
                <Link className="text-button" to={academyPath(a.id)}>
                  Artikel lesen →
                </Link>
              </article>
            ))}
          </div>
          {!results.length && (
            <div className="dough-panel">
              <h2>Noch kein Treffer</h2>
              <p>
                Versuche einen kürzeren Begriff oder eine andere Kategorie.
                Gesucht wird auch in den Artikeltexten.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
