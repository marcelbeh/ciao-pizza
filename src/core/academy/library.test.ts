import { describe, expect, it } from "vitest";
import {
  articles,
  categories,
  sources,
  searchArticles,
  getArticleSection,
  contentVersion,
} from "./library";
import { academyPath } from "./links";
describe("local Academy corpus", () => {
  it("has stable unique IDs, complete sections and valid source references", () => {
    expect(new Set(articles.map((a) => a.id)).size).toBe(articles.length);
    for (const a of articles) {
      expect(categories).toContain(a.category);
      expect(a.sections.length).toBeGreaterThan(0);
      expect(new Set(a.sections.map((s) => s.id)).size).toBe(a.sections.length);
      expect(a.sourceIds.length).toBeGreaterThan(0);
      for (const id of a.sourceIds) expect(sources).toHaveProperty(id);
      for (const s of a.sections) {
        expect(s.paragraphs.every((p) => p.trim().length > 0)).toBe(true);
        expect(getArticleSection(a.id, s.id)).toMatchObject({
          contentVersion,
          articleId: a.id,
          sectionId: s.id,
          paragraphs: s.paragraphs,
        });
      }
    }
    expect(getArticleSection("missing", "missing")).toBeUndefined();
    expect(getArticleSection("gare", "missing")).toBeUndefined();
  });
  it("searches full text, normalizes umlauts and combines terms with categories", () => {
    expect(searchArticles("STUCKGARE").map((a) => a.id)).toContain("gare");
    expect(searchArticles("Alveographen").map((a) => a.id)).toContain("mehl");
    expect(
      searchArticles("mehl", "Zutaten").every((a) => a.category === "Zutaten"),
    ).toBe(true);
    expect(searchArticles("garantiert unbekannt")).toEqual([]);
    expect(searchArticles("   ")).toHaveLength(articles.length);
    expect(academyPath("gare", "stueckgare")).toBe(
      "/pizza-academy?artikel=gare&abschnitt=stueckgare",
    );
  });
  it("resolves every contextual entry point", () => {
    for (const [a, s] of [
      ["hydration", "prozent"],
      ["fehler", "teig"],
      ["backtemperatur", "richtwerte"],
      ["gare", "stueckgare"],
    ])
      expect(getArticleSection(a, s)).toBeDefined();
  });
});
