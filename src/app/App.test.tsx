import {
  configure,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { modules } from "../modules/registry";
import type { ReactNode } from "react";
vi.mock("./CloudWorkspace", async () => {
  const { LocalWorkspace } = await import("./LocalWorkspace");
  return {
    CloudWorkspace: ({ children }: { children: ReactNode }) => (
      <LocalWorkspace>{children}</LocalWorkspace>
    ),
  };
});
vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));
// Lazy route imports can exceed the library default on a busy local runner.
configure({ asyncUtilTimeout: 5000 });
beforeEach(() => {
  window.location.hash = "/";
});
describe("application routes", () => {
  it("shows all eleven modules and navigates to a placeholder", async () => {
    render(<App />);
    await screen.findByRole("heading", { level: 1, name: /Ein guter Tag/ });
    const navigation = screen.getByRole("navigation", {
      name: "Hauptnavigation",
    });
    expect(within(navigation).getAllByRole("link")).toHaveLength(11);
    fireEvent.click(
      within(navigation).getByRole("link", { name: "Teigstudio" }),
    );
    expect(
      await screen.findByRole("heading", { level: 1, name: "Teigstudio" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Stil & Menge" }),
    ).toBeInTheDocument();
  });
  it.each(modules.slice(1))("loads direct hash route $path", async (module) => {
    window.location.hash = module.path;
    render(<App />);
    expect(
      await screen.findByRole("heading", { level: 1, name: module.title }),
    ).toBeInTheDocument();
  });
  it("offers a route back for unknown URLs", async () => {
    window.location.hash = "/unbekannt";
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: /kein Tisch/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zum Dashboard" })).toHaveAttribute(
      "href",
      "#/",
    );
  });
  it("opens and closes the complete mobile navigation", async () => {
    render(<App />);
    await screen.findByRole("heading", { level: 1, name: /Ein guter Tag/ });
    fireEvent.click(
      within(
        screen.getByRole("navigation", { name: "Schnellnavigation" }),
      ).getByRole("button", { name: "Alle Module öffnen" }),
    );
    expect(
      within(
        screen.getByRole("navigation", { name: "Alle Module" }),
      ).getAllByRole("link"),
    ).toHaveLength(11);
    fireEvent.keyDown(screen.getByRole("navigation", { name: "Alle Module" }), {
      key: "Escape",
    });
    expect(
      screen.queryByRole("navigation", { name: "Alle Module" }),
    ).not.toBeInTheDocument();
  });
});
