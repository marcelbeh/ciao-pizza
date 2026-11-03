import {
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import { it, expect, vi } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { LocalWorkspace } from "./LocalWorkspace";
import { LocalRepository } from "../infrastructure/storage/localRepository";
import { createIndexedDbStore } from "../infrastructure/storage/indexedDbStore";
import Planner from "../modules/pizzaabend-planer/Page";
import Shopping from "../modules/einkaufsliste/Page";
import Recipes from "../modules/rezeptbibliothek/Page";
it("plans an evening offline, saves its snapshot, generates shopping and retains stock after reload", async () => {
  const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  const store = createIndexedDbStore("flow-" + crypto.randomUUID());
  const repo = new LocalRepository(store);
  const view = render(
    <MemoryRouter initialEntries={["/pizzaabend-planer"]}>
      <LocalWorkspace repo={repo}>
        <Routes>
          <Route path="/pizzaabend-planer" element={<Planner />} />
          <Route path="/einkaufsliste" element={<Shopping />} />
        </Routes>
      </LocalWorkspace>
    </MemoryRouter>,
  );
  expect(await screen.findByText(/Du bist offline/)).toBeInTheDocument();
  fireEvent.change(await screen.findByLabelText("Name des Pizzaabends"), {
    target: { value: "Freitag mit Freunden" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Pizzaabend speichern" }));
  await screen.findByText("Lokal gespeichert");
  fireEvent.click(
    screen.getByRole("button", { name: "Einkaufsliste erstellen" }),
  );
  await screen.findByRole("heading", { name: "Einkaufsliste", level: 1 });
  expect(
    await screen.findByRole("heading", {
      name: "Einkauf · Freitag mit Freunden",
    }),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Vorhanden Mozzarella (g)"), {
    target: { value: "100" },
  });
  await waitFor(() =>
    expect(
      repo
        .getSnapshot()!
        .shopping[0].items.find((i) => i.name === "Mozzarella")!.onHand,
    ).toBe(100),
  );
  expect(screen.getByText("Noch kaufen: 220 g")).toBeInTheDocument();
  view.unmount();
  expect((await new LocalRepository(store).load()).evenings[0].name).toBe(
    "Freitag mit Freunden",
  );
  online.mockRestore();
});
it("edits only copies of original recipes and persists an own recipe", async () => {
  const repo = new LocalRepository(
    createIndexedDbStore("recipes-" + crypto.randomUUID()),
  );
  render(
    <MemoryRouter>
      <LocalWorkspace repo={repo}>
        <Recipes />
      </LocalWorkspace>
    </MemoryRouter>,
  );
  await screen.findByRole("button", { name: "Als Kopie bearbeiten" });
  fireEvent.click(screen.getByRole("button", { name: "Als Kopie bearbeiten" }));
  fireEvent.change(screen.getByLabelText("Rezeptname"), {
    target: { value: "Meine Margherita" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Rezept speichern" }));
  await waitFor(() => expect(repo.getSnapshot()!.recipes).toHaveLength(1));
  expect(repo.getSnapshot()!.recipes[0].name).toBe("Meine Margherita");
  expect(
    within(
      screen.getByRole("heading", { name: "Rezepte entdecken" }).parentElement!,
    ).getByRole("button", { name: /Margherita.*Original/ }),
  ).toBeInTheDocument();
});

it("accepts a flour-based active dough with a non-tenth ball weight in the native form", async () => {
  const { createPlan } = await import("../core/dough/model");
  const { calculateDough } = await import("../core/dough/calculations");
  const repo = new LocalRepository(
    createIndexedDbStore("flour-ui-" + crypto.randomUUID()),
  );
  await repo.load();
  const plan = {
    ...createPlan(),
    massMode: "flour" as const,
    flourGrams: 500,
    count: 3,
  };
  await repo.change((w) => ({ ...w, dough: { ...w.dough, active: plan } }));
  render(
    <MemoryRouter>
      <LocalWorkspace repo={repo}>
        <Planner />
      </LocalWorkspace>
    </MemoryRouter>,
  );
  const input = (await screen.findByLabelText(
    "Teiglingsgewicht (g)",
  )) as HTMLInputElement;
  expect(input.valueAsNumber).toBeCloseTo(calculateDough(plan).ballGrams, 8);
  expect(input.validity.stepMismatch).toBe(false);
  expect(input.form!.checkValidity()).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Pizzaabend speichern" }));
  await waitFor(() => expect(repo.getSnapshot()!.evenings).toHaveLength(1));
  expect(repo.getSnapshot()!.evenings[0].dough.ballGrams).toBeCloseTo(
    calculateDough(plan).ballGrams,
    8,
  );
});
