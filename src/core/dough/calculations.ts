import {
  styles,
  ovens,
  type DoughPlan,
  type PlannedPhase,
  type Yeast,
} from "./model";
export type Issues = Partial<Record<keyof DoughPlan, string>>;
export const limits = {
  people: [1, 100, 1],
  pizzasPerPerson: [0.25, 5, 0.25],
  reserve: [0, 100, 1],
  count: [1, 500, 1],
  ballGrams: [50, 2000, 0.1],
  flourGrams: [10, 100000, 0.1],
  hydration: [40, 100, 0.1],
  salt: [0, 5, 0.1],
  oil: [0, 15, 0.1],
  sugar: [0, 15, 0.1],
  yeastPercent: [0, 5, 0.001],
  roomC: [10, 35, 0.5],
  waterC: [1, 40, 0.5],
  doughC: [10, 35, 0.5],
  fridgeC: [1, 10, 0.5],
  bulkHours: [0.25, 24, 0.25],
  ballHours: [0.25, 24, 0.25],
  coldHours: [12, 72, 0.5],
  ovenC: [150, 500, 5],
  preheatMinutes: [10, 120, 5],
  mixMinutes: [5, 60, 5],
  bakeMinutes: [0.5, 30, 0.5],
} as const;
export type NumericKey = keyof typeof limits;
export function validatePlan(value: unknown): Issues {
  if (!value || typeof value !== "object")
    return { name: "Ungültiger Teigplan." };
  const p = value as DoughPlan;
  const issues: Issues = {};
  for (const [key, [min, max, step]] of Object.entries(limits)) {
    const n = p[key as NumericKey];
    if (
      typeof n !== "number" ||
      !Number.isFinite(n) ||
      n < min ||
      n > max ||
      (step === 1 && !Number.isInteger(n))
    )
      issues[key as NumericKey] =
        `Bitte ${min} bis ${max}${step === 1 ? " (ganze Zahl)" : ""} eingeben.`;
  }
  if (p.version !== 1) issues.version = "Unbekannte Planversion.";
  if (typeof p.id !== "string" || !p.id.trim() || p.id.length > 100)
    issues.id = "Plan-ID fehlt.";
  for (const key of ["name", "flourProfile"] as const)
    if (typeof p[key] !== "string" || !p[key].trim() || p[key].length > 80)
      issues[key] = "Bitte 1 bis 80 Zeichen eingeben.";
  if (!Object.hasOwn(styles, p.style)) issues.style = "Pizzastil wählen.";
  if (!Object.hasOwn(ovens, p.oven)) issues.oven = "Backgerät wählen.";
  if (!["fresh", "instant"].includes(p.yeastKind))
    issues.yeastKind = "Hefeart wählen.";
  if (!["guideline", "manual"].includes(p.yeastMode))
    issues.yeastMode = "Hefemodus wählen.";
  if (!["balls", "flour"].includes(p.massMode))
    issues.massMode = "Mengenbasis wählen.";
  if (!["direct", "cold"].includes(p.method))
    issues.method = "Teigführung wählen.";
  if (
    typeof p.bakeAt !== "string" ||
    !/^\d{4}-\d\d-\d\dT/.test(p.bakeAt) ||
    !Number.isFinite(Date.parse(p.bakeAt)) ||
    new Date(p.bakeAt).toISOString() !== p.bakeAt
  )
    issues.bakeAt = "Gültiges Backdatum mit Uhrzeit wählen.";
  try {
    if (typeof p.timeZone !== "string") throw Error();
    new Intl.DateTimeFormat("de", { timeZone: p.timeZone });
  } catch {
    issues.timeZone = "Zeitzone ungültig.";
  }
  return issues;
}
export function assertPlan(p: unknown): asserts p is DoughPlan {
  if (Object.keys(validatePlan(p)).length)
    throw new Error("Der Teigplan enthält ungültige Werte.");
}
export function pizzaCount(people: number, perPerson: number, reserve: number) {
  if (
    ![people, perPerson, reserve].every(Number.isFinite) ||
    people <= 0 ||
    perPerson <= 0 ||
    reserve < 0
  )
    throw Error("Ungültige Mengenplanung.");
  return Math.ceil(people * perPerson) + reserve;
}
/** Coarse house guideline, not a fermentation model. See docs/P1-DOUGH.md. */
export function yeastGuideline(p: DoughPlan) {
  const warm = p.bulkHours + p.ballHours;
  const base =
    p.method === "cold"
      ? p.coldHours <= 36
        ? 0.3
        : 0.15
      : warm <= 6
        ? 0.6
        : warm <= 12
          ? 0.2
          : 0.1;
  const factor = p.roomC < 20 ? 1.5 : p.roomC > 25 ? 0.65 : 1;
  const freshPercent = base * factor;
  return {
    percent: p.yeastKind === "fresh" ? freshPercent : freshPercent / 3,
    freshPercent,
    base,
    factor,
  };
}
export function convertYeast(percent: number, from: Yeast, to: Yeast) {
  return from === to ? percent : from === "fresh" ? percent / 3 : percent * 3;
}
export function calculateDough(p: DoughPlan) {
  assertPlan(p);
  const yeastPercent =
    p.yeastMode === "guideline" ? yeastGuideline(p).percent : p.yeastPercent;
  const factor =
    1 + (p.hydration + p.salt + p.oil + p.sugar + yeastPercent) / 100;
  const flour =
    p.massMode === "flour" ? p.flourGrams : (p.count * p.ballGrams) / factor;
  const ingredients = {
    flour,
    water: (flour * p.hydration) / 100,
    salt: (flour * p.salt) / 100,
    yeast: (flour * yeastPercent) / 100,
    oil: (flour * p.oil) / 100,
    sugar: (flour * p.sugar) / 100,
  };
  const total = Object.values(ingredients).reduce((sum, n) => sum + n, 0);
  return { ingredients, total, ballGrams: total / p.count, yeastPercent };
}
export function formatGrams(n: number, yeast = false) {
  if (yeast && n > 0 && n < 0.001) return "<0,001";
  const digits = yeast ? (n < 1 ? 3 : n < 10 ? 2 : 1) : 1;
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}
export function plannedPhases(p: DoughPlan): PlannedPhase[] {
  assertPlan(p);
  const bake = Date.parse(p.bakeAt);
  const hours = 3600000;
  const balls = bake - p.ballHours * hours;
  const cold = balls - (p.method === "cold" ? p.coldHours : 0) * hours;
  const bulk = cold - p.bulkHours * hours;
  function phase(
    id: PlannedPhase["id"],
    label: string,
    start: number,
    end: number,
    temperatureC?: number,
  ): PlannedPhase {
    return {
      id,
      label,
      startsAt: new Date(start).toISOString(),
      endsAt: new Date(end).toISOString(),
      temperatureC,
      estimated: true,
    };
  }
  return [
    phase("mix", "Mischen & Kneten", bulk - p.mixMinutes * 60000, bulk, p.doughC),
    phase("bulk", "Stockgare im Raum", bulk, cold, p.roomC),
    ...(p.method === "cold"
      ? [phase("cold-bulk", "Kalte Stockgare", cold, balls, p.fridgeC)]
      : []),
    phase("balls", "Stückgare im Raum", balls, bake, p.roomC),
    phase(
      "preheat",
      "Ofen vorheizen",
      bake - p.preheatMinutes * 60000,
      bake,
      p.ovenC,
    ),
  ];
}
export function planWarnings(p: DoughPlan, now = Date.now()): string[] {
  if (Object.keys(validatePlan(p)).length) return [];
  const result: string[] = [];
  if (Date.parse(p.bakeAt) <= now)
    result.push(
      "Das Backdatum liegt in der Vergangenheit. Bitte den Termin aktualisieren.",
    );
  else if (Date.parse(plannedPhases(p)[0].startsAt) < now)
    result.push(
      "Die geplante Startzeit liegt bereits in der Vergangenheit. Gare verkürzen oder Backtermin verschieben.",
    );
  if (p.method === "direct" && p.bulkHours + p.ballHours > 24)
    result.push(
      "Mehr als 24 Stunden Raumgare: außerhalb des Hefe-Richtwertbereichs. Kaltführung prüfen.",
    );
  if (
    p.method === "cold" &&
    (p.bulkHours + p.ballHours < 3 || p.bulkHours + p.ballHours > 6)
  )
    result.push(
      "Der Kaltführungs-Richtwert setzt 3–6 Stunden warme Gare voraus. Deine warme Gare weicht davon ab.",
    );
  if (p.roomC < 16 || p.roomC > 28)
    result.push(
      "Raumtemperatur außerhalb 16–28 °C: Hefe-Richtwerte sind hier besonders unsicher.",
    );
  if (p.method === "cold" && p.fridgeC < 3)
    result.push(
      "Unter 3 °C ist die Gare deutlich langsamer. Der Hefe-Richtwert setzt etwa 4 °C voraus.",
    );
  if (p.method === "cold" && p.fridgeC > 6)
    result.push(
      "Über 6 °C Kühlschranktemperatur: deutlich schnellere Gare möglich. Der Hefe-Richtwert passt nicht zuverlässig.",
    );
  if (p.doughC > 28)
    result.push(
      "Warmer Teig kann deutlich schneller gären. Teigentwicklung beobachten.",
    );
  if (
    p.massMode === "flour" &&
    (calculateDough(p).ballGrams < 50 || calculateDough(p).ballGrams > 2000)
  )
    result.push(
      "Die Mehlmenge ergibt ungewöhnlich kleine oder große Teiglinge. Bitte Anzahl oder Mehlmenge prüfen.",
    );
  if (p.hydration > 70)
    result.push(
      "Hohe Hydration erfordert geeignetes Mehl und Übung. Das Mehlprofil ist keine garantierte Wasseraufnahme.",
    );
  if (p.sugar > 0 && p.ovenC > 350)
    result.push(
      "Zucker bei hoher Backtemperatur kann rasch verbrennen. Zucker oder Temperatur reduzieren.",
    );
  if (p.style === "napoletana" && p.oven !== "pizza")
    result.push(
      "Neapolitanisch inspiriert: im Haushaltsbackofen oder Grill entsteht ein anderes Backergebnis als im heißen Pizzaofen.",
    );
  if (p.yeastMode === "manual" && p.yeastPercent === 0)
    result.push(
      "Ohne Hefe ist keine Hefegare zu erwarten. Sauerteig wird in P1 nicht berechnet.",
    );
  if (
    calculateDough(p).ingredients.yeast < 0.1 &&
    calculateDough(p).ingredients.yeast > 0
  )
    result.push(
      "Sehr kleine Hefemenge: Feinwaage verwenden. Angezeigte Stellen sind Dosierpräzision, keine Gärgarantie.",
    );
  return result;
}
export function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fromLocalInput(value: string): string {
  const d = new Date(value);
  if (
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value) ||
    !Number.isFinite(d.getTime()) ||
    toLocalInput(d.toISOString()) !== value
  )
    throw Error("Diese lokale Uhrzeit existiert nicht oder ist ungültig.");
  return d.toISOString();
}
