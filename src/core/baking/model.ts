import type { DoughPlan } from "../dough/model";
import type { Recipe } from "../planning/model";
export const problems = {
  sticky: "Teig zu klebrig",
  dry: "Teig zu trocken",
  shrinking: "Teig zieht sich zurück",
  tearing: "Teig reißt",
  noRise: "Teig geht nicht auf",
  overproof: "Verdacht auf Übergare",
  underproof: "Verdacht auf Untergare",
  dark: "Pizza wird zu dunkel",
  pale: "Pizza bleibt zu hell",
  soggy: "Boden nicht durchgebacken",
} as const;
export type Problem = keyof typeof problems;
export interface Timer {
  durationMs: number;
  elapsedMs: number;
  startedAt: number | null;
}
export interface BakeSettings {
  ovenC: number;
  stoneC: number;
  topC: number | null;
  preheatMinutes: number;
  bakeSeconds: number;
  turnSeconds: number;
}
export type CoachStep = "preheat" | "prepare" | "bake" | "check" | "complete";
export interface BakedPizza {
  name: string;
  seconds: number;
  finishedAt: string;
  settings: BakeSettings;
}
export interface CoachSession {
  id: string;
  name: string;
  sourceEveningId: string | null;
  plan: DoughPlan;
  pizzas: string[];
  recipes: Recipe[];
  settings: BakeSettings;
  step: CoachStep;
  timer: Timer;
  completed: BakedPizza[];
  turns: number;
  lastTurnMs?: number;
  updatedAt: string;
  revision: number;
}
export interface Observations {
  bulkHours: number | null;
  ballHours: number | null;
  coldHours: number | null;
  roomC: number | null;
  waterC: number | null;
  doughC: number | null;
  fridgeC: number | null;
  ovenC: number | null;
  stoneC: number | null;
  topC: number | null;
  bakeSeconds: number | null;
}
export const emptyObservations = (): Observations => ({
  bulkHours: null,
  ballHours: null,
  coldHours: null,
  roomC: null,
  waterC: null,
  doughC: null,
  fridgeC: null,
  ovenC: null,
  stoneC: null,
  topC: null,
  bakeSeconds: null,
});
export interface Photo {
  id: string;
  dataUrl: string;
  bytes: number;
  width: number;
  height: number;
  caption: string;
}
export interface JournalEntry {
  id: string;
  name: string;
  date: string;
  sourceEveningId: string | null;
  sourceSessionId: string | null;
  plan: DoughPlan;
  recipe: Recipe | null;
  actual: Observations;
  ratings: {
    taste: number | null;
    structure: number | null;
    bake: number | null;
  };
  problems: Problem[];
  notes: string;
  photos: Photo[];
  updatedAt: string;
  revision: number;
}
export interface DiagnosticInput {
  problem: Problem;
  plan: DoughPlan;
  actual: Observations;
  temperature: "unknown" | "cold" | "warm";
  rest: "unknown" | "short" | "long";
  rise: "unknown" | "none" | "collapsed" | "springy";
  browning: "both" | "top" | "bottom";
}
export interface Finding {
  id: string;
  cause: string;
  evidence: string;
  now: string;
  next: string;
  parameter: string;
}
export interface Diagnosis {
  engine: "rules-v1";
  findings: Finding[];
  note: string;
}
/** A future engine may implement this port; the shipped engine is local and deterministic. */
export interface DiagnosisEngine {
  analyze(input: DiagnosticInput): Promise<Diagnosis>;
}
export interface DiagnosisRecord {
  id: string;
  createdAt: string;
  input: DiagnosticInput;
  result: Diagnosis;
}
export interface BakingData {
  version: 1;
  sessions: CoachSession[];
  entries: JournalEntry[];
  diagnoses: DiagnosisRecord[];
}
export const emptyBaking = (): BakingData => ({
  version: 1,
  sessions: [],
  entries: [],
  diagnoses: [],
});

export const observationTitles: Record<keyof Observations, string> = {
  bulkHours: "Stockgare (h)",
  ballHours: "Stückgare (h)",
  coldHours: "Kaltgare (h)",
  roomC: "Raumtemperatur (°C)",
  waterC: "Wassertemperatur (°C)",
  doughC: "Teigtemperatur (°C)",
  fridgeC: "Kühlschrank (°C)",
  ovenC: "Backtemperatur (°C)",
  stoneC: "Steintemperatur (°C)",
  topC: "Oberhitze (°C)",
  bakeSeconds: "Backdauer pro Pizza (s)",
};
