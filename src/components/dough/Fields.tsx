import { useId } from "react";
import { limits, type NumericKey } from "../../core/dough/calculations";
export function NumberField({
  field,
  label,
  value,
  onChange,
  unit = "",
  slider = false,
  error,
}: {
  field: NumericKey;
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  slider?: boolean;
  error?: string;
}) {
  const id = useId();
  const [min, max, step] = limits[field];
  return (
    <div className="dough-field">
      <label htmlFor={id}>
        {label}
        {unit && <span>{unit}</span>}
      </label>
      <input
        id={id}
        type="number"
        inputMode={step < 1 ? "decimal" : "numeric"}
        min={min}
        max={max}
        step={step}
        value={Number.isNaN(value) ? "" : value}
        onChange={(event) =>
          onChange(event.target.value === "" ? NaN : event.target.valueAsNumber)
        }
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {slider && (
        <input
          type="range"
          aria-label={`${label} Schieberegler`}
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : min}
          onChange={(event) => onChange(event.target.valueAsNumber)}
        />
      )}{" "}
      {error && (
        <small id={`${id}-error`} className="field-error">
          {error}
        </small>
      )}
    </div>
  );
}
export function TextField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const id = useId();
  return (
    <div className="dough-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        maxLength={80}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
      />
      {error && <small className="field-error">{error}</small>}
    </div>
  );
}
