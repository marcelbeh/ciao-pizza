import {
  render,
  screen,
  fireEvent,
  waitFor,
  configure,
} from "@testing-library/react";
import { it, expect, vi } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { LocalWorkspace } from "./LocalWorkspace";
import { LocalRepository } from "../infrastructure/storage/localRepository";
import { createIndexedDbStore } from "../infrastructure/storage/indexedDbStore";
import { createPlan } from "../core/dough/model";
import Coach from "../modules/backcoach/Page";
import Doc from "../modules/teig-doc/Page";
import Journal from "../modules/pizza-tagebuch/Page";
configure({ asyncUtilTimeout: 5000 });
async function click(name: string) {
  const button = await screen.findByRole("button", { name });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
}
it("persists a coach through reload and transfers the completed run to the journal", async () => {
  const repo = new LocalRepository(
    createIndexedDbStore("coach-ui-" + crypto.randomUUID()),
  );
  await repo.load();
  await repo.change((w) => ({
    ...w,
    dough: { ...w.dough, active: { ...createPlan(), count: 1 } },
  }));
  const ui = () => (
    <MemoryRouter initialEntries={["/backcoach"]}>
      <LocalWorkspace repo={repo}>
        <Routes>
          <Route path="/backcoach" element={<Coach />} />
          <Route path="/pizza-tagebuch" element={<Journal />} />
        </Routes>
      </LocalWorkspace>
    </MemoryRouter>
  );
  let view = render(ui());
  await screen.findByRole("option", { name: /Aktiver Teigplan/ });
  fireEvent.change(await screen.findByLabelText("Daten übernehmen aus"), {
    target: { value: "active" },
  });
  await click("Neuen Backlauf vorbereiten");
  await click("Timer starten / fortsetzen");
  await waitFor(() =>
    expect(
      repo.getSnapshot()!.baking!.sessions[0].timer.startedAt,
    ).not.toBeNull(),
  );
  view.unmount();
  view = render(ui());
  await click("Stein geprüft – weiter");
  await click("Pizza einschieben & Timer starten");
  await click("Pizza herausnehmen & prüfen");
  await click("Pizza fertig – nächste");
  await screen.findByText("Buon appetito!");
  fireEvent.click(
    screen.getByRole("link", { name: "Backlauf ins Tagebuch übernehmen" }),
  );
  await screen.findByRole("heading", { name: "Pizza-Tagebuch", level: 1 });
  expect(screen.getByLabelText("Titel des Backversuchs")).toHaveValue(
    "Mein Pizzaabend",
  );
  expect(screen.getByLabelText("Gemessen: Backtemperatur (°C)")).toHaveValue(
    null,
  );
  view.unmount();
});
it("runs and stores the local diagnostic engine with explicit observations offline", async () => {
  const repo = new LocalRepository(
    createIndexedDbStore("doc-ui-" + crypto.randomUUID()),
  );
  const network = vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(Error("offline"));
  const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  render(
    <MemoryRouter>
      <LocalWorkspace repo={repo}>
        <Doc />
      </LocalWorkspace>
    </MemoryRouter>,
  );
  fireEvent.change(await screen.findByLabelText("Teig- oder Backproblem"), {
    target: { value: "shrinking" },
  });
  await click("Weiter zu Beobachtungen");
  fireEvent.change(screen.getByLabelText("Teig beim Formen"), {
    target: { value: "cold" },
  });
  await click("Regeln auswerten");
  await screen.findByRole("heading", {
    name: "Kalter Teig kann die Entwicklung bremsen",
  });
  await click("Diagnose speichern");
  await waitFor(() =>
    expect(repo.getSnapshot()!.baking!.diagnoses).toHaveLength(1),
  );
  expect(network).not.toHaveBeenCalled();
  online.mockRestore();
  network.mockRestore();
});
it("saves real observations and ratings and creates a reusable recipe while preserving the original plan", async () => {
  const repo = new LocalRepository(
    createIndexedDbStore("journal-ui-" + crypto.randomUUID()),
  );
  await repo.load();
  const active = { ...createPlan(), hydration: 66.666 };
  await repo.change((w) => ({ ...w, dough: { ...w.dough, active } }));
  render(
    <MemoryRouter>
      <LocalWorkspace repo={repo}>
        <Journal />
      </LocalWorkspace>
    </MemoryRouter>,
  );
  await screen.findByRole("option", { name: /Aktiver Teigplan/ });
  fireEvent.change(screen.getByLabelText("Daten übernehmen aus"), {
    target: { value: "active" },
  });
  await click("Als neuen Versuch übernehmen");
  expect(
    (screen.getByLabelText("Titel des Backversuchs") as HTMLInputElement).form!
      .noValidate,
  ).toBe(true);
  fireEvent.change(await screen.findByLabelText("Titel des Backversuchs"), {
    target: { value: "Mein gelungener Versuch" },
  });
  fireEvent.change(screen.getByLabelText("Gemessen: Backtemperatur (°C)"), {
    target: { value: "430" },
  });
  for (const label of ["Geschmack", "Teigstruktur", "Backergebnis"])
    fireEvent.change(screen.getByLabelText("Bewertung " + label), {
      target: { value: "5" },
    });
  await click("Backversuch speichern");
  await waitFor(() =>
    expect(repo.getSnapshot()!.baking!.entries).toHaveLength(1),
  );
  await click("Gelungenen Versuch als neues Rezept speichern");
  await waitFor(() => expect(repo.getSnapshot()!.recipes).toHaveLength(1));
  expect(repo.getSnapshot()!.recipes[0].dough).toBeDefined();
  expect(repo.getSnapshot()!.baking!.entries[0].actual.ovenC).toBe(430);
  expect(repo.getSnapshot()!.dough.active).toEqual(active);
});
