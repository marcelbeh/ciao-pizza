import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App } from "./App";
import { defaults } from "../core/dough/forno";
import type { FornoRepository } from "../infrastructure/storage/fornoRepository";
import { createFornoRepository } from "../infrastructure/storage/fornoRepository";
import { createIndexedDbStore } from "../infrastructure/storage/indexedDbStore";
import { createSchedule } from "../core/schedule/plan";

vi.mock("../infrastructure/pwa/PwaNotice", () => ({ PwaNotice: () => null }));
function repository(): FornoRepository {
  return {
    pizzaNight: createFornoRepository(createIndexedDbStore(`p3-mock-${crypto.randomUUID()}`)).pizzaNight,
    load: vi.fn().mockResolvedValue({ pizzaNight: { version: 1, recipes: [], evening: null }, pizzaNightError: "", formula: { ...defaults, count: 6, hydration: 67.5, flourProfile: "Mein gespeichertes Mehl" }, evening: null, copied: false, hasLegacy: true, schedule: null, scheduleError: "" }),
    save: vi.fn().mockResolvedValue(undefined),
    saveSchedule: vi.fn().mockResolvedValue(undefined),
    backup: vi.fn().mockResolvedValue({ format: "forno-preserved-data", version: 1, entries: { "ciao-workspace:v2": { recipes: [{ name: "Original" }] } } }),
  };
}
beforeEach(() => { window.location.hash = "#/"; });
describe("FORNO. cinematic navigation and preserved features", () => {
  it("shows saved values and five real navigation destinations without writing on load", async () => {
    const repo = repository(); render(<App repo={repo} />);
    await screen.findByRole("heading", { name: "Aktuelle Teigplanung" });
    expect(screen.getByText("Mein gespeichertes Mehl")).toBeVisible();
    expect(screen.getByText("67,5")).toBeVisible();
    const links = within(screen.getByRole("navigation", { name: "Hauptnavigation" })).getAllByRole("link");
    expect(links.map(link => link.textContent)).toEqual(["Home", "Teig", "Zeitplan", "Pizzaabend", "Rezepte"]);
    expect(links[0]).toHaveAttribute("aria-current", "page");
    expect(repo.save).not.toHaveBeenCalled();
    fireEvent.click(links[4]);
    expect(await screen.findByRole("heading", { name: "Rezepte" })).toBeVisible();
    expect(screen.getByText(/Noch keine Belagrezepte/)).toBeVisible();
    expect(repo.save).not.toHaveBeenCalled();
  });
  it("keeps editing, comma decimals, ingredient calculation and invalid-input protection working", async () => {
    const repo = repository(); render(<App repo={repo} />);
    fireEvent.click(await screen.findByRole("link", { name: "Bearbeiten" }));
    const count = await screen.findByRole("textbox", { name: /Pizzaanzahl/ });
    fireEvent.change(count, { target: { value: "9" } });
    await waitFor(() => expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ count: 9 })));
    fireEvent.change(screen.getByRole("textbox", { name: /^Hydration/ }), { target: { value: "68,5" } });
    await waitFor(() => expect(repo.save).toHaveBeenLastCalledWith(expect.objectContaining({ count: 9, hydration: 68.5 })));
    const calls = vi.mocked(repo.save).mock.calls.length;
    fireEvent.change(count, { target: { value: "" } });
    expect(count).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/Es werden keine ungültigen Mengen berechnet/)).toBeVisible();
    expect(vi.mocked(repo.save).mock.calls).toHaveLength(calls);
  });
  it("opens ingredients from quick access and exposes settings and the unchanged full JSON backup", async () => {
    const repo = repository();
    const scroll = vi.fn(); Element.prototype.scrollIntoView = scroll;
    const create = vi.fn().mockReturnValue("blob:backup");
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<App repo={repo} />);
    fireEvent.click(await screen.findByRole("link", { name: "Zutaten" }));
    await waitFor(() => expect(screen.getByRole("region", { name: "Deine Zutaten" })).toHaveFocus());
    expect(scroll).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("link", { name: "Einstellungen" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sicherung herunterladen" }));
    await waitFor(() => expect(repo.backup).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });
  it("retains the backup escape hatch when saved data cannot be read", async () => {
    const repo = repository(); vi.mocked(repo.load).mockRejectedValue(Error("Gespeicherte Daten sind nicht lesbar."));
    render(<App repo={repo} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("nicht lesbar");
    expect(screen.getByRole("button", { name: "Sicherung herunterladen" })).toBeEnabled();
    expect(repo.save).not.toHaveBeenCalled();
  });
});

describe("P2 schedule integration", () => {
  it("previews edits, saves explicitly and exposes the next planned step on Home without touching the formula", async () => {
    const repo = repository(); window.location.hash = "#/zeitplan";
    render(<App repo={repo} />);
    const bulk = await screen.findByRole("textbox", { name: /^Stockgare im Raum/ });
    fireEvent.change(bulk, { target: { value: "3,5" } });
    expect(screen.getByRole("heading", { name: "Vorschau deiner Schritte" })).toBeVisible();
    expect(repo.saveSchedule).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Zeitplan speichern" }));
    await screen.findByText("Zeitplan auf diesem Gerät gespeichert.");
    expect(repo.saveSchedule).toHaveBeenCalledWith(expect.objectContaining({ bulkHours: 3.5, method: "cold" }));
    fireEvent.click(screen.getByRole("link", { name: "Home" }));
    expect(await screen.findByText("Teig mischen und kneten")).toBeVisible();
    expect(repo.save).not.toHaveBeenCalled();
  });
  it("restores a real IndexedDB schedule after unmount and keeps calculator settings", async () => {
    const db = createIndexedDbStore(`p2-ui-${crypto.randomUUID()}`);
    const repo = createFornoRepository(db);
    await repo.save({ ...defaults, count: 11 });
    window.location.hash = "#/zeitplan";
    const view = render(<App repo={repo} />);
    const date = await screen.findByLabelText("Backdatum und Uhrzeit");
    fireEvent.change(date, { target: { value: "2027-01-10T18:00" } });
    fireEvent.change(screen.getByRole("textbox", { name: /^Stockgare im Raum/ }), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Zeitplan speichern" }));
    await screen.findByText("Zeitplan auf diesem Gerät gespeichert.");
    view.unmount();
    render(<App repo={createFornoRepository(db)} />);
    expect(await screen.findByLabelText("Backdatum und Uhrzeit")).toHaveValue("2027-01-10T18:00");
    expect(screen.getByRole("textbox", { name: /^Stockgare im Raum/ })).toHaveValue("4");
    expect((await repo.load()).formula.count).toBe(11);
  });
  it("blocks invalid input and lets a failed write be retried with the draft intact", async () => {
    const repo = repository(); window.location.hash = "#/zeitplan";
    vi.mocked(repo.saveSchedule).mockRejectedValueOnce(Error("Storage full"));
    render(<App repo={repo} />);
    const bulk = await screen.findByRole("textbox", { name: /^Stockgare im Raum/ });
    fireEvent.change(bulk, { target: { value: "" } });
    expect(bulk).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Zeitplan speichern" })).toBeDisabled();
    expect(repo.saveSchedule).not.toHaveBeenCalled();
    fireEvent.change(bulk, { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Zeitplan speichern" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("nicht gespeichert");
    expect(bulk).toHaveValue("3");
    fireEvent.click(screen.getByRole("button", { name: "Zeitplan speichern" }));
    await screen.findByText("Zeitplan auf diesem Gerät gespeichert.");
    expect(repo.saveSchedule).toHaveBeenCalledTimes(2);
  });
  it("switches to room-only planning even after an invalid hidden cold input", async () => {
    const repo = repository(); window.location.hash = "#/zeitplan";
    render(<App repo={repo} />);
    fireEvent.change(await screen.findByRole("textbox", { name: /^Kühlschrankphase/ }), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Teigführung"), { target: { value: "direct" } });
    expect(screen.queryByRole("textbox", { name: /^Kühlschrankphase/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zeitplan speichern" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Zeitplan speichern" }));
    await screen.findByText("Zeitplan auf diesem Gerät gespeichert.");
    expect(repo.saveSchedule).toHaveBeenCalledWith(expect.objectContaining({ method: "direct", coldHours: 24 }));
  });
  it("blocks an empty date without discarding a previously stored plan", async () => {
    const repo = repository(); const loaded = await repo.load(); const saved = createSchedule();
    vi.mocked(repo.load).mockResolvedValue({ ...loaded, schedule: saved });
    window.location.hash = "#/zeitplan"; render(<App repo={repo} />);
    const date = await screen.findByLabelText("Backdatum und Uhrzeit");
    fireEvent.change(date, { target: { value: "" } });
    expect(date).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Änderungen speichern" })).toBeDisabled();
    expect(repo.saveSchedule).not.toHaveBeenCalled();
    expect((await repo.load()).schedule).toEqual(saved);
  });
  it("shows a persisted schedule error without blocking the calculator", async () => {
    const repo = repository(); const loaded = await repo.load();
    vi.mocked(repo.load).mockResolvedValue({ ...loaded, scheduleError: "Zeitplan nicht lesbar; Sicherung herunterladen." });
    window.location.hash = "#/zeitplan"; render(<App repo={repo} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("nicht lesbar");
    fireEvent.click(screen.getByRole("link", { name: "Teig" }));
    expect(await screen.findByRole("textbox", { name: /Pizzaanzahl/ })).toBeVisible();
    expect(repo.saveSchedule).not.toHaveBeenCalled();
  });
  it("does not report past planned events as completed work", async () => {
    const repo = repository(); const loaded = await repo.load();
    vi.mocked(repo.load).mockResolvedValue({ ...loaded, schedule: createSchedule(Date.now() - 72 * 3600000) });
    render(<App repo={repo} />);
    expect(await screen.findByText("Backtermin erreicht. Zeitplan bei Bedarf aktualisieren.")).toBeVisible();
    expect(screen.queryByText(/erledigt|abgeschlossen/i)).not.toBeInTheDocument();
  });
});
