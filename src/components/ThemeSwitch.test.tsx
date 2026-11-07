import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "../app/App";
import { createFornoRepository } from "../infrastructure/storage/fornoRepository";
import { createIndexedDbStore } from "../infrastructure/storage/indexedDbStore";
import { defaults } from "../core/dough/forno";
import { createSchedule } from "../core/schedule/plan";

vi.mock("../infrastructure/pwa/PwaNotice", () => ({ PwaNotice: () => null }));
const source = readFileSync("public/theme-init.js", "utf8");
function bootstrap({ saved = null as string | null, dark = false, blocked = false, doc = document.implementation.createHTMLDocument() } = {}) {
  doc.head.innerHTML += '<meta name="theme-color"><meta name="apple-mobile-web-app-status-bar-style">';
  const values = new Map<string, string>(saved === null ? [] : [["forno:theme:v1", saved]]);
  const systemListeners = new Set<() => void>();
  const storageListeners = new Set<(event: { key: string | null; newValue: string | null }) => void>();
  const media = { matches: dark, addEventListener: (_: string, fn: () => void) => systemListeners.add(fn), removeEventListener: (_: string, fn: () => void) => systemListeners.delete(fn) };
  const setItem = vi.fn((key: string, value: string) => { if (blocked) throw Error("Unavailable"); values.set(key, value); });
  const fake = {
    localStorage: { getItem: (key: string) => { if (blocked) throw Error("Unavailable"); return values.get(key) ?? null; }, setItem },
    matchMedia: () => media,
    addEventListener: (_: string, fn: (event: { key: string | null; newValue: string | null }) => void) => storageListeners.add(fn),
    removeEventListener: (_: string, fn: (event: { key: string | null; newValue: string | null }) => void) => storageListeners.delete(fn),
    fornoTheme: undefined as Window["fornoTheme"],
  };
  new Function("window", "document", source)(fake, doc);
  return { api: fake.fornoTheme!, doc, values, setItem,
    system: (value: boolean) => { media.matches = value; systemListeners.forEach(fn => fn()); },
    storage: (key: string | null, newValue: string | null) => storageListeners.forEach(fn => fn({ key, newValue })),
  };
}
afterEach(() => { window.fornoTheme?.dispose(); delete window.fornoTheme; });
describe("Theme bootstrap before app paint", () => {
  it("meets text and form-boundary contrast thresholds in both palettes", () => {
    const css = readFileSync("src/styles.css", "utf8");
    const luminance = (hex: string) => {
      const rgb = hex.match(/[a-f0-9]{2}/gi)!.map(v => parseInt(v, 16) / 255)
        .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
      return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    };
    for (const selector of [":root {", ":root[data-theme='dark'] {"]) {
      const block = css.split(selector)[1].split("}")[0];
      const color = (name: string) => block.match(new RegExp(`--${name}:\\s*(#[A-Fa-f0-9]{6})`))![1];
      const contrast = (a: string, b: string) => {
        const values = [luminance(color(a)), luminance(color(b))].sort((x, y) => y - x);
        return (values[0] + .05) / (values[1] + .05);
      };
      for (const text of ["text", "text-secondary", "accent", "error"]) expect(contrast(text, "surface")).toBeGreaterThanOrEqual(4.5);
      expect(contrast("button-text", "button-bg")).toBeGreaterThanOrEqual(4.5);
      expect(contrast("control-border", "field-bg")).toBeGreaterThanOrEqual(3);
    }
  });
  it("defaults to the OS synchronously without writing a preference", () => {
    const t = bootstrap({ dark: true });
    expect(t.doc.documentElement.dataset.theme).toBe("dark");
    expect(t.doc.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#1B1B1B");
    expect(t.api.getSnapshot()).toBe("system|dark|true");
    expect(t.setItem).not.toHaveBeenCalled();
    t.api.dispose();
  });
  it("applies the persisted manual preference before React and restores it on another startup", () => {
    const t = bootstrap({ saved: "light", dark: true });
    expect(t.doc.documentElement.dataset.theme).toBe("light");
    t.api.setChoice("dark");
    expect(t.values.get("forno:theme:v1")).toBe("dark");
    expect(t.doc.documentElement.style.colorScheme).toBe("dark");
    const restarted = bootstrap({ saved: t.values.get("forno:theme:v1")! });
    expect(restarted.doc.documentElement.dataset.theme).toBe("dark");
    t.api.dispose(); restarted.api.dispose();
  });
  it("tracks OS changes only in System mode and updates browser/iPhone colors", () => {
    const t = bootstrap(); t.system(true);
    expect(t.doc.documentElement.dataset.theme).toBe("dark");
    t.api.setChoice("light"); t.system(false); t.system(true);
    expect(t.doc.documentElement.dataset.theme).toBe("light");
    expect(t.doc.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.getAttribute("content")).toBe("default");
    expect(t.doc.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#F9F6F1");
    t.api.setChoice("system"); expect(t.doc.documentElement.dataset.theme).toBe("dark"); t.api.dispose();
  });
  it("isolates theme storage and handles cross-tab changes and unavailable storage", () => {
    const t = bootstrap({ saved: "garbage" });
    t.api.setChoice("dark"); expect([...t.values.keys()]).toEqual(["forno:theme:v1"]);
    t.storage("some-other-key", "light"); expect(t.doc.documentElement.dataset.theme).toBe("dark");
    t.storage("forno:theme:v1", "light"); expect(t.doc.documentElement.dataset.theme).toBe("light");
    const blocked = bootstrap({ blocked: true }); blocked.api.setChoice("dark");
    expect(blocked.api.getSnapshot()).toBe("dark|dark|false");
    t.api.dispose(); blocked.api.dispose();
  });
});
describe("Theme changes preserve app state", () => {
  it("keeps invalid calculator input and all IndexedDB data intact through all three choices", async () => {
    const t = bootstrap({ doc: document }); window.fornoTheme = t.api;
    const db = createIndexedDbStore(`theme-calculator-${crypto.randomUUID()}`); const repo = createFornoRepository(db);
    await repo.save(defaults); await repo.saveSchedule(createSchedule());
    const before = await db.entries!(); window.location.hash = "#/teig";
    render(<App repo={repo} />);
    const input = await screen.findByRole("textbox", { name: /Pizzaanzahl/ });
    fireEvent.change(input, { target: { value: "" } });
    for (const name of ["Dunkel", "Hell", "System"]) {
      fireEvent.click(screen.getByRole("button", { name }));
      expect(input).toHaveValue(""); expect(input).toHaveAttribute("aria-invalid", "true");
    }
    expect(await db.entries!()).toEqual(before);
  });
  it("keeps an unsaved schedule draft, timeline and navigation in both modes", async () => {
    const t = bootstrap({ doc: document }); window.fornoTheme = t.api;
    const db = createIndexedDbStore(`theme-schedule-${crypto.randomUUID()}`); const repo = createFornoRepository(db);
    window.location.hash = "#/zeitplan"; render(<App repo={repo} />);
    const input = await screen.findByRole("textbox", { name: /^Stockgare im Kühlschrank/ });
    fireEvent.change(input, { target: { value: "3,5" } });
    fireEvent.click(screen.getByRole("button", { name: "Dunkel" }));
    expect(input).toHaveValue("3,5"); expect(screen.getByRole("list", { name: "Zeitstrahl nach Tagen" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Hell" }));
    expect(input).toHaveValue("3,5"); expect((await repo.load()).schedule).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Home" }));
    await screen.findByRole("heading", { name: "Aktuelle Teigplanung" });
    fireEvent.click(screen.getByRole("link", { name: /Mein Journal/ }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Mein Journal" })).toBeVisible());
    expect(screen.getByText(/Eine Journalansicht ist noch nicht verfügbar/)).toBeVisible();
  });
});
