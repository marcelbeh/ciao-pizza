export type Style = "napoletana" | "new-york" | "roman" | "custom";
export type Oven = "pizza" | "home" | "grill";
export type Yeast = "fresh" | "instant";
export interface DoughPlan {
  version: 1;
  id: string;
  name: string;
  style: Style;
  oven: Oven;
  ovenC: number;
  preheatMinutes: number;
  mixMinutes: number;
  bakeMinutes: number;
  people: number;
  pizzasPerPerson: number;
  reserve: number;
  count: number;
  ballGrams: number;
  massMode: "balls" | "flour";
  flourGrams: number;
  flourProfile: string;
  hydration: number;
  salt: number;
  oil: number;
  sugar: number;
  yeastKind: Yeast;
  yeastMode: "guideline" | "manual";
  yeastPercent: number;
  roomC: number;
  waterC: number;
  doughC: number;
  fridgeC: number;
  method: "direct" | "cold";
  bulkHours: number;
  ballHours: number;
  coldHours: number;
  bakeAt: string;
  timeZone: string;
}
export interface DoughProfile {
  id: string;
  name: string;
  plan: DoughPlan;
  updatedAt: string;
}
export interface DoughState {
  version: 1;
  active: DoughPlan | null;
  profiles: DoughProfile[];
}
/** Shared contract for the future monitor/planner. P1 only derives planned phases. */
export interface PlannedPhase {
  id: "mix" | "bulk" | "cold-bulk" | "balls" | "preheat";
  label: string;
  startsAt: string;
  endsAt: string;
  temperatureC?: number;
  estimated: boolean;
}
export const styles: Record<
  Style,
  {
    name: string;
    note: string;
    hydration: number;
    salt: number;
    oil: number;
    sugar: number;
    ballGrams: number;
    flourProfile: string;
  }
> = {
  napoletana: {
    name: "Neapolitanisch",
    note: "Weicher Rand · 60 % Wasser · ohne Öl und Zucker",
    hydration: 60,
    salt: 2.8,
    oil: 0,
    sugar: 0,
    ballGrams: 250,
    flourProfile: "Weizen Tipo 00 · pizzageeignet",
  },
  "new-york": {
    name: "New York",
    note: "Faltbarer Slice · 62 % Wasser · Öl und etwas Zucker",
    hydration: 62,
    salt: 2.5,
    oil: 2,
    sugar: 1,
    ballGrams: 300,
    flourProfile: "Backstarkes Weizenmehl / Bread Flour",
  },
  roman: {
    name: "Römisch",
    note: "Tonda Romana · dünn und knusprig · 57 % Wasser",
    hydration: 57,
    salt: 2.5,
    oil: 3,
    sugar: 0,
    ballGrams: 200,
    flourProfile: "Weizen Tipo 0 / 00 · mittlere Stärke",
  },
  custom: {
    name: "Eigener Stil",
    note: "Deine Rezeptur · frei anpassbare Ausgangswerte",
    hydration: 65,
    salt: 2.5,
    oil: 0,
    sugar: 0,
    ballGrams: 260,
    flourProfile: "Eigenes Weizenmehl",
  },
};
export const ovens: Record<Oven, string> = {
  pizza: "Pizzaofen",
  home: "Haushaltsbackofen",
  grill: "Grill mit Pizzastein",
};
export function ovenDefaults(oven: Oven, style: Style) {
  return {
    ovenC:
      oven === "home"
        ? 270
        : oven === "grill"
          ? 300
          : style === "napoletana"
            ? 450
            : 320,
    preheatMinutes: oven === "pizza" ? 30 : 45,
    bakeMinutes:
      oven === "pizza" && style === "napoletana"
        ? 1.5
        : oven === "home"
          ? 8
          : 5,
  };
}
export function createPlan(now = new Date()): DoughPlan {
  const preset = styles.napoletana;
  return {
    version: 1,
    id: crypto.randomUUID(),
    name: "Mein Pizzaabend",
    style: "napoletana",
    oven: "pizza",
    ...ovenDefaults("pizza", "napoletana"),
    mixMinutes: 20,
    people: 4,
    pizzasPerPerson: 1,
    reserve: 0,
    count: 4,
    ballGrams: preset.ballGrams,
    massMode: "balls",
    flourGrams: 600,
    flourProfile: preset.flourProfile,
    hydration: preset.hydration,
    salt: preset.salt,
    oil: preset.oil,
    sugar: preset.sugar,
    yeastKind: "fresh",
    yeastMode: "guideline",
    yeastPercent: 0.2,
    roomC: 22,
    waterC: 18,
    doughC: 24,
    fridgeC: 4,
    method: "direct",
    bulkHours: 2,
    ballHours: 10,
    coldHours: 24,
    bakeAt: new Date(now.getTime() + 48 * 3600000).toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
export function applyStyle(plan: DoughPlan, style: Style): DoughPlan {
  const preset = styles[style];
  return {
    ...plan,
    style,
    hydration: preset.hydration,
    salt: preset.salt,
    oil: preset.oil,
    sugar: preset.sugar,
    ballGrams: preset.ballGrams,
    flourProfile: preset.flourProfile,
    ...ovenDefaults(plan.oven, style),
  };
}
