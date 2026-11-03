import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  HashRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { modules } from "../modules/registry";
import { Icon } from "../components/Icon";
import { PwaNotice } from "../infrastructure/pwa/PwaNotice";

const Dashboard = lazy(() => import("../modules/dashboard/DashboardPage"));
const pages = import.meta.glob<{ default: React.ComponentType }>(
  "../modules/*/Page.tsx",
);
const modulePages = modules.slice(1).map((module) => ({
  ...module,
  Page: lazy(pages[`../modules/${module.id}/Page.tsx`]),
}));

class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="fatal-error">
        <h1>Ein kurzer Zwischenstopp.</h1>
        <p>
          Die Ansicht konnte nicht geladen werden. Bitte versuche es erneut.
        </p>
        <button className="button" onClick={() => window.location.reload()}>
          Erneut laden
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function Shell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const current = modules.find((module) => module.path === location.pathname);
  useEffect(() => {
    document.title = `${current?.title ?? "Seite nicht gefunden"} · Ciao!`;
    setMenuOpen(false);
    document.getElementById("main-content")?.focus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname, current]);
  function closeMenu() {
    setMenuOpen(false);
    menuButton.current?.focus();
  }
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Zum Inhalt
      </a>
      <aside className="sidebar">
        <Link to="/" className="brand" aria-label="Ciao! Dashboard">
          Ciao!<span>LA TUA PIZZA. LA TUA PASSIONE.</span>
        </Link>
        <p className="nav-label">DEINE WERKSTATT</p>
        <nav aria-label="Hauptnavigation">
          {modules.map((module) => (
            <NavLink
              key={module.id}
              to={module.path}
              end
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon name={module.icon} />
              <span>{module.title}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="tricolore" />
          <p>
            Mit Gefühl. Mit Geduld.
            <br />
            <strong>Mit Ciao!</strong>
          </p>
          <small>VERSION 2.0 · FONDAMENTA</small>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <Link to="/" className="mobile-brand">
            Ciao!
          </Link>
          <span className="breadcrumb">
            Deine Werkstatt <span>/</span>{" "}
            <strong>{current?.title ?? "404"}</strong>
          </span>
          <span className="topbar-tag">
            <span /> Fatto con passione
          </span>
          <button
            ref={menuButton}
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Menü schließen" : "Alle Module öffnen"}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
        </header>
        {menuOpen && (
          <nav
            id="mobile-menu"
            className="mobile-menu"
            aria-label="Alle Module"
            onKeyDown={(event) => {
              if (event.key === "Escape") closeMenu();
            }}
          >
            {modules.map((module) => (
              <NavLink key={module.id} to={module.path} end onClick={closeMenu}>
                <Icon name={module.icon} />
                {module.title}
              </NavLink>
            ))}
          </nav>
        )}
        <main id="main-content" tabIndex={-1}>
          <Suspense
            fallback={
              <p role="status" className="loading">
                Deine Werkstatt wird geladen …
              </p>
            }
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              {modulePages.map(({ id, path, Page }) => (
                <Route key={id} path={path} element={<Page />} />
              ))}
              <Route
                path="*"
                element={
                  <section className="placeholder">
                    <p className="eyebrow">404 · KURZ VERLAUFEN</p>
                    <h1>Hier ist noch kein Tisch gedeckt.</h1>
                    <p>Diese Seite gibt es nicht.</p>
                    <Link className="button" to="/">
                      Zum Dashboard
                    </Link>
                  </section>
                }
              />
            </Routes>
          </Suspense>
        </main>
        <footer className="page-footer">
          <span>Ciao! · La tua pizza, la tua passione.</span>
          <span>Mit Liebe zum Handwerk.</span>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Schnellnavigation">
        {[modules[0], modules[1], modules[2], modules[4]].map((module) => (
          <NavLink key={module.id} to={module.path} end>
            <Icon name={module.icon} />
            <span>
              {module.id === "rezeptbibliothek" ? "Rezepte" : module.title}
            </span>
          </NavLink>
        ))}
        <button
          aria-label="Alle Module öffnen"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => {
            setMenuOpen(!menuOpen);
            menuButton.current?.focus();
          }}
        >
          <Icon name="menu" />
          <span>Mehr</span>
        </button>
      </nav>
      <PwaNotice />
    </div>
  );
}
export function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <Shell />
      </HashRouter>
    </ErrorBoundary>
  );
}
