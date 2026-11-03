import { assertPlan } from "../dough/calculations";
import { createPlan } from "../dough/model";
import type { PizzaEvening } from "../planning/model";
import { assertEvening } from "../planning/calculations";
import type { BakeSettings, CoachSession, Timer } from "./model";
export function recommendations(plan: CoachSession["plan"]): BakeSettings {
  assertPlan(plan);
  const high = plan.oven === "pizza" && plan.style === "napoletana";
  return {
    ovenC: Math.min(plan.oven === "home" ? 350 : 550, plan.ovenC),
    stoneC: high ? 420 : plan.oven === "home" ? 250 : 300,
    topC: null,
    preheatMinutes: plan.preheatMinutes,
    bakeSeconds: plan.bakeMinutes * 60,
    turnSeconds: high
      ? 25
      : Math.max(30, Math.round((plan.bakeMinutes * 60) / 2)),
  };
}
export function freshTimer(seconds: number): Timer {
  return { durationMs: seconds * 1000, elapsedMs: 0, startedAt: null };
}
export function elapsed(timer: Timer, now = Date.now()) {
  return Math.max(
    0,
    timer.elapsedMs +
      (timer.startedAt === null ? 0 : Math.max(0, now - timer.startedAt)),
  );
}
export const remaining = (timer: Timer, now = Date.now()) =>
  Math.max(0, timer.durationMs - elapsed(timer, now));
export function startTimer(timer: Timer, now = Date.now()): Timer {
  return timer.startedAt === null ? { ...timer, startedAt: now } : timer;
}
export function pauseTimer(timer: Timer, now = Date.now()): Timer {
  return {
    ...timer,
    elapsedMs: Math.min(604800000, elapsed(timer, now)),
    startedAt: null,
  };
}
export function newSession(
  plan = createPlan(),
  evening?: PizzaEvening,
): CoachSession {
  if (evening) assertEvening(evening);
  const source = structuredClone(evening?.dough ?? plan);
  assertPlan(source);
  const settings = recommendations(source);
  return {
    id: crypto.randomUUID(),
    name: evening?.name ?? source.name,
    sourceEveningId: evening?.id ?? null,
    plan: source,
    pizzas: evening
      ? evening.lines.flatMap((l) =>
          Array.from({ length: l.pizzas }, () => l.recipe.name),
        )
      : Array.from({ length: source.count }, (_, i) => `Pizza ${i + 1}`),
    recipes: evening ? evening.lines.map((l) => structuredClone(l.recipe)) : [],
    settings,
    step: "preheat",
    timer: freshTimer(settings.preheatMinutes * 60),
    completed: [],
    turns: 0,
    lastTurnMs: 0,
    updatedAt: new Date().toISOString(),
    revision: 0,
  };
}
export function transition(
  session: CoachSession,
  action:
    | "ready"
    | "launch"
    | "check"
    | "continue"
    | "done"
    | "turn"
    | "start"
    | "pause"
    | "restart",
  now = Date.now(),
): CoachSession {
  const s = structuredClone(session);
  if (action === "start" && (s.step === "preheat" || s.step === "bake"))
    s.timer = startTimer(s.timer, now);
  else if (action === "pause") s.timer = pauseTimer(s.timer, now);
  else if (
    action === "restart" &&
    (s.step === "preheat" || s.step === "bake")
  ) {
    s.timer = freshTimer(
      s.step === "preheat"
        ? s.settings.preheatMinutes * 60
        : s.settings.bakeSeconds,
    );
    s.turns = 0;
    s.lastTurnMs = 0;
  } else if (action === "ready" && s.step === "preheat") {
    s.step = "prepare";
    s.timer = freshTimer(s.settings.bakeSeconds);
  } else if (action === "launch" && s.step === "prepare") {
    s.step = "bake";
    s.timer = startTimer(freshTimer(s.settings.bakeSeconds), now);
    s.turns = 0;
    s.lastTurnMs = 0;
  } else if (action === "check" && s.step === "bake") {
    s.step = "check";
    s.timer = pauseTimer(s.timer, now);
  } else if (action === "continue" && s.step === "check") {
    s.step = "bake";
    s.timer = startTimer(s.timer, now);
  } else if (action === "turn" && s.step === "bake") {
    s.turns++;
    s.lastTurnMs = elapsed(s.timer, now);
  } else if (action === "done" && s.step === "check") {
    s.completed.push({
      name: s.pizzas[s.completed.length],
      seconds: elapsed(s.timer, now) / 1000,
      finishedAt: new Date(now).toISOString(),
      settings: structuredClone(s.settings),
    });
    s.step = s.completed.length === s.pizzas.length ? "complete" : "prepare";
    s.timer = freshTimer(s.settings.bakeSeconds);
    s.turns = 0;
    s.lastTurnMs = 0;
  } else
    throw Error("Dieser Schritt ist im aktuellen Backmodus nicht möglich.");
  return s;
}
export function coachHint(s: CoachSession) {
  const device =
    s.plan.oven === "pizza"
      ? "Pizzaofen: auf einseitige Flammenhitze achten; nach dem Anbacken regelmäßig drehen."
      : s.plan.oven === "home"
        ? "Haushaltsbackofen: Stein vollständig durchheizen, Einschubhöhe an die Bräunung anpassen."
        : "Grill: Stein indirekt erhitzen, Deckel möglichst geschlossen halten und Hotspots beobachten.";
  return `${device} ${s.plan.style === "napoletana" ? "Neapolitanisch: kurzer Backvorgang, Rand und Boden laufend beobachten." : s.plan.style === "new-york" ? "New York: bei moderaterer Hitze bis zum stabilen, faltbaren Boden backen." : s.plan.style === "roman" ? "Römisch: dünne Mitte und trockenen, knusprigen Boden prüfen." : "Eigener Stil: mit einer Testpizza beginnen und Zeit nach Sicht anpassen."}`;
}
export function clockLabel(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
