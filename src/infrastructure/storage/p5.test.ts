import { describe, expect, it, vi } from 'vitest';
import { createIndexedDbStore } from './indexedDbStore';
import { createFornoRepository } from './fornoRepository';
import { SCHEDULE_KEY } from './scheduleRepository';
import { COOK_KEY } from './cookRepository';
import { createSchedule, createTeichnerSchedule } from '../../core/schedule/plan';
import { createCookSession, cookPosition, timerRemaining } from '../../core/dough/cookSession';
import { defaults } from '../../core/dough/forno';
import { newMonitor } from '../../core/maturity/model';
const setup = () => { const db = createIndexedDbStore(`p5-${crypto.randomUUID()}`); return { db, repo: createFornoRepository(db) }; };
describe('P5 atomic schedule deletion and preservation', () => {
  it.each([1,2])('deletes only a version %s P2 entry and preserves monitor snapshots and personal data', async version => {
    const {db,repo}=setup();const legacy=createSchedule();const plan=version===1?legacy:createTeichnerSchedule(legacy.bakeAt,legacy);
    await repo.saveSchedule(plan);await repo.save(defaults);await repo.maturity.activate(newMonitor(defaults,plan),null);
    await db.set('forno:pizza-night:v1',{version:1,recipes:[],evening:null});await db.set('unknown:personal',{recipes:['mine']});await db.set('ciao-workspace:v2',{opaque:true});
    const before=await db.entries!();await repo.deleteSchedule(plan);const expected={...before};delete expected[SCHEDULE_KEY];
    expect(await db.entries!()).toEqual(expected);expect((await createFornoRepository(db).load()).schedule).toBeNull();expect((await repo.backup()).entries).toEqual(expected);
  });
  it('rejects stale views, already deleted entries and unknown versions without changing anything',async()=>{
    const {db,repo}=setup();const old=createSchedule();await repo.saveSchedule(old);const newer={...old,roomC:23};await repo.saveSchedule(newer);
    await expect(repo.deleteSchedule(old)).rejects.toThrow('inzwischen');expect(await db.get(SCHEDULE_KEY)).toEqual(newer);
    await repo.deleteSchedule(newer);await expect(repo.deleteSchedule(newer)).rejects.toThrow();
    const unknown={version:99,original:true};await db.set(SCHEDULE_KEY,unknown);await expect(repo.deleteSchedule(old)).rejects.toThrow();expect(await db.get(SCHEDULE_KEY)).toEqual(unknown);
  });
  it('fails closed without atomic support and preserves data on storage rejection',async()=>{
    const {db,repo}=setup();const plan=createSchedule();await repo.saveSchedule(plan);
    const oldStore=createFornoRepository({get:db.get,set:db.set,remove:db.remove});await expect(oldStore.deleteSchedule(plan)).rejects.toThrow('Sicheres');
    vi.spyOn(db,'compareAndRemove').mockRejectedValueOnce(Error('Storage unavailable'));await expect(repo.deleteSchedule(plan)).rejects.toThrow('Storage');expect(await db.get(SCHEDULE_KEY)).toEqual(plan);
  });
});
describe('P5 isolated, versioned cooking progress',()=>{
  it('loads without writes and atomically persists/restores only its own recipe snapshot and progress',async()=>{
    const {db,repo}=setup();await db.set('personal',{untouched:true});expect((await repo.cook.load()).cookSession).toBeNull();expect(await db.get(COOK_KEY)).toBeUndefined();
    const before=await db.entries!();const session=createCookSession(defaults,30);await repo.cook.save(session,null);
    const next=cookPosition(session,1);await repo.cook.save(next,session);expect((await createFornoRepository(db).cook.load()).cookSession).toEqual(next);
    expect(await db.entries!()).toEqual({...before,[COOK_KEY]:next});expect((await repo.backup()).entries[COOK_KEY]).toEqual(next);
    const fallback=createFornoRepository({get:db.get,set:db.set,remove:db.remove});expect((await fallback.backup()).entries[COOK_KEY]).toEqual(next);
  });
  it('preserves unknown/corrupt sessions and rejects stale tabs or mutated recipes',async()=>{
    const {db,repo}=setup();for(const raw of [{version:99},{version:1,step:99}]){await db.set(COOK_KEY,raw);expect((await repo.cook.load()).cookError).toContain('nicht lesbar');await expect(repo.cook.save(createCookSession(defaults,30),null)).rejects.toThrow();expect(await db.get(COOK_KEY)).toEqual(raw)}
    await db.remove(COOK_KEY);const session=createCookSession(defaults,30);await repo.cook.save(session,null);const next=cookPosition(session,1);await repo.cook.save(next,session);
    await expect(repo.cook.save(cookPosition(session,2),session)).rejects.toThrow('inzwischen');
    await expect(repo.cook.save({...next,formula:{...next.formula,count:9}},next)).rejects.toThrow('Kochrezeptur');expect(await db.get(COOK_KEY)).toEqual(next);
  });
  it('keeps the committed step on failure and validates positions, timer and completion',async()=>{
    const {db,repo}=setup();const session=createCookSession(defaults,30);await repo.cook.save(session,null);vi.spyOn(db,'update').mockRejectedValueOnce(Error('Quota'));
    await expect(repo.cook.save(cookPosition(session,1),session)).rejects.toThrow('Quota');expect(await db.get(COOK_KEY)).toEqual(session);
    for(const invalid of [{...session,step:8},{...session,batch:999},{...session,completed:true},{...session,timer:{endAt:Date.now(),remainingMs:6000}}])await expect(repo.cook.save(invalid,session)).rejects.toThrow();
  });
  it('uses absolute deadlines after interruption, clamps elapsed time and resets the timer on a batch change',async()=>{
    const session=cookPosition(createCookSession(defaults,30),2);const now=Date.now();session.timer={endAt:now+30*60000,remainingMs:30*60000};
    expect(timerRemaining(session,now+120000)).toBe(28*60000);expect(timerRemaining(session,now+40*60000)).toBe(0);expect(timerRemaining(session,now-60000)).toBe(30*60000);
    expect(cookPosition(session,0,1).timer).toEqual({endAt:null,remainingMs:30*60000});expect(cookPosition(session,3).timer.endAt).toBeNull();
  });
});
