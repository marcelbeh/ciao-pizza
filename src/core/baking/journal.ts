import { observationTitles } from "./model";
import { createPlan } from "../dough/model";
import type { DoughPlan } from "../dough/model";
import type { PizzaEvening, Recipe } from "../planning/model";
import {
  emptyObservations,
  problems,
  type CoachSession,
  type JournalEntry,
} from "./model";
import { assertEntry } from "./validation";
export function newEntry(
  plan: DoughPlan = createPlan(),
  evening?: PizzaEvening,
  session?: CoachSession,
): JournalEntry {
  const source = structuredClone(session?.plan ?? evening?.dough ?? plan);
  const actual = emptyObservations();
  if (session?.completed.length) {
    const seconds = session.completed
      .map((p) => p.seconds)
      .filter((n) => n >= 1 && n <= 1800);
    if (seconds.length)
      actual.bakeSeconds = seconds.reduce((a, b) => a + b, 0) / seconds.length;
  }
  return {
    id: crypto.randomUUID(),
    name: session?.name ?? evening?.name ?? source.name,
    date: new Date().toISOString(),
    sourceEveningId: session?.sourceEveningId ?? evening?.id ?? null,
    sourceSessionId: session?.id ?? null,
    plan: source,
    recipe:
      evening?.lines.length === 1
        ? structuredClone(evening.lines[0].recipe)
        : session?.recipes.length === 1
          ? structuredClone(session.recipes[0])
          : null,
    actual,
    ratings: { taste: null, structure: null, bake: null },
    problems: [],
    notes: "",
    photos: [],
    updatedAt: new Date().toISOString(),
    revision: 0,
  };
}
export function successful(e: JournalEntry) {
  return (
    Object.values(e.ratings).every((n) => n !== null && n >= 4) &&
    e.problems.length === 0
  );
}
export function recipeFromEntry(e: JournalEntry): Recipe {
  assertEntry(e);
  const recipe: Recipe = {
    id: crypto.randomUUID(),
    name: ("Gelungen · " + e.name).slice(0, 80),
    style: e.plan.style,
    topping: e.recipe?.topping ?? "Vegetarisch",
    yieldPizzas: e.recipe?.yieldPizzas ?? 1,
    ingredients: structuredClone(e.recipe?.ingredients ?? []),
    instructions: [
      e.recipe?.instructions ??
        "Teigrezeptur ohne Belag. Zutaten und Führung siehe gespeicherten Teigplan.",
      `Tagebuch vom ${new Date(e.date).toLocaleDateString("de-DE")}. Messwerte: ${
        Object.entries(e.actual)
          .filter(([, v]) => v !== null)
          .map(
            ([k, v]) =>
              `${observationTitles[k as keyof typeof observationTitles]}: ${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(v!)}`,
          )
          .join(", ") || "nicht erfasst"
      }.`,
      e.notes,
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 8000),
    dough: structuredClone(e.plan),
  };
  return recipe;
}
export interface Insight {
  id: string;
  title: string;
  detail: string;
  suggestion: string;
}
export function insights(entries: JournalEntry[]): Insight[] {
  const result: Insight[] = [];
  for (const [id, label] of Object.entries(problems)) {
    const matches = entries.filter((e) =>
      e.problems.includes(id as keyof typeof problems),
    );
    if (matches.length >= 2)
      result.push({
        id: "repeat:" + id,
        title: `Wiederholt: ${label}`,
        detail: `In ${matches.length} von ${entries.length} Einträgen ausdrücklich markiert.`,
        suggestion:
          id === "soggy"
            ? "Steinvorheizen und Belagfeuchte einzeln vergleichen."
            : id === "shrinking"
              ? "Entspannungszeit und Teigtemperatur beim Formen dokumentieren."
              : id === "sticky"
                ? "Mit gleichem Mehl Hydration und Reifedauer getrennt vergleichen."
                : "Im Teig-Doc das Problem mit den Messwerten dieser Versuche prüfen; beim nächsten Versuch nur eine Größe ändern.",
      });
  }
  const good = entries.filter(successful);
  if (good.length)
    result.push({
      id: "success",
      title: `${good.length} gelungene Rezeptur${good.length === 1 ? "" : "en"}`,
      detail:
        "Alle drei Bewertungen mindestens 4/5, keine markierten Probleme. Eigene Bewertungen, kein objektiver Qualitätstest.",
      suggestion:
        "Diese Rezeptur reproduzieren, bevor weitere Parameter verändert werden.",
    });
  return result;
}
export function compareEntries(a: JournalEntry, b: JournalEntry) {
  const fields: [string, number | null, number | null, string][] = [
    ["Hydration", a.plan.hydration, b.plan.hydration, "%"],
    ["Salz", a.plan.salt, b.plan.salt, "%"],
    ["Öl", a.plan.oil, b.plan.oil, "%"],
    ["Zucker", a.plan.sugar, b.plan.sugar, "%"],
    [
      "Hefe (manuell)",
      a.plan.yeastMode === "manual" ? a.plan.yeastPercent : null,
      b.plan.yeastMode === "manual" ? b.plan.yeastPercent : null,
      "%",
    ],
    ...Object.entries(a.actual).map(
      ([k, v]) =>
        [
          k,
          v,
          b.actual[k as keyof typeof b.actual],
          k.endsWith("Hours") ? "h" : k === "bakeSeconds" ? "s" : "°C",
        ] as [string, number | null, number | null, string],
    ),
    ["Geschmack", a.ratings.taste, b.ratings.taste, "/5"],
    ["Teigstruktur", a.ratings.structure, b.ratings.structure, "/5"],
    ["Backergebnis", a.ratings.bake, b.ratings.bake, "/5"],
  ];
  return fields.map(([label, first, second, unit]) => ({
    label,
    first,
    second,
    unit,
    delta: first !== null && second !== null ? second - first : null,
  }));
}
