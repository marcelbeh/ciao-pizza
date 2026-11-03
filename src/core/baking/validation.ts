import { assertPlan } from "../dough/calculations";
import { assertRecipe } from "../planning/recipes";
import {
  problems,
  type BakeSettings,
  type BakingData,
  type CoachSession,
  type DiagnosticInput,
  type JournalEntry,
  type Observations,
  type Photo,
} from "./model";
export const photoLimits = {
  perEntry: 3,
  count: 20,
  fileBytes: 10000000,
  bytes: 350000,
  totalBytes: 5000000,
  side: 1280,
};
const fail = (message = "Ungültige Backdaten.") => {
  throw Error(message);
};
const text = (v: unknown, max = 100) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
const timestamp = (v: unknown) =>
  typeof v === "string" && Number.isFinite(Date.parse(v));
const range = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const unique = (items: { id: string }[]) =>
  new Set(items.map((x) => x.id)).size === items.length;
export const observationRanges: Record<
  keyof Observations,
  readonly [number, number]
> = {
  bulkHours: [0, 168],
  ballHours: [0, 168],
  coldHours: [0, 168],
  roomC: [0, 45],
  waterC: [0, 60],
  doughC: [0, 45],
  fridgeC: [-5, 20],
  ovenC: [100, 550],
  stoneC: [50, 550],
  topC: [100, 550],
  bakeSeconds: [1, 1800],
};
export function assertObservations(a: Observations) {
  if (
    !a ||
    !Object.entries(observationRanges).every(
      ([k, [min, max]]) =>
        a[k as keyof Observations] === null ||
        range(a[k as keyof Observations], min, max),
    )
  )
    fail(
      "Messwerte prüfen: leere Felder sind unbekannt, Zahlen müssen im angegebenen Bereich liegen.",
    );
}
export function assertSettings(
  s: BakeSettings,
  oven: CoachSession["plan"]["oven"],
) {
  if (
    !s ||
    !range(s.ovenC, 100, oven === "home" ? 350 : 550) ||
    !range(s.stoneC, 50, oven === "home" ? 350 : 550) ||
    !(s.topC === null || range(s.topC, 100, 550)) ||
    (oven === "grill" && s.topC !== null) ||
    !range(s.preheatMinutes, 5, 120) ||
    !range(s.bakeSeconds, 10, 1800) ||
    !range(s.turnSeconds, 5, s.bakeSeconds)
  )
    fail(
      "Backeinstellungen prüfen: Temperaturen, Vorheizen (5–120 min), Backen (10–1800 s) und Drehintervall (5 s bis Backdauer).",
    );
}
export function assertSession(s: CoachSession) {
  if (
    !s ||
    !text(s.id) ||
    !text(s.name, 80) ||
    !(s.sourceEveningId === null || text(s.sourceEveningId)) ||
    !timestamp(s.updatedAt) ||
    !Number.isInteger(s.revision) ||
    s.revision < 0 ||
    !Array.isArray(s.pizzas) ||
    s.pizzas.length < 1 ||
    s.pizzas.length > 500 ||
    !s.pizzas.every((x) => text(x, 80)) ||
    !Array.isArray(s.recipes) ||
    s.recipes.length > 100 ||
    !Array.isArray(s.completed) ||
    s.completed.length > s.pizzas.length ||
    !Number.isInteger(s.turns) ||
    s.turns < 0 ||
    s.turns > 10000 ||
    !(s.lastTurnMs === undefined || range(s.lastTurnMs, 0, 604800000)) ||
    !["preheat", "prepare", "bake", "check", "complete"].includes(s.step)
  )
    fail();
  assertPlan(s.plan);
  assertSettings(s.settings, s.plan.oven);
  s.recipes.forEach(assertRecipe);
  if (
    (s.step === "complete") !== (s.completed.length === s.pizzas.length) ||
    !s.timer ||
    !range(s.timer.durationMs, 10000, 7200000) ||
    !range(s.timer.elapsedMs, 0, 604800000) ||
    !(
      s.timer.startedAt === null ||
      range(s.timer.startedAt, 0, 8640000000000000)
    ) ||
    (!["bake", "preheat"].includes(s.step) && s.timer.startedAt !== null)
  )
    fail("Backfortschritt oder Timer ist ungültig.");
  for (const p of s.completed) {
    if (
      !p ||
      !text(p.name, 80) ||
      !range(p.seconds, 0, 604800) ||
      !timestamp(p.finishedAt)
    )
      fail();
    assertSettings(p.settings, s.plan.oven);
  }
}
export function assertPhoto(p: Photo) {
  if (
    !p ||
    !text(p.id) ||
    typeof p.caption !== "string" ||
    p.caption.length > 200 ||
    !Number.isInteger(p.width) ||
    !Number.isInteger(p.height) ||
    !range(p.width, 1, photoLimits.side) ||
    !range(p.height, 1, photoLimits.side) ||
    !Number.isInteger(p.bytes) ||
    !range(p.bytes, 1, photoLimits.bytes) ||
    typeof p.dataUrl !== "string" ||
    p.dataUrl.length > 470000 ||
    !/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(p.dataUrl)
  )
    fail("Foto prüfen: nur verkleinerte JPEGs bis 350 KB und 1280 Pixel.");
  const base64 = p.dataUrl.slice(23);
  if (
    base64.length % 4 !== 0 ||
    (base64.length / 4) * 3 -
      (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0) !==
      p.bytes
  )
    fail("Fotogröße stimmt nicht mit dem Bild überein.");
}
export function assertEntry(e: JournalEntry) {
  if (
    !e ||
    !text(e.id) ||
    !text(e.name, 80) ||
    !timestamp(e.date) ||
    !timestamp(e.updatedAt) ||
    !Number.isInteger(e.revision) ||
    e.revision < 0 ||
    ![e.sourceEveningId, e.sourceSessionId].every(
      (x) => x === null || text(x),
    ) ||
    typeof e.notes !== "string" ||
    e.notes.length > 8000 ||
    !Array.isArray(e.problems) ||
    !e.problems.every((x) => Object.hasOwn(problems, x)) ||
    new Set(e.problems).size !== e.problems.length ||
    !Array.isArray(e.photos) ||
    e.photos.length > photoLimits.perEntry ||
    !unique(e.photos) ||
    !e.ratings ||
    !["taste", "structure", "bake"].every((k) => {
      const n = e.ratings[k as keyof typeof e.ratings];
      return n === null || (Number.isInteger(n) && range(n, 1, 5));
    })
  )
    fail(
      "Tagebucheintrag prüfen: Name, Datum, Bewertungen (1–5) und gültige Notizen/Messwerte.",
    );
  assertPlan(e.plan);
  assertObservations(e.actual);
  if (e.recipe !== null) assertRecipe(e.recipe);
  e.photos.forEach(assertPhoto);
}
export function assertDiagnostic(i: DiagnosticInput) {
  if (
    !i ||
    !Object.hasOwn(problems, i.problem) ||
    !["unknown", "cold", "warm"].includes(i.temperature) ||
    !["unknown", "short", "long"].includes(i.rest) ||
    !["unknown", "none", "collapsed", "springy"].includes(i.rise) ||
    !["both", "top", "bottom"].includes(i.browning)
  )
    fail("Diagnoseauswahl ist ungültig.");
  assertPlan(i.plan);
  assertObservations(i.actual);
}
export function assertBaking(b: BakingData) {
  if (
    !b ||
    b.version !== 1 ||
    !Array.isArray(b.entries) ||
    b.entries.length > 200 ||
    !Array.isArray(b.sessions) ||
    b.sessions.length > 30 ||
    !Array.isArray(b.diagnoses) ||
    b.diagnoses.length > 100 ||
    ![b.entries, b.sessions, b.diagnoses].every(unique)
  )
    fail(
      "Lokale Backdaten prüfen (maximal 200 Einträge, 30 Backläufe und 100 Diagnosen).",
    );
  b.entries.forEach(assertEntry);
  b.sessions.forEach(assertSession);
  for (const d of b.diagnoses) {
    if (
      !d ||
      !text(d.id) ||
      !timestamp(d.createdAt) ||
      !d.result ||
      d.result.engine !== "rules-v1" ||
      typeof d.result.note !== "string" ||
      !Array.isArray(d.result.findings) ||
      d.result.findings.length > 20 ||
      !d.result.findings.every((f) =>
        ["id", "cause", "evidence", "now", "next", "parameter"].every((k) =>
          text(f[k as keyof typeof f], 5000),
        ),
      )
    )
      fail("Gespeicherte Diagnose ist ungültig.");
    assertDiagnostic(d.input);
  }
  const photos = b.entries.flatMap((e) => e.photos);
  if (
    photos.length > photoLimits.count ||
    photos.reduce((sum, p) => sum + p.bytes, 0) > photoLimits.totalBytes
  )
    fail(
      "Fotolimit erreicht: maximal 20 Fotos und insgesamt 5 MB. Bitte Fotos entfernen oder extern sichern.",
    );
}
