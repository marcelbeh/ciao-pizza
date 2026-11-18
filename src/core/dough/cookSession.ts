import { calculateFormula, formulaIssues, type Formula } from './forno';
import { recipeSnapshot } from '../maturity/model';
import { tm5Recipe } from './tm5';
export interface CookSession {
  version: 1; id: string; createdAt: string; formula: Formula; autolyseMinutes: number;
  step: number; batch: number; completed: boolean;
  timer: { endAt: number | null; remainingMs: number };
}
export function createCookSession(formula: Formula, autolyseMinutes: number): CookSession {
  const state: CookSession = { version: 1, id: crypto.randomUUID(), createdAt: new Date().toISOString(),
    formula: recipeSnapshot(formula), autolyseMinutes, step: 0, batch: 0, completed: false,
    timer: { endAt: null, remainingMs: autolyseMinutes * 60000 } };
  assertCookSession(state); return state;
}
export function assertCookSession(value: unknown): asserts value is CookSession {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Unbekannter Kochfortschritt.');
  const s = value as CookSession;
  const keys = ['version','id','createdAt','formula','autolyseMinutes','step','batch','completed','timer'];
  if (Object.keys(s).length !== keys.length || keys.some(key => !Object.hasOwn(s, key)) || s.version !== 1 || typeof s.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(s.id) || typeof s.createdAt !== 'string' || !Number.isFinite(Date.parse(s.createdAt)) || new Date(s.createdAt).toISOString() !== s.createdAt || !s.formula || Object.keys(formulaIssues(s.formula)).length) throw Error('Ungültiger Kochfortschritt.');
  const recipe = tm5Recipe(calculateFormula(s.formula).ingredients, s.autolyseMinutes);
  if (JSON.stringify(s.formula) !== JSON.stringify(recipeSnapshot(s.formula)) || !Number.isInteger(s.step) || s.step < 0 || s.step > 7 || !Number.isInteger(s.batch) || s.batch < 0 || s.batch >= recipe.count || typeof s.completed !== 'boolean' || (s.completed && (s.step !== 7 || s.batch !== recipe.count - 1)) || !s.timer || typeof s.timer !== 'object' || Array.isArray(s.timer) || Object.keys(s.timer).length !== 2 || !Object.hasOwn(s.timer, 'endAt') || !Object.hasOwn(s.timer, 'remainingMs') || !Number.isFinite(s.timer.remainingMs) || s.timer.remainingMs < 0 || s.timer.remainingMs > s.autolyseMinutes * 60000 || (s.timer.endAt !== null && (!Number.isSafeInteger(s.timer.endAt) || s.timer.endAt <= 0 || s.step !== 2 || s.completed))) throw Error('Ungültige Kochposition oder Timerdaten.');
}
export function timerRemaining(session: CookSession, now: number) {
  return session.timer.endAt === null ? session.timer.remainingMs : Math.max(0, Math.min(session.autolyseMinutes * 60000, session.timer.endAt - now));
}
export function cookPosition(session: CookSession, step: number, batch = session.batch): CookSession {
  const next = { ...session, step, batch, completed: false,
    timer: step === 2 && session.step === 2 && batch === session.batch ? session.timer : { endAt: null, remainingMs: session.autolyseMinutes * 60000 } };
  assertCookSession(next); return next;
}
