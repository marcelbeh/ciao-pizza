import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { formatScheduleTime, groupTimelineDays, ScheduleTimeline } from "./ScheduleTimeline";
import type { ScheduleStep } from "../core/schedule/plan";

// Local constructors deliberately exercise the device calendar, independent of the runner zone.
const at = (day: number, hour: number) => new Date(2027, 0, day, hour).toISOString();
const steps: ScheduleStep[] = [
  { id: "mix", label: "Teig mischen und kneten", at: at(8, 20), endsAt: new Date(2027, 0, 8, 20, 20).toISOString() },
  { id: "cold-bulk", label: "Teig in den Kühlschrank", at: at(8, 22), endsAt: at(9, 22), temperatureC: 4 },
  { id: "balls", label: "Portionieren und Stückgare", at: at(9, 22), endsAt: at(10, 2), temperatureC: 22 },
  { id: "preheat", label: "Ofen vorheizen", at: at(10, 1), endsAt: at(10, 2) },
  { id: "bake", label: "Pizza backen", at: at(10, 2) },
];
describe("Day-grouped schedule timeline", () => {
  it("groups steps by local calendar days without changing order or stored timestamps", () => {
    const original = structuredClone(steps);
    const groups = groupTimelineDays(steps);
    expect(groups.map(day => day.key)).toEqual(["2027-01-08", "2027-01-09", "2027-01-10"]);
    expect(groups.map(day => day.label)).toEqual(["Freitag, 8. Januar 2027", "Samstag, 9. Januar 2027", "Sonntag, 10. Januar 2027"]);
    expect(groups.flatMap(day => day.steps)).toEqual(steps);
    expect(steps).toEqual(original);
  });
  it("renders a timeline, named weekdays, times and a clear next-step marker", () => {
    render(<ScheduleTimeline steps={steps} next={[steps[1]]} />);
    const timeline = screen.getByRole("list", { name: "Zeitstrahl nach Tagen" });
    expect(within(timeline).getByRole("heading", { name: "Freitag, 8. Januar 2027" })).toBeVisible();
    expect(within(timeline).getByRole("heading", { name: "Samstag, 9. Januar 2027" })).toBeVisible();
    expect(within(timeline).getByRole("heading", { name: "Sonntag, 10. Januar 2027" })).toBeVisible();
    expect(screen.getByText("Als Nächstes geplant")).toBeVisible();
    expect(screen.getByText("24 Std. · 4 °C")).toBeVisible();
    expect(screen.getByText("20 Min.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Pizza backen" })).toBeVisible();
    expect(timeline.querySelectorAll("time[datetime]").length).toBeGreaterThan(steps.length);
  });
  it("names weekdays in cross-day end times and Dashboard summaries as well", () => {
    expect(formatScheduleTime(at(9, 22))).toContain("Samstag");
    render(<ScheduleTimeline steps={steps} next={[]} />);
    expect(screen.getByText(formatScheduleTime(at(9, 22)))).toBeVisible();
    expect(screen.queryByText("Als Nächstes geplant")).not.toBeInTheDocument();
  });
  it("keeps simultaneous steps together under the same day", () => {
    const simultaneous = [steps[2], { ...steps[3], at: steps[2].at }];
    render(<ScheduleTimeline steps={simultaneous} next={simultaneous} />);
    expect(screen.getAllByText("Als Nächstes geplant")).toHaveLength(2);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(1);
    expect(groupTimelineDays([])).toEqual([]);
  });
});
