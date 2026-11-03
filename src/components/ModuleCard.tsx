import { Link } from "react-router-dom";
import type { Module } from "../modules/registry";
import { Icon } from "./Icon";
const copy: Record<string, [string, string]> = {
  "pizza-pilot": ["Pizza-Pilot", "Teig planen"],
  teigstudio: ["Teigstudio", "Deine Rezeptur"],
  "reife-monitor": ["Reife-Monitor", "In Vorbereitung"],
  rezeptbibliothek: ["Rezepte", "Deine Pizzen"],
  "pizzaabend-planer": ["Pizzaabend", "Planen & vorbereiten"],
  backcoach: ["Backcoach", "Schritt für Schritt"],
  "teig-doc": ["Teig-Doc", "Probleme verstehen"],
  "pizza-tagebuch": ["Tagebuch", "Backergebnisse"],
  einkaufsliste: ["Einkaufsliste", "Zutaten & Mengen"],
};
export function ModuleCard({ module }: { module: Module; index: number }) {
  const [title, description] = copy[module.id] ?? [
    module.title,
    module.description,
  ];
  return (
    <Link to={module.path} className="module-card">
      <span className="icon-tile">
        <Icon name={module.icon} />
      </span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <Icon name="chevron" className="card-chevron" />
    </Link>
  );
}
