import { Link } from "react-router-dom";
import type { Module } from "../modules/registry";
import { Icon } from "./Icon";
export function ModuleCard({
  module,
  index,
}: {
  module: Module;
  index: number;
}) {
  return (
    <Link to={module.path} className="module-card group">
      <div className="flex items-center justify-between">
        <span className="icon-tile">
          <Icon name={module.icon} />
        </span>
        <span className="card-number">{String(index).padStart(2, "0")}</span>
      </div>
      <h3>{module.title}</h3>
      <p>{module.description}</p>
      <span className="card-bottom">
        <span>
          {module.id === "pizza-pilot" || module.id === "teigstudio"
            ? "Öffnen"
            : "In Vorbereitung"}
        </span>
        <Icon name="arrow" />
      </span>
    </Link>
  );
}
