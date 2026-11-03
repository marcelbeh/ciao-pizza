import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Page from "./Page";
const show = (path = "/pizza-academy") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Page />
    </MemoryRouter>,
  );
describe("Academy reader", () => {
  it("filters locally, opens an article and returns without network dependencies", () => {
    show();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "W-Wert" },
    });
    const region = screen.getByRole("region", { name: "Wissen finden" });
    expect(within(region).getByRole("status")).toHaveTextContent("1 Artikel");
    fireEvent.click(
      screen.getByRole("link", { name: "Mehl & W-Wert verstehen" }),
    );
    expect(
      screen.getByRole("heading", { name: "Was W wirklich sagt" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Mehl & W-Wert verstehen" }),
    ).toHaveFocus();
    fireEvent.click(
      screen.getByRole("link", { name: /Zur Wissensbibliothek/ }),
    );
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "xyzunbekannt" },
    });
    expect(
      screen.getByRole("heading", { name: "Noch kein Treffer" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Filter zurücksetzen" }),
    );
    expect(screen.getAllByRole("article")).toHaveLength(14);
  });
  it("opens and focuses direct section links and handles unknown articles", () => {
    const view = show("/pizza-academy?artikel=gare&abschnitt=stueckgare");
    expect(
      screen.getByRole("heading", { name: "Stückgare: bereit zum Ausziehen" }),
    ).toHaveFocus();
    view.unmount();
    show("/pizza-academy?artikel=unknown");
    expect(
      screen.getByRole("heading", { name: "Artikel nicht gefunden" }),
    ).toBeInTheDocument();
  });
});
