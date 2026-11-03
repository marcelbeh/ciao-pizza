import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DoughProvider, StorageStatus, useDough } from "./DoughProvider";
import Pilot from "../modules/pizza-pilot/Page";
import Studio from "../modules/teigstudio/Page";
import { createDoughRepository } from "../infrastructure/storage/doughRepository";
import { createIndexedDbStore } from "../infrastructure/storage/indexedDbStore";
import { createPlan, type DoughState } from "../core/dough/model";
HTMLElement.prototype.scrollIntoView = vi.fn();
describe("pilot, studio and durable profiles", () => {
  it("hands the full pilot plan to studio, recalculates, saves, loads, edits and deletes profiles", async () => {
    const repo = createDoughRepository(
      createIndexedDbStore(crypto.randomUUID()),
    );
    window.location.hash = "/pizza-pilot";
    const app = () => (
      <HashRouter>
        <DoughProvider repository={repo}>
          <Routes>
            <Route path="/pizza-pilot" element={<Pilot />} />
            <Route path="/teigstudio" element={<Studio />} />
          </Routes>
        </DoughProvider>
      </HashRouter>
    );
    const view = render(app());
    fireEvent.click(await screen.findByRole("button", { name: /New York/ }));
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    fireEvent.click(screen.getByRole("button", { name: /Haushaltsbackofen/ }));
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    fireEvent.change(screen.getByLabelText(/^Personen/), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText(/^Pizzen pro Person/), {
      target: { value: "1.5" },
    });
    fireEvent.change(screen.getByLabelText(/^Reserve/), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    fireEvent.click(
      screen.getByRole("button", { name: /Kalte Langzeitführung/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: "Plan speichern & Teigstudio öffnen",
      }),
    );
    expect(
      await screen.findByRole("heading", { name: "Teigstudio" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText(/^Teiglinge/)).toHaveValue(6),
    );
    expect(screen.getByRole("spinbutton", { name: /^Hydration/ })).toHaveValue(
      62,
    );
    expect(screen.getByLabelText(/^Backtemperatur/)).toHaveValue(270);
    expect(screen.getByLabelText(/^Kalte Stockgare/)).toHaveValue(24);
    fireEvent.change(screen.getByRole("spinbutton", { name: /^Hydration/ }), {
      target: { value: "68" },
    });
    fireEvent.change(screen.getByLabelText("Profilname"), {
      target: { value: "Freitag" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Als neues Profil speichern" }),
    );
    await waitFor(async () =>
      expect((await repo.load()).profiles).toHaveLength(1),
    );
    const id = (await repo.load()).profiles[0].id;
    fireEvent.change(screen.getByLabelText("Gespeichertes Profil"), {
      target: { value: id },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: /^Hydration/ }), {
      target: { value: "70" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Profil laden" }));
    await waitFor(() =>
      expect(
        screen.getByRole("spinbutton", { name: /^Hydration/ }),
      ).toHaveValue(68),
    );
    fireEvent.change(screen.getByRole("spinbutton", { name: /^Hydration/ }), {
      target: { value: "69" },
    });
    fireEvent.change(screen.getByLabelText("Profilname"), {
      target: { value: "Samstag" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Profil aktualisieren" }),
    );
    await waitFor(async () =>
      expect((await repo.load()).profiles[0]).toMatchObject({
        name: "Samstag",
        plan: { hydration: 69 },
      }),
    );
    view.unmount();
    render(app());
    await waitFor(() =>
      expect(
        screen.getByRole("spinbutton", { name: /^Hydration/ }),
      ).toHaveValue(69),
    );
    fireEvent.change(screen.getByLabelText("Gespeichertes Profil"), {
      target: { value: id },
    });
    fireEvent.click(screen.getByRole("button", { name: "Profil löschen" }));
    await waitFor(async () =>
      expect((await repo.load()).profiles).toHaveLength(0),
    );
    expect((await repo.load()).active).toMatchObject({
      hydration: 69,
      count: 6,
      oven: "home",
      method: "cold",
      style: "new-york",
    });
  });
  it("keeps invalid input local and preserves the last valid persisted plan", async () => {
    const repo = createDoughRepository(
      createIndexedDbStore(crypto.randomUUID()),
    );
    await repo.save({ version: 1, active: createPlan(), profiles: [] });
    render(
      <DoughProvider repository={repo}>
        <Studio />
      </DoughProvider>,
    );
    const field = await screen.findByRole("spinbutton", { name: /^Hydration/ });
    fireEvent.change(field, { target: { value: "" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Ungültige Eingaben");
    expect((await repo.load()).active?.hydration).toBe(60);
    fireEvent.change(field, { target: { value: "67" } });
    await waitFor(async () =>
      expect((await repo.load()).active?.hydration).toBe(67),
    );
  });
});
function Harness() {
  const w = useDough();
  return (
    <>
      <StorageStatus />
      <button
        disabled={!w.ready}
        onClick={() => {
          w.setActive({ ...createPlan(), hydration: 61 });
          w.setActive({ ...createPlan(), hydration: 72 });
        }}
      >
        Rapid changes
      </button>
    </>
  );
}
describe("save ordering and failures", () => {
  it("serializes rapid changes, reports failure and retries the latest snapshot", async () => {
    let saved: DoughState = { version: 1, active: null, profiles: [] };
    let fail = true;
    const repo = {
      load: async () => saved,
      save: vi.fn(async (state: DoughState) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        if (fail) throw Error("Quota");
        saved = structuredClone(state);
      }),
    };
    render(
      <DoughProvider repository={repo}>
        <Harness />
      </DoughProvider>,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Rapid changes" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Rapid changes" }));
    await screen.findByText(/noch nicht dauerhaft gespeichert/);
    expect(saved.active).toBeNull();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    await waitFor(() => expect(saved.active?.hydration).toBe(72));
    expect(repo.save.mock.calls.map(([s]) => s.active?.hydration)).toEqual([
      61, 72, 72,
    ]);
  });
  it("does not save defaults after a failed hydration", async () => {
    const repo = {
      load: vi.fn(async (): Promise<DoughState> => {
        throw Error("corrupt");
      }),
      save: vi.fn(async () => {}),
    };
    render(
      <DoughProvider repository={repo}>
        <Harness />
      </DoughProvider>,
    );
    await screen.findByText(/Vorhandene Daten werden nicht überschrieben/);
    expect(
      screen.getByRole("button", { name: "Rapid changes" }),
    ).toBeDisabled();
    expect(repo.save).not.toHaveBeenCalled();
  });
});
