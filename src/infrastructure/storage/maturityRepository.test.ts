import { describe, expect, it, vi } from 'vitest';
import { createIndexedDbStore } from './indexedDbStore';
import { createFornoRepository } from './fornoRepository';
import { createMaturityRepository, MATURITY_KEY } from './maturityRepository';
import { defaults } from '../../core/dough/forno';
import { createSchedule, createTeichnerSchedule } from '../../core/schedule/plan';
import { activeMonitor, emptyMaturity, newMonitor, type DoughCheck } from '../../core/maturity/model';
const store=()=>createIndexedDbStore(`p4-${crypto.randomUUID()}`);
const plan=()=>newMonitor(defaults,createTeichnerSchedule('2027-01-10T18:00:00.000Z',createSchedule()));
describe('P4 isolated atomic local state',()=>{
  it('has no DB migration or write on missing-key load, then restores snapshots and all records',async()=>{
    const db=store();const repo=createMaturityRepository(db);expect((await repo.load()).maturity).toEqual(emptyMaturity());expect(await db.get(MATURITY_KEY)).toBeUndefined();
    const p=plan();await repo.activate(p,null);
    const conditions={doughC:22,doughAt:'2027-01-08T18:00:00.000Z',roomC:22,fridgeC:4};await repo.conditions(p.id,conditions,p.conditions);
    const t={id:'temp-1',kind:'fridge' as const,at:'2027-01-09T10:00:00.000Z',celsius:7};await repo.temperature(p.id,t,null);
    const c:DoughCheck={id:'check',slot:'bulk',at:'2027-01-09T17:30:00.000Z',skipped:true,volume:null,surface:null,elasticity:null};await repo.check(p.id,c,null);
    const loaded=activeMonitor((await createMaturityRepository(db).load()).maturity)!;
    expect(loaded.conditions).toEqual(conditions);expect(loaded.temperatures).toEqual([t]);expect(loaded.checks).toEqual([c]);expect(loaded.formula).toEqual(defaults);
    await repo.temperature(p.id,{...t,celsius:5},t);await repo.check(p.id,{...c,skipped:false,volume:'clear'},c);
    expect(activeMonitor((await repo.load()).maturity)?.checks[0].volume).toBe('clear');
    await repo.autolyse(45);expect((await repo.load()).maturity?.autolyseMinutes).toBe(45);
  });
  it('preserves existing database v1, calculator, schedule, pizza recipes and unknown personal records exactly',async()=>{
    const databaseName=`p4-preserve-${crypto.randomUUID()}`;const db=createIndexedDbStore(databaseName);const before={'forno:calculator:v1':{version:1,formula:defaults},'forno:schedule:v1':createSchedule(),'forno:pizza-night:v1':{version:1,recipes:[],evening:null},'ciao-workspace:v2':{recipes:['personal']},'unknown:archive':{keep:true}};
    for(const [key,value]of Object.entries(before))await db.set(key,value);
    const repo=createMaturityRepository(db);await repo.activate(plan(),null);
    const p4=await db.get(MATURITY_KEY);expect(await db.entries!()).toEqual({...before,[MATURITY_KEY]:p4});
    expect((await createFornoRepository(db).backup()).entries).toEqual(await db.entries!());
    const fallback=createFornoRepository({get:db.get,set:db.set,remove:db.remove});expect((await fallback.backup()).entries[MATURITY_KEY]).toEqual(p4);
    const request=indexedDB.open(databaseName);
    await new Promise<void>((resolve,reject)=>{request.onsuccess=()=>{expect(request.result.version).toBe(1);expect([...request.result.objectStoreNames]).toEqual(['key-value']);request.result.close();resolve()};request.onerror=()=>reject(request.error)});
  });
  it('keeps previous plan snapshots when current formula/schedule are explicitly adopted again',async()=>{
    const db=store();const repo=createMaturityRepository(db);const first=plan();await repo.activate(first,null);
    const next=newMonitor({...defaults,count:10},{...first.schedule,bakeAt:'2027-01-11T18:00:00.000Z'});
    await repo.activate(next,first.id);const state=(await repo.load()).maturity!;
    expect(state.plans).toHaveLength(2);expect(state.plans[0]).toEqual(first);expect(state.activeId).toBe(next.id);
    await expect(repo.conditions(first.id,first.conditions,first.conditions)).rejects.toThrow('inzwischen');
  });
  it.each([{version:99},{...emptyMaturity(),modelVersion:99},{...emptyMaturity(),activeId:'missing'},null])('protects unknown/corrupt P4 %j and permits full backup',async raw=>{
    const db=store();await db.set(MATURITY_KEY,raw);const repo=createMaturityRepository(db);
    expect((await repo.load()).maturityError).toContain('unbekannte');await expect(repo.activate(plan(),null)).rejects.toThrow();
    await expect(repo.autolyse(30)).rejects.toThrow();expect(await db.get(MATURITY_KEY)).toEqual(raw);
    expect((await createFornoRepository(db).backup()).entries[MATURITY_KEY]).toEqual(raw);
  });
  it('preserves drafts/last commit on failure and refuses stale conditions or invalid events',async()=>{
    const db=store();const repo=createMaturityRepository(db);const p=plan();await repo.activate(p,null);
    const value={...p.conditions,roomC:23};await repo.conditions(p.id,value,p.conditions);
    await expect(repo.conditions(p.id,{...value,roomC:25},p.conditions)).rejects.toThrow('inzwischen');
    const before=await db.get(MATURITY_KEY);vi.spyOn(db,'update').mockRejectedValueOnce(Error('QuotaExceededError'));
    await expect(repo.autolyse(45)).rejects.toThrow('Quota');expect(await db.get(MATURITY_KEY)).toEqual(before);
    await expect(repo.temperature(p.id,{id:'bad',kind:'room',at:'not a date',celsius:500},null)).rejects.toThrow();
    await expect(repo.check(p.id,{id:'skip',slot:'bulk',at:new Date().toISOString(),skipped:true,volume:'clear',surface:null,elasticity:null},null)).rejects.toThrow();
    expect(await db.get(MATURITY_KEY)).toEqual(before);
  });
  it('serializes independent changes without losing checks or temperatures',async()=>{
    const db=store();const repo=createMaturityRepository(db);const p=plan();await repo.activate(p,null);
    await Promise.all([repo.temperature(p.id,{id:'temp',kind:'room',at:new Date().toISOString(),celsius:24},null),repo.autolyse(45)]);
    const state=(await repo.load()).maturity!;expect(state.autolyseMinutes).toBe(45);expect(activeMonitor(state)?.temperatures).toHaveLength(1);
  });
});
