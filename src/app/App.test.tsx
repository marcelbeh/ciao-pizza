import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App } from "./App";
import { defaults } from "../core/dough/forno";
import type { FornoRepository } from "../infrastructure/storage/fornoRepository";

vi.mock("../infrastructure/pwa/PwaNotice", () => ({ PwaNotice: () => null }));
function repository(): FornoRepository {
  return {
    load: vi.fn().mockResolvedValue({ formula: { ...defaults, count: 6, hydration: 67.5, flourProfile: "Mein gespeichertes Mehl" }, evening: null, copied: false, hasLegacy: true }),
    save: vi.fn().mockResolvedValue(undefined),
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
    expect(screen.getByText(/Eine Rezeptansicht ist/)).toBeVisible();
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
