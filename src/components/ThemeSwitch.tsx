import { useSyncExternalStore } from "react";
import { Icon } from "./Icon";

type Choice = "light" | "dark" | "system";
declare global {
  interface Window {
    fornoTheme?: {
      getSnapshot: () => string;
      subscribe: (listener: () => void) => () => void;
      setChoice: (choice: Choice) => void;
      dispose: () => void;
    };
  }
}
const fallback = { getSnapshot: () => "system|light|false", subscribe: () => () => {}, setChoice: (_choice: Choice) => {} };
export function ThemeSwitch() {
  const controller = window.fornoTheme ?? fallback;
  const [choice, , persistent] = useSyncExternalStore(controller.subscribe, controller.getSnapshot).split("|");
  return <div className="theme-control">
    <fieldset className="theme-switch"><legend className="sr-only">Darstellung</legend>
      {([ ["light", "Hell", "sun"], ["dark", "Dunkel", "moon"], ["system", "System", "system"] ] as const).map(([value, label, icon]) =>
        <button key={value} type="button" title={label} aria-label={label} aria-pressed={choice === value}
          onClick={() => controller.setChoice(value)}><Icon name={icon} /><span>{label}</span></button>)}
    </fieldset>
    {persistent === "false" && window.fornoTheme && <p className="field-hint" role="status">Die Theme-Auswahl kann in diesem Browser nicht dauerhaft gespeichert werden.</p>}
  </div>;
}
