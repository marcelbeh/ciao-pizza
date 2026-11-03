import { useState, type ReactNode } from "react";
import "../../modules/teigstudio/studio.css";
import "./planning.css";
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="dough-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Numeric({
  label,
  value,
  onChange,
  min = 0,
  max = 100000,
  step = "any",
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number | string;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        inputMode="decimal"
        required
        min={min}
        max={max}
        step={step}
        value={Number.isNaN(value) ? "" : value}
        onChange={(e) =>
          onChange(e.target.value === "" ? NaN : Number(e.target.value))
        }
      />
    </Field>
  );
}
export function useAction() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(
    action: () => Promise<unknown>,
    success = "Lokal gespeichert.",
  ) {
    setBusy(true);
    try {
      await action();
      setMessage(success);
    } catch (e) {
      setMessage(
        e instanceof Error && e.name === "QuotaExceededError"
          ? "Der lokale Gerätespeicher ist voll. Dein Entwurf bleibt sichtbar. Bitte Fotos im Entwurf reduzieren und gespeicherte Daten extern sichern."
          : e instanceof Error
            ? e.message
            : "Speichern fehlgeschlagen.",
      );
    } finally {
      setBusy(false);
    }
  }
  return {
    run,
    busy,
    message,
    feedback: message ? (
      <p role="status" className="dough-note">
        {message}
      </p>
    ) : null,
  };
}
