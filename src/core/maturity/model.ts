import { calculateFormula, formulaIssues, type Formula } from '../dough/forno';
import { assertSchedule, type SchedulePlan } from '../schedule/plan';
export const MATURITY_MODEL_VERSION = 1;
export type YeastKind = 'instant' | 'fresh';
export type CheckSlot = 'bulk' | 'piece' | 'bake';
export type Volume = 'little' | 'slight' | 'clear' | 'double';
export type Surface = 'tense' | 'bubbles' | 'collapsed';
export type Elasticity = 'fast' | 'slow' | 'soft';
export interface Conditions { doughC: number | null; doughAt: string | null; roomC: number | null; fridgeC: number | null }
export interface TemperatureEvent { id: string; at: string; kind: 'room' | 'fridge' | 'dough'; celsius: number }
export interface DoughCheck { id: string; slot: CheckSlot; at: string; skipped: boolean; volume: Volume | null; surface: Surface | null; elasticity: Elasticity | null }
export interface MonitorPlan {
  id: string; createdAt: string; updatedAt: string; modelVersion: 1;
  formula: Formula; schedule: SchedulePlan; yeastKind: YeastKind; yeastGrams: number;
  conditions: Conditions; temperatures: TemperatureEvent[]; checks: DoughCheck[];
}
export interface MaturityState { version: 1; modelVersion: 1; activeId: string | null; plans: MonitorPlan[]; autolyseMinutes: number }
export const emptyMaturity = (): MaturityState => ({ version: 1, modelVersion: 1, activeId: null, plans: [], autolyseMinutes: 30 });
export const activeMonitor = (state: MaturityState | null) => state?.plans.find(plan => plan.id === state.activeId) ?? null;
export function recipeSnapshot(formula: Formula): Formula {
  return { count: formula.count, ballGrams: formula.ballGrams, hydration: formula.hydration,
    salt: formula.salt, yeastPercent: formula.yeastPercent, flourProfile: formula.flourProfile };
}
export function newMonitor(formula: Formula, schedule: SchedulePlan, now = new Date().toISOString(), id: string = crypto.randomUUID()): MonitorPlan {
  if (Object.keys(formulaIssues(formula)).length) throw Error('Ungültige Rezeptur.'); assertSchedule(schedule);
  const plan: MonitorPlan = { id, createdAt: now, updatedAt: now, modelVersion: 1,
    formula: recipeSnapshot(formula), schedule: structuredClone(schedule), yeastKind: 'instant', yeastGrams: calculateFormula(recipeSnapshot(formula)).ingredients.yeast,
    conditions: { doughC: null, doughAt: null, roomC: null, fridgeC: null }, temperatures: [], checks: [] };
  assertMonitor(plan); return plan;
}
function fail(): never { throw Error('Ungültige oder unbekannte Reifemonitor-Daten.'); }
function record(value: unknown, required: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const row = value as Record<string, unknown>;
  if (required.some(key => !Object.hasOwn(row, key)) || Object.keys(row).some(key => !required.includes(key))) fail();
  return row;
}
function id(value: unknown) { if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(value)) fail(); }
export function iso(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) fail();
}
function temperature(value: unknown) { if (typeof value !== 'number' || !Number.isFinite(value) || value < -10 || value > 60) fail(); }
export function assertConditions(value: unknown): asserts value is Conditions {
  const row = record(value, ['doughC', 'doughAt', 'roomC', 'fridgeC']);
  for (const key of ['doughC', 'roomC', 'fridgeC']) if (row[key] !== null) temperature(row[key]);
  if ((row.doughC === null) !== (row.doughAt === null)) fail(); if (row.doughAt !== null) iso(row.doughAt);
}
export function assertTemperatureEvent(value: unknown): asserts value is TemperatureEvent {
  const row = record(value, ['id', 'at', 'kind', 'celsius']); id(row.id); iso(row.at); temperature(row.celsius);
  if (!['room', 'fridge', 'dough'].includes(String(row.kind))) fail();
}
export function assertCheck(value: unknown): asserts value is DoughCheck {
  const row = record(value, ['id', 'slot', 'at', 'skipped', 'volume', 'surface', 'elasticity']); id(row.id); iso(row.at);
  if (!['bulk', 'piece', 'bake'].includes(String(row.slot)) || typeof row.skipped !== 'boolean') fail();
  const choices = { volume: ['little', 'slight', 'clear', 'double'], surface: ['tense', 'bubbles', 'collapsed'], elasticity: ['fast', 'slow', 'soft'] };
  for (const key of ['volume', 'surface', 'elasticity'] as const) if (row[key] !== null && !choices[key].includes(String(row[key]))) fail();
  if (row.skipped ? [row.volume, row.surface, row.elasticity].some(v => v !== null) : [row.volume, row.surface, row.elasticity].every(v => v === null)) fail();
}
export function assertMonitor(value: unknown): asserts value is MonitorPlan {
  const row = record(value, ['id', 'createdAt', 'updatedAt', 'modelVersion', 'formula', 'schedule', 'yeastKind', 'yeastGrams', 'conditions', 'temperatures', 'checks']);
  id(row.id); iso(row.createdAt); iso(row.updatedAt); if (row.updatedAt < row.createdAt || row.modelVersion !== 1) fail();
  record(row.formula, ['count', 'ballGrams', 'hydration', 'salt', 'yeastPercent', 'flourProfile']);
  if (Object.keys(formulaIssues(row.formula as Formula)).length) fail(); assertSchedule(row.schedule);
  if (!['instant', 'fresh'].includes(String(row.yeastKind)) || typeof row.yeastGrams !== 'number' || !Number.isFinite(row.yeastGrams) || row.yeastGrams < 0 || row.yeastGrams > 100000) fail();
  assertConditions(row.conditions);
  if (!Array.isArray(row.temperatures) || row.temperatures.length > 300 || !Array.isArray(row.checks) || row.checks.length > 3) fail();
  const ids = new Set<string>(); const slots = new Set<string>();
  for (const event of row.temperatures) { assertTemperatureEvent(event); if (ids.has(event.id)) fail(); ids.add(event.id); }
  for (const check of row.checks) { assertCheck(check); if (ids.has(check.id) || slots.has(check.slot)) fail(); ids.add(check.id); slots.add(check.slot); }
}
export function assertMaturity(value: unknown): asserts value is MaturityState {
  const row = record(value, ['version', 'modelVersion', 'activeId', 'plans', 'autolyseMinutes']);
  if (row.version !== 1 || row.modelVersion !== 1 || !Number.isInteger(row.autolyseMinutes) || Number(row.autolyseMinutes) < 0 || Number(row.autolyseMinutes) > 240 || !Array.isArray(row.plans) || row.plans.length > 50) fail();
  const ids = new Set<string>();
  for (const plan of row.plans) { assertMonitor(plan); if (ids.has(plan.id)) fail(); ids.add(plan.id); }
  if (row.activeId !== null && (typeof row.activeId !== 'string' || !ids.has(row.activeId))) fail();
  if (row.plans.length && row.activeId === null) fail();
}
