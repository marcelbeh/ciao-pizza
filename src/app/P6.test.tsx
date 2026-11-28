import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import { monitorPresentation } from './monitorPresentation';
import { maturityForecast } from '../core/maturity/forecast';
import { defaults } from '../core/dough/forno';
import { createTeichnerSchedule } from '../core/schedule/plan';
import { newMonitor } from '../core/maturity/model';
import { createCookSession, cookPosition } from '../core/dough/cookSession';
import { createIndexedDbStore } from '../infrastructure/storage/indexedDbStore';
import { createFornoRepository } from '../infrastructure/storage/fornoRepository';
vi.mock('../infrastructure/pwa/PwaNotice',()=>({PwaNotice:({busy}:{busy:boolean})=><span data-testid="pwa-state">{busy?'blocked':'ready'}</span>}));
const bake='2026-12-01T20:00:00.000Z';
const schedule=()=>createTeichnerSchedule(bake,{mixMinutes:20,roomC:22,fridgeC:4});
describe('P6 honest display projections',()=>{
  it('uses the unchanged forecast states for all colour signals without estimating a new optimal window',()=>{
    const plan=newMonitor(defaults,schedule());const source=structuredClone(plan);
    for(const [now,tone]of [[Date.parse(bake)-49*3600000,'early'],[Date.parse(bake)-2*3600000,'developing'],[Date.parse(bake)-5*60000,'ready']]as const){const view=monitorPresentation(plan,now);expect(view.tone).toBe(tone);expect(view.forecast).toEqual(maturityForecast(plan,now));expect(view).not.toHaveProperty('readinessPercent')}
    const risk=structuredClone(plan);risk.checks=[{id:'risk',slot:'bake',at:new Date(Date.parse(bake)-6*60000).toISOString(),skipped:false,volume:null,surface:'collapsed',elasticity:'soft'}];expect(monitorPresentation(risk,Date.parse(bake)-5*60000).tone).toBe('caution');expect(plan).toEqual(source);
  });
  it('labels only real past readings and checks, excludes skipped/future observations and never mutates data',()=>{
    const plan=newMonitor(defaults,schedule());const now=Date.parse(bake)-3600000;
    plan.conditions={doughC:22,doughAt:new Date(now-60000).toISOString(),roomC:22,fridgeC:4};
    plan.temperatures=[{id:'old',kind:'dough',celsius:19,at:new Date(now-120000).toISOString()},{id:'future',kind:'dough',celsius:30,at:new Date(now+60000).toISOString()}];
    plan.checks=[{id:'old-check',slot:'bulk',at:new Date(now-120000).toISOString(),skipped:false,volume:'clear',surface:null,elasticity:null},{id:'skip',slot:'piece',at:new Date(now-60000).toISOString(),skipped:true,volume:null,surface:null,elasticity:null},{id:'future-check',slot:'bake',at:new Date(now+60000).toISOString(),skipped:false,volume:'double',surface:null,elasticity:null}];
    const source=structuredClone(plan);const view=monitorPresentation(plan,now);expect(view.lastTemperature?.celsius).toBe(22);expect(view.lastCheck?.id).toBe('old-check');expect(plan).toEqual(source);
    expect(monitorPresentation(newMonitor(defaults,schedule()),now)).toMatchObject({lastTemperature:null,lastCheck:null});
  });
});
async function setup(){const db=createIndexedDbStore(`p6-${crypto.randomUUID()}`);const repo=createFornoRepository(db);await db.set('forno:pizza-night:v1',{version:1,recipes:[],evening:null});await repo.save(defaults);const plan=createTeichnerSchedule(new Date(Date.now()+2*3600000).toISOString(),{mixMinutes:20,roomC:22,fridgeC:4});await repo.saveSchedule(plan);const monitor=newMonitor(defaults,plan);monitor.conditions={doughC:22,doughAt:new Date(Date.now()-120000).toISOString(),roomC:22,fridgeC:4};monitor.temperatures=[{id:'later',kind:'dough',celsius:24,at:new Date(Date.now()-60000).toISOString()}];await repo.maturity.activate(monitor,null);return{db,repo};}
beforeEach(()=>{window.location.hash='#/reife-monitor?legacy=1';vi.spyOn(window,'confirm').mockReturnValue(true)});
describe('P6 monitor and guided cooking UI',()=>{
  it('separates stored observations, planned time and latest temperature, and opens a check without writing',async()=>{
    const {db,repo}=await setup();const before=await db.entries!();render(<App repo={repo}/>);const hero=await screen.findByRole('region',{name:'Reifeeinschätzung'});
    expect(within(hero).getByText('24 °C')).toBeVisible();expect(within(hero).getByText('Geplant verarbeiten')).toBeVisible();expect(within(hero).getByText(/Noch kein beobachteter Check/)).toBeVisible();expect(within(hero).getByRole('progressbar',{name:'Zeitlicher Phasenfortschritt'})).toBeInTheDocument();expect(hero.querySelector('.phase-dial')).not.toHaveTextContent('%');expect(await db.entries!()).toEqual(before);
  });
  it('opens the next check directly, retains PWA protection and keeps all data unchanged on cancel/theme change',async()=>{
    const {db,repo}=await setup();const before=await db.entries!();render(<App repo={repo}/>);fireEvent.click(await screen.findByRole('button',{name:'Nächsten Teig-Check öffnen'}));expect(await screen.findByRole('form',{name:'Freiwilliger Teig-Check'})).toBeVisible();
    fireEvent.click(screen.getByRole('button',{name:'Dunkel'}));expect(screen.getByRole('form',{name:'Freiwilliger Teig-Check'})).toBeVisible();expect(screen.getByTestId('pwa-state')).toHaveTextContent('blocked');fireEvent.click(screen.getByRole('button',{name:'Abbrechen'}));await waitFor(()=>expect(screen.getByTestId('pwa-state')).toHaveTextContent('ready'));expect(await db.entries!()).toEqual(before);
  });
  it('exposes only verified knead-mode facts and clearly marks missing time/speed settings',async()=>{
    const {db,repo}=await setup();const session=cookPosition(createCookSession(defaults,30),5);await repo.cook.save(session,null);const before=await db.entries!();window.location.hash='#/teig?legacy=1';render(<App repo={repo}/>);fireEvent.click(await screen.findByText('TM5-Rezeptansicht (optional)'));fireEvent.click(screen.getByRole('button',{name:'Kochmodus fortsetzen'}));
    expect(screen.getByText('Automatischer Wechsel')).toBeVisible();expect(screen.getByText('Nicht bestätigt')).toBeVisible();expect(screen.getByRole('progressbar',{name:'Position im Kochrezept'})).toHaveAttribute('aria-valuenow','6');expect(await db.entries!()).toEqual(before);
  });
});
