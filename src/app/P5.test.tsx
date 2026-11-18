import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import { createIndexedDbStore } from '../infrastructure/storage/indexedDbStore';
import { createFornoRepository } from '../infrastructure/storage/fornoRepository';
import { SCHEDULE_KEY } from '../infrastructure/storage/scheduleRepository';
import { createCookSession, cookPosition } from '../core/dough/cookSession';
import { COOK_KEY } from '../infrastructure/storage/cookRepository';
import { createSchedule, createTeichnerSchedule } from '../core/schedule/plan';
import { defaults } from '../core/dough/forno';
import { activeMonitor, newMonitor } from '../core/maturity/model';
vi.mock('../infrastructure/pwa/PwaNotice',()=>({PwaNotice:({busy}:{busy:boolean})=><span data-testid="pwa-state">{busy?'blocked':'ready'}</span>}));
async function setup(legacy=false){const db=createIndexedDbStore(`p5-ui-${crypto.randomUUID()}`);const repo=createFornoRepository(db);await db.set('forno:pizza-night:v1',{version:1,recipes:[],evening:null});await repo.save(defaults);const base=createSchedule();const plan=legacy?base:createTeichnerSchedule(base.bakeAt,base);await repo.saveSchedule(plan);await repo.maturity.activate(newMonitor(defaults,plan),null);return {db,repo,plan};}
const nav=(name:string)=>within(screen.getByRole('navigation',{name:'Hauptnavigation'})).getByRole('link',{name});
async function openCook(){fireEvent.click(await screen.findByText('TM5-Rezeptansicht (optional)',{exact:true}));fireEvent.click(screen.getByRole('button',{name:'Kochmodus starten'}));await screen.findByRole('heading',{name:'Vorbereitung und Wassertemperatur'});}
async function next(heading:string){fireEvent.click(screen.getByRole('button',{name:'Weiter'}));await screen.findByRole('heading',{name:heading});}
beforeEach(()=>{window.location.hash='#/teig';vi.spyOn(window,'confirm').mockReturnValue(true)});
describe('P5 safe schedule deletion UI',()=>{
  it.each([false,true])('requires confirmation, clears dashboard/P2 and pauses but retains the monitor (legacy=%s)',async legacy=>{
    const {db,repo,plan}=await setup(legacy);const before=await db.entries!();window.location.hash='#/zeitplan';const view=render(<App repo={repo}/>);
    const button=await screen.findByRole('button',{name:'Backtermin löschen'});vi.mocked(window.confirm).mockReturnValueOnce(false);fireEvent.click(button);expect(await db.entries!()).toEqual(before);
    fireEvent.click(button);await screen.findByRole('heading',{name:'Kein Backtermin gespeichert'});expect(screen.queryByRole('list',{name:'Zeitstrahl nach Tagen'})).not.toBeInTheDocument();expect(await db.get(SCHEDULE_KEY)).toBeUndefined();
    const expected={...before};delete expected[SCHEDULE_KEY];expect(await db.entries!()).toEqual(expected);
    fireEvent.click(nav('Home'));expect(await screen.findByRole('link',{name:'Backtermin planen'})).toBeVisible();expect(screen.getByText('Reife: Monitor pausiert')).toBeVisible();
    fireEvent.click(screen.getByRole('link',{name:'Reife-Monitor'}));expect(await screen.findByRole('heading',{name:'Monitor pausiert'})).toBeVisible();expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();expect(activeMonitor((await repo.maturity.load()).maturity)?.schedule).toEqual(plan);
    view.unmount();render(<App repo={createFornoRepository(db)}/>);expect(await screen.findByRole('heading',{name:'Monitor pausiert'})).toBeVisible();
  });
  it('keeps the saved plan and draft when deletion fails; retry succeeds and a fresh plan can be created',async()=>{
    const {db,repo,plan}=await setup();window.location.hash='#/zeitplan';render(<App repo={repo}/>);const field=await screen.findByLabelText('Backdatum und Uhrzeit');fireEvent.change(field,{target:{value:'2027-01-10T20:00'}});
    vi.spyOn(db,'compareAndRemove').mockRejectedValueOnce(Error('Disk failure'));fireEvent.click(screen.getByRole('button',{name:'Backtermin löschen'}));expect(await screen.findByRole('alert')).toHaveTextContent('Nicht gelöscht');expect(field).toHaveValue('2027-01-10T20:00');expect(await db.get(SCHEDULE_KEY)).toEqual(plan);
    fireEvent.click(screen.getByRole('button',{name:'Backtermin löschen'}));await screen.findByRole('heading',{name:'Kein Backtermin gespeichert'});fireEvent.click(screen.getByRole('button',{name:'Backtermin planen'}));fireEvent.click(screen.getByRole('button',{name:'Zeitplan speichern'}));await screen.findByText('Zeitplan auf diesem Gerät gespeichert.');expect(await db.get(SCHEDULE_KEY)).toBeDefined();
  });
  it('pauses a monitor for a changed P2 plan until conscious adoption; unknown P2 data cannot be deleted',async()=>{
    const {db,repo,plan}=await setup();await repo.saveSchedule({...plan,roomC:23});window.location.hash='#/reife-monitor';const view=render(<App repo={repo}/>);expect(await screen.findByRole('heading',{name:'Monitor pausiert'})).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Aktuelle Planung übernehmen'}));await screen.findByRole('region',{name:'Reifeeinschätzung'});view.unmount();
    const unknown={version:99,keep:true};await db.set(SCHEDULE_KEY,unknown);window.location.hash='#/zeitplan';render(<App repo={createFornoRepository(db)}/>);await screen.findByRole('heading',{name:'Zeitplan nicht verfügbar'});expect(screen.queryByRole('button',{name:'Backtermin löschen'})).not.toBeInTheDocument();expect(await db.get(SCHEDULE_KEY)).toEqual(unknown);
  });
});
describe('P5 guided cooking, resuming and timer',()=>{
  it('starts explicitly, shows one phase, navigates back/forward and switches batches without altering recipe/monitor/P2',async()=>{
    const {db,repo}=await setup();const before=await db.entries!();render(<App repo={repo}/>);await openCook();await next('Mehl und Wasser mischen');expect(screen.getByText('Mehl je Charge')).toBeVisible();
    fireEvent.click(screen.getByRole('button',{name:'Zurück'}));await screen.findByRole('heading',{name:'Vorbereitung und Wassertemperatur'});fireEvent.change(screen.getByLabelText('Charge wechseln'),{target:{value:'1'}});await waitFor(()=>expect(screen.getByText('Charge 2 / 4')).toBeVisible());
    fireEvent.click(screen.getByRole('button',{name:'Kochmodus schließen'}));fireEvent.click(screen.getByRole('button',{name:'Kochmodus fortsetzen'}));expect(screen.getByText('Charge 2 / 4')).toBeVisible();const after=await db.entries!();expect(after).toEqual({...before,[COOK_KEY]:after[COOK_KEY]});
  });
  it('restores a running autolyse deadline after reload, pauses/resets it, and does not auto-advance',async()=>{
    const {repo}=await setup();const t=Date.now();const date=vi.spyOn(Date,'now').mockReturnValue(t);const view=render(<App repo={repo}/>);await openCook();await next('Mehl und Wasser mischen');await next('Autolyse');fireEvent.click(screen.getByRole('button',{name:'Timer starten'}));await screen.findByRole('button',{name:'Timer pausieren'});view.unmount();date.mockReturnValue(t+120000);
    render(<App repo={repo}/>);fireEvent.click(await screen.findByText('TM5-Rezeptansicht (optional)',{exact:true}));fireEvent.click(screen.getByRole('button',{name:'Kochmodus fortsetzen'}));expect(await screen.findByRole('timer')).toHaveTextContent('28:00');fireEvent.click(screen.getByRole('button',{name:'Timer pausieren'}));await screen.findByRole('button',{name:'Timer starten'});expect((await repo.cook.load()).cookSession?.timer.endAt).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Timer zurücksetzen'}));await waitFor(()=>expect(screen.getByRole('timer')).toHaveTextContent('30:00'));expect(screen.getByRole('heading',{name:'Autolyse'})).toBeVisible();
  });
  it('keeps the committed step on storage failure and resumes the frozen recipe after calculator edits',async()=>{
    const {db,repo}=await setup();render(<App repo={repo}/>);await openCook();vi.spyOn(db,'update').mockRejectedValueOnce(Error('Full'));fireEvent.click(screen.getByRole('button',{name:'Weiter'}));expect(await screen.findByRole('alert')).toHaveTextContent('Nicht gespeichert');expect(screen.getByRole('heading',{name:'Vorbereitung und Wassertemperatur'})).toBeVisible();await next('Mehl und Wasser mischen');
    fireEvent.change(screen.getByRole('textbox',{name:/Pizzaanzahl/}),{target:{value:'10'}});expect(await screen.findByText(/Dieser Kochmodus bleibt/)).toBeVisible();expect((await repo.cook.load()).cookSession?.formula.count).toBe(8);
    fireEvent.click(screen.getByRole('button',{name:'Kochmodus schließen'}));vi.mocked(window.confirm).mockReturnValueOnce(false);fireEvent.click(screen.getByRole('button',{name:'Kochmodus neu starten'}));expect((await repo.cook.load()).cookSession?.formula.count).toBe(8);fireEvent.click(screen.getByRole('button',{name:'Kochmodus neu starten'}));await screen.findByRole('heading',{name:'Vorbereitung und Wassertemperatur'});expect((await repo.cook.load()).cookSession?.formula.count).toBe(10);
  });
  it('processes batches before shared temperature/stock phases and explicitly completes without moving the schedule',async()=>{
    const {repo,plan}=await setup();await repo.save({...defaults,count:1});await repo.maturity.activate(newMonitor({...defaults,count:1},plan),(await repo.maturity.load()).maturity!.activeId);render(<App repo={repo}/>);await openCook();
    for(const name of ['Mehl und Wasser mischen','Autolyse','Trockenhefe einarbeiten','Salz einarbeiten','Kontrolliert fertigkneten','Teigtemperatur messen'])await next(name);
    fireEvent.click(screen.getByRole('button',{name:'Temperaturen erfassen / korrigieren'}));fireEvent.change(screen.getByLabelText('Teigtemperatur nach dem Kneten (°C)'),{target:{value:'23'}});fireEvent.click(screen.getByRole('button',{name:'Temperaturen speichern'}));await screen.findByText('Temperaturen im aktiven Reifemonitor gespeichert.');expect(activeMonitor((await repo.maturity.load()).maturity)?.conditions.doughC).toBe(23);await next('Stockgare starten');fireEvent.click(screen.getByRole('button',{name:'Kochmodus abschließen'}));await screen.findByText(/Kochmodus abgeschlossen/);expect((await repo.cook.load()).cookSession?.completed).toBe(true);expect((await repo.load()).schedule).toEqual(plan);
  });
  it('does not overwrite unknown cook data and leaves backup and calculator accessible',async()=>{
    const {db,repo}=await setup();const raw={version:99,retain:true};await db.set(COOK_KEY,raw);render(<App repo={repo}/>);fireEvent.click(await screen.findByText('TM5-Rezeptansicht (optional)',{exact:true}));expect(await screen.findByRole('alert')).toHaveTextContent('Kochfortschritt nicht lesbar');expect(screen.getByRole('button',{name:'Kochmodus starten'})).toBeDisabled();expect((await repo.backup()).entries[COOK_KEY]).toEqual(raw);expect(screen.getByRole('textbox',{name:/Pizzaanzahl/})).toBeEnabled();
  });
});

it('does not delete a newer schedule from another tab and keeps its old displayed draft',async()=>{
  const {db,repo,plan}=await setup();window.location.hash='#/zeitplan';render(<App repo={repo}/>);await screen.findByRole('button',{name:'Backtermin löschen'});const newer={...plan,roomC:24};await repo.saveSchedule(newer);
  fireEvent.click(screen.getByRole('button',{name:'Backtermin löschen'}));expect(await screen.findByRole('alert')).toHaveTextContent('inzwischen');expect(await db.get(SCHEDULE_KEY)).toEqual(newer);expect(screen.queryByRole('heading',{name:'Kein Backtermin gespeichert'})).not.toBeInTheDocument();
});
it('confirms leaving a running timer and moves to the next batch after the six preparation phases',async()=>{
  const {repo}=await setup();render(<App repo={repo}/>);await openCook();await next('Mehl und Wasser mischen');await next('Autolyse');fireEvent.click(screen.getByRole('button',{name:'Timer starten'}));await screen.findByRole('button',{name:'Timer pausieren'});
  vi.mocked(window.confirm).mockReturnValueOnce(false);fireEvent.click(screen.getByRole('button',{name:'Weiter'}));expect(screen.getByRole('heading',{name:'Autolyse'})).toBeVisible();
  await next('Trockenhefe einarbeiten');expect((await repo.cook.load()).cookSession?.timer.endAt).toBeNull();await next('Salz einarbeiten');await next('Kontrolliert fertigkneten');fireEvent.click(screen.getByRole('button',{name:'Nächste Charge'}));await screen.findByRole('heading',{name:'Vorbereitung und Wassertemperatur'});expect(screen.getByText('Charge 2 / 4')).toBeVisible();expect((await repo.cook.load()).cookSession?.step).toBe(0);
});
it('prevents temperature assignment to a different recipe or to a deleted schedule',async()=>{
  const {db,repo,plan}=await setup();const session=cookPosition(createCookSession(defaults,30),6);await repo.cook.save(session,null);await repo.save({...defaults,count:10});const view=render(<App repo={repo}/>);
  fireEvent.click(await screen.findByText('TM5-Rezeptansicht (optional)'));fireEvent.click(screen.getByRole('button',{name:'Kochmodus fortsetzen'}));expect(await screen.findByText(/Temperatur nicht automatisch/)).toBeVisible();expect(screen.queryByRole('button',{name:'Temperaturen erfassen / korrigieren'})).not.toBeInTheDocument();view.unmount();
  await repo.save(defaults);await repo.deleteSchedule(plan);render(<App repo={createFornoRepository(db)}/>);fireEvent.click(await screen.findByText('TM5-Rezeptansicht (optional)'));fireEvent.click(screen.getByRole('button',{name:'Kochmodus fortsetzen'}));const active=screen.getByRole('region',{name:'TM5-Kochmodus'});expect(within(active).getByText(/Lege zuerst einen Backtermin/)).toBeVisible();expect(within(active).getByRole('button',{name:'Aktuelle Planung übernehmen'})).toBeDisabled();
});
it('blocks PWA updates and duplicate cooking actions until storage commits',async()=>{
  const {repo}=await setup();render(<App repo={repo}/>);await openCook();const original=repo.cook.save;let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve});vi.spyOn(repo.cook,'save').mockImplementationOnce(async(next,expected)=>{await gate;return original(next,expected)});
  fireEvent.click(screen.getByRole('button',{name:'Weiter'}));expect(await screen.findByTestId('pwa-state')).toHaveTextContent('blocked');expect(screen.getByRole('button',{name:'Weiter'})).toBeDisabled();expect(screen.getByRole('heading',{name:'Vorbereitung und Wassertemperatur'})).toBeVisible();release();await screen.findByRole('heading',{name:'Mehl und Wasser mischen'});await waitFor(()=>expect(screen.getByTestId('pwa-state')).toHaveTextContent('ready'));
});
