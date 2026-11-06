import type { ScheduleStep } from "../core/schedule/plan";

export function formatScheduleTime(iso: string) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long", day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  }).format(new Date(iso));
}
export function groupTimelineDays(steps: ScheduleStep[]) {
  const groups: { key: string; label: string; steps: ScheduleStep[] }[] = [];
  for (const step of steps) {
    const date = new Date(step.at);
    // Group by the device's local calendar day, not the UTC date stored in IndexedDB.
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const previous = groups.at(-1);
    if (previous?.key === key) previous.steps.push(step);
    else groups.push({ key, label: new Intl.DateTimeFormat("de-DE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    }).format(date), steps: [step] });
  }
  return groups;
}
function duration(step: ScheduleStep) {
  if (!step.endsAt) return null;
  const minutes = Math.round((Date.parse(step.endsAt) - Date.parse(step.at)) / 60000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours} Std.${rest ? ` ${rest} Min.` : ""}` : `${minutes} Min.`;
}
export function ScheduleTimeline({ steps, next }: { steps: ScheduleStep[]; next: ScheduleStep[] }) {
  const days = groupTimelineDays(steps);
  return <ol className="schedule-timeline" aria-label="Zeitstrahl nach Tagen">
    {days.map(day => <li key={day.key} className="timeline-day">
      <h3 className="timeline-day-heading"><time dateTime={day.key}>{day.label}</time></h3>
      <ol className="schedule-steps" aria-label={`Schritte am ${day.label}`}>
        {day.steps.map(step => {
          const isNext = next.some(item => item.id === step.id);
          return <li key={step.id} className={`${isNext ? "next-step" : ""} ${step.id === "bake" ? "bake-step" : ""}`}>
            <div className="timeline-step-heading">
              <time dateTime={step.at}>{new Intl.DateTimeFormat("de-DE", {
                hour: "2-digit", minute: "2-digit", timeZoneName: "short",
              }).format(new Date(step.at))}</time>
              {isNext && <span className="timeline-next-label">Als Nächstes geplant</span>}
            </div>
            <h4>{step.label}</h4>
            {(step.endsAt || step.temperatureC !== undefined) && <p className="timeline-details">
              {duration(step)}{step.temperatureC !== undefined ? ` · ${step.temperatureC} °C` : ""}
            </p>}
            {step.endsAt && <p className="muted timeline-end">Bis <time dateTime={step.endsAt}>{formatScheduleTime(step.endsAt)}</time></p>}
          </li>;
        })}
      </ol>
    </li>)}
  </ol>;
}
