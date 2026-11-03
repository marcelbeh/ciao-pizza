import { Link } from "react-router-dom";
import type { ModuleId } from "../modules/registry";
import { modules } from "../modules/registry";
import { Icon } from "./Icon";
export function ModulePlaceholder({ id }: { id: ModuleId }) {
  const module = modules.find((item) => item.id === id)!;
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">{module.eyebrow}</p>
        <h1>{module.title}</h1>
        <p>{module.description}</p>
      </div>
      <section className="placeholder">
        <span className="placeholder-icon">
          <Icon name={module.icon} />
        </span>
        <span className="phase-badge">In Vorbereitung</span>
        <h2>Hier entsteht etwas Gutes.</h2>
        <p>{module.preview}</p>
        <p className="placeholder-detail">
          Das Grundlayout steht. Die fachlichen Funktionen folgen in einer
          späteren Entwicklungsphase.
        </p>
        <Link className="button" to="/">
          Zurück zum Dashboard <Icon name="arrow" />
        </Link>
      </section>
    </>
  );
}
