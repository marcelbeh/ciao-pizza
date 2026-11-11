import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import { createIndexedDbStore } from '../infrastructure/storage/indexedDbStore';
import { createFornoRepository } from '../infrastructure/storage/fornoRepository';
import { createSchedule, createTeichnerSchedule } from '../core/schedule/plan';
import { defaults } from '../core/dough/forno';
import { MATURITY_KEY } from '../infrastructure/storage/maturityRepository';
import { activeMonitor, newMonitor } from '../core/maturity/model';
vi.mock('../infrastructure/pwa/PwaNotice',()=>({PwaNotice:({busy}:{busy:boolean})=><span data-testid="pwa-state">{busy?'blocked':'ready'}</span>}));
const navigation=(name:string)=>within(screen.getByRole('navigation',{name:'Hauptnavigation'})).getByRole('link',{name});
async function setup(withSchedule=true){const db=createIndexedDbStore(`p4-ui-${crypto.randomUUID()}`);const repo=createFornoRepository(db);await db.set('forno:pizza-night:v1',{version:1,recipes:[],evening:null});await repo.save(defaults);if(withSchedule){const initial=createSchedule();await repo.saveSchedule(createTeichnerSchedule(initial.bakeAt,initial));}return {db,repo};}
beforeEach(()=>{window.location.hash='#/reife-monitor';vi.spyOn(window,'confirm').mockReturnValue(true);});
describe('P4 UI and shared TM5 temperature',()=>{
  it('starts from the saved formula/schedule, records the temperature once in TM5 and restores it in the monitor',async()=>{
    const {db,repo}=await setup();window.location.hash='#/teig';const view=render(<App repo={repo}/>);
    const panel=await screen.findByRole('region',{name:'Thermomix-Chargen'});fireEvent.click(within(panel).getByText('TM5-Rezeptansicht (optional)'));
    expect(within(panel).getByText('Mehl und Wasser mischen')).toBeVisible();expect(within(panel).getByText('Autolyse · 30 Minuten')).toBeVisible();
    expect(within(panel).getByText(/Das gesamte Wasser/)).toBeVisible();expect(within(panel).getByText(/keine validierte TM5-Maximalmenge/)).toBeVisible();
    fireEvent.click(within(panel).getByRole('button',{name:'Reifemonitor starten'}));await screen.findByText('Monitor-Planung lokal gespeichert.');
    fireEvent.click(screen.getByRole('button',{name:'Temperaturen erfassen / korrigieren'}));
    fireEvent.change(screen.getByLabelText('Teigtemperatur nach dem Kneten (°C)'),{target:{value:'23,5'}});
    fireEvent.change(screen.getByLabelText('Gemessene Raumtemperatur als Basis (°C)'),{target:{value:'22'}});
    expect(screen.getByRole('textbox',{name:/Pizzaanzahl/})).toBeDisabled();
    fireEvent.click(screen.getByRole('button',{name:'Dunkel'}));expect(screen.getByLabelText('Teigtemperatur nach dem Kneten (°C)')).toHaveValue('23,5');
    fireEvent.click(screen.getByRole('button',{name:'Temperaturen speichern'}));await screen.findByText('Temperaturen im aktiven Reifemonitor gespeichert.');
    expect(activeMonitor((await repo.maturity.load()).maturity)?.conditions.doughC).toBe(23.5);
    fireEvent.click(navigation('Home'));fireEvent.click(await screen.findByRole('link',{name:/Reife-Monitor/}));
    expect(await screen.findByText('23,5 °C')).toBeVisible();expect(screen.queryByLabelText('Teigtemperatur nach dem Kneten (°C)')).not.toBeInTheDocument();
    view.unmount();render(<App repo={createFornoRepository(db)}/>);expect(await screen.findByText('23,5 °C')).toBeVisible();
  });
  it('records, skips and corrects optional checks without touching the schedule',async()=>{
    const {db,repo}=await setup();const before=(await repo.load()).schedule;render(<App repo={repo}/>);
    fireEvent.click(await screen.findByRole('button',{name:'Reifemonitor starten'}));await screen.findByText('Monitor-Planung lokal gespeichert.');
    fireEvent.click(screen.getAllByRole('button',{name:'Check öffnen oder überspringen'})[0]);
    fireEvent.click(screen.getByRole('button',{name:'Check überspringen'}));await screen.findByText('Check lokal gespeichert.');
    expect(activeMonitor((await repo.maturity.load()).maturity)?.checks[0].skipped).toBe(true);
    fireEvent.click(screen.getByRole('button',{name:'Check korrigieren'}));
    fireEvent.change(screen.getByLabelText('Volumenzunahme'),{target:{value:'clear'}});fireEvent.change(screen.getByLabelText('Oberfläche'),{target:{value:'bubbles'}});
    fireEvent.click(screen.getByRole('button',{name:'Check speichern'}));await screen.findByText('Check lokal gespeichert.');
    expect(activeMonitor((await repo.maturity.load()).maturity)?.checks[0]).toMatchObject({skipped:false,volume:'clear',surface:'bubbles'});
    expect((await repo.load()).schedule).toEqual(before);expect(await db.get('forno:schedule:v1')).toEqual(before);
  });
  it('keeps failed temperature drafts, blocks updates/navigation and reports success only after commit',async()=>{
    const {db,repo}=await setup();const source=await repo.load();await repo.maturity.activate(newMonitor(source.formula,source.schedule!),null);
    render(<App repo={repo}/>);fireEvent.click(await screen.findByRole('button',{name:'Temperaturen erfassen / korrigieren'}));
    fireEvent.change(screen.getByLabelText('Teigtemperatur nach dem Kneten (°C)'),{target:{value:'25'}});
    vi.spyOn(db,'update').mockRejectedValueOnce(Error('Storage full'));fireEvent.click(screen.getByRole('button',{name:'Temperaturen speichern'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nicht gespeichert');expect(screen.getByLabelText('Teigtemperatur nach dem Kneten (°C)')).toHaveValue('25');
    expect(screen.getByTestId('pwa-state')).toHaveTextContent('blocked');
    vi.mocked(window.confirm).mockReturnValueOnce(false);fireEvent.click(navigation('Home'));expect(screen.getByLabelText('Teigtemperatur nach dem Kneten (°C)')).toHaveValue('25');
    fireEvent.click(screen.getByRole('button',{name:'Temperaturen speichern'}));await screen.findByText('Temperaturen im aktiven Reifemonitor gespeichert.');
    await waitFor(()=>expect(screen.getByTestId('pwa-state')).toHaveTextContent('ready'));
  });
  it('corrects temperature changes and retains a saved monitor snapshot when the calculator changes',async()=>{
    const {repo}=await setup();const source=await repo.load();await repo.maturity.activate(newMonitor(source.formula,source.schedule!),null);
    render(<App repo={repo}/>);fireEvent.click(await screen.findByRole('button',{name:'Temperaturänderung erfassen'}));
    fireEvent.change(screen.getByLabelText('Gemessen an'),{target:{value:'fridge'}});fireEvent.change(screen.getByLabelText('Neue Temperatur (°C)'),{target:{value:'7'}});
    fireEvent.click(screen.getByRole('button',{name:'Änderung speichern'}));await screen.findByText('Temperaturänderung lokal gespeichert.');
    fireEvent.click(screen.getByRole('button',{name:'Korrigieren'}));fireEvent.change(screen.getByLabelText('Neue Temperatur (°C)'),{target:{value:'5'}});
    fireEvent.click(screen.getByRole('button',{name:'Änderung speichern'}));await screen.findByText('Temperaturänderung lokal gespeichert.');
    fireEvent.click(navigation('Teig'));fireEvent.change(await screen.findByRole('textbox',{name:/Pizzaanzahl/}),{target:{value:'10'}});
    fireEvent.click(navigation('Home'));fireEvent.click(await screen.findByRole('link',{name:/Reife-Monitor/}));
    expect(await screen.findByText(/Rechner oder Zeitplan wurden geändert/)).toBeVisible();
    const old=activeMonitor((await repo.maturity.load()).maturity)!;expect(old.formula.count).toBe(8);expect(old.temperatures[0].celsius).toBe(5);
    fireEvent.click(screen.getByRole('button',{name:'Aktuelle Planung übernehmen'}));await screen.findByText('Monitor-Planung lokal gespeichert.');
    const state=(await repo.maturity.load()).maturity!;expect(state.plans).toHaveLength(2);expect(state.plans[0].temperatures[0].celsius).toBe(5);expect(activeMonitor(state)?.formula.count).toBe(10);
  });
  it('has no pretend forecast without a plan and isolates corrupt P4 data from calculator, schedule and backup',async()=>{
    const {db,repo}=await setup(false);render(<App repo={repo}/>);
    expect(await screen.findByText(/Lege zuerst einen Backtermin/)).toBeVisible();expect(screen.getByRole('button',{name:'Reifemonitor starten'})).toBeDisabled();expect(await db.get(MATURITY_KEY)).toBeUndefined();
    fireEvent.click(navigation('Teig'));expect(await screen.findByRole('textbox',{name:/Pizzaanzahl/})).toBeVisible();
  });
  it('rejects unknown P4 versions without blocking other areas or raw backup',async()=>{
    const {db,repo}=await setup();const raw={version:99,future:true};await db.set(MATURITY_KEY,raw);render(<App repo={repo}/>);
    expect(await screen.findByRole('alert')).toHaveTextContent('unbekannte');expect(screen.getByRole('button',{name:'Reifemonitor starten'})).toBeDisabled();
    fireEvent.click(navigation('Teig'));expect(await screen.findByRole('textbox',{name:/Pizzaanzahl/})).toBeVisible();
    expect((await repo.backup()).entries[MATURITY_KEY]).toEqual(raw);
  });
  it('persists an explicitly changed autolyse pause without changing the recipe or time plan',async()=>{
    const {db,repo}=await setup();const before=await db.entries!();window.location.hash='#/teig';render(<App repo={repo}/>);
    const card=await screen.findByRole('region',{name:'Thermomix-Chargen'});fireEvent.click(within(card).getByText('TM5-Rezeptansicht (optional)'));
    fireEvent.click(within(card).getByRole('button',{name:'Autolyse anpassen'}));fireEvent.change(screen.getByLabelText('Autolyse (Minuten)'),{target:{value:'45'}});
    fireEvent.click(screen.getByRole('button',{name:'Autolyse speichern'}));await screen.findByText('Autolyse · 45 Minuten');
    expect(await db.entries!()).toEqual({...before,[MATURITY_KEY]:{version:1,modelVersion:1,activeId:null,plans:[],autolyseMinutes:45}});
  });
});
