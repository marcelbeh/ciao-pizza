// Optional external Playwright tooling; no app dependency or access to a user's browser profile.
const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const base=process.env.FORNO_PREVIEW_URL||'http://127.0.0.1:4175/ciao-pizza/';
const output=process.env.FORNO_VISUAL_OUTPUT||path.join(__dirname,'../docs/p4-visual');fs.mkdirSync(output,{recursive:true});
async function storage(page,values){return page.evaluate(values=>new Promise((resolve,reject)=>{const r=indexedDB.open('ciao-pizza',1);r.onsuccess=()=>{const db=r.result;const tx=db.transaction('key-value',values?'readwrite':'readonly');const store=tx.objectStore('key-value');const result={};if(values){for(const [key,value]of Object.entries(values))store.put(value,key)}else{const q=store.openCursor();q.onsuccess=()=>{const c=q.result;if(c){result[c.key]=c.value;c.continue()}}}tx.oncomplete=()=>{db.close();resolve(result)};tx.onerror=()=>reject(tx.error)}}),values)}
const nav=(p,name)=>p.getByRole('navigation',{name:'Hauptnavigation'}).getByRole('link',{name,exact:true}).click();
const noOverflow=async p=>assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
async function capture(p,file){await p.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0)});await p.screenshot({path:path.join(output,file),fullPage:true})}
(async()=>{const browser=await chromium.launch({executablePath:process.env.FORNO_BROWSER_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const report={browser:browser.version(),at:new Date().toISOString(),checks:[]};
for(const width of [390,1280])for(const theme of ['light','dark']){
 const context=await browser.newContext({viewport:{width,height:844},isMobile:width<800,hasTouch:width<800,colorScheme:theme});await context.addInitScript(t=>localStorage.setItem('forno:theme:v1',t),theme);
 const p=await context.newPage();p.setDefaultTimeout(12000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'#/teig',{waitUntil:'networkidle'});await p.getByRole('heading',{name:'Teigrechner',exact:true}).waitFor();
 const formula={count:8,ballGrams:280,hydration:66,salt:3,yeastPercent:.1,flourProfile:'Caputo Pizzeria 00'};
 const schedule={version:2,method:'cold-staged',bakeAt:new Date(Math.floor((Date.now()+26*3600000)/60000)*60000).toISOString(),coldBulkHours:24,coldBallHours:20,acclimationHours:4,mixMinutes:20,preheatMinutes:30,roomC:22,fridgeC:4};
 await storage(p,{'forno:calculator:v1':{version:1,formula},'forno:schedule:v1':schedule,'archive:personal':{unchanged:true}});await p.reload({waitUntil:'networkidle'});const before=await storage(p);
 await nav(p,'Home');await nav(p,'Teig');
 const card=p.getByRole('region',{name:'Thermomix-Chargen'});await card.getByText('TM5-Rezeptansicht (optional)',{exact:true}).click();
 await card.getByText('Autolyse · 30 Minuten',{exact:true}).waitFor();assert.equal(await card.locator('.tm5-phases > li').count(),8);
 await card.getByRole('button',{name:'Reifemonitor starten',exact:true}).click();await card.getByText('Monitor-Planung lokal gespeichert.',{exact:true}).waitFor();
 await card.getByRole('button',{name:'Temperaturen erfassen / korrigieren',exact:true}).click();
 await p.getByLabel('Teigtemperatur nach dem Kneten (°C)',{exact:true}).fill('22');
 await p.getByLabel('Gemessene Raumtemperatur als Basis (°C)',{exact:true}).fill('22');await p.getByLabel('Gemessene Kühlschranktemperatur als Basis (°C)',{exact:true}).fill('4');
 assert(await p.getByRole('textbox',{name:/Pizzaanzahl/}).isDisabled());
 const dialog=p.waitForEvent('dialog').then(async d=>{assert(d.message().includes('verwerfen'));await d.dismiss()});await p.evaluate(()=>history.back());await dialog;await p.waitForFunction(()=>location.hash==='#/teig'&&history.state.idx===2);
 await p.getByRole('button',{name:'System',exact:true}).click();await p.emulateMedia({colorScheme:theme==='light'?'dark':'light'});await p.waitForFunction(expected=>document.documentElement.dataset.theme===expected,theme==='light'?'dark':'light');
 await p.getByRole('button',{name:theme==='light'?'Hell':'Dunkel',exact:true}).click();assert.equal(await p.getByLabel('Teigtemperatur nach dem Kneten (°C)',{exact:true}).inputValue(),'22');
 await p.getByRole('button',{name:'Temperaturen speichern',exact:true}).click();await p.getByText('Temperaturen im aktiven Reifemonitor gespeichert.',{exact:true}).waitFor();
 await capture(p,`tm5-${theme}-${width}.png`);await noOverflow(p);
 await nav(p,'Home');await p.locator('.maturity-summary').waitFor();await p.locator('.maturity-summary').click();await p.getByRole('heading',{name:'Reife-Monitor',exact:true}).waitFor();
 await p.getByText('22 °C',{exact:true}).first().waitFor();
 await p.getByRole('button',{name:'Temperaturänderung erfassen',exact:true}).click();await p.getByLabel('Gemessen an',{exact:true}).selectOption('fridge');await p.getByLabel('Neue Temperatur (°C)',{exact:true}).fill('6');
 await p.getByRole('button',{name:'Änderung speichern',exact:true}).click();await p.getByText('Temperaturänderung lokal gespeichert.',{exact:true}).waitFor();
 await p.getByRole('button',{name:'Check öffnen oder überspringen',exact:true}).first().click();await p.getByRole('button',{name:'Check überspringen',exact:true}).click();await p.getByText('Check lokal gespeichert.',{exact:true}).waitFor();
 await p.getByRole('button',{name:'Check korrigieren',exact:true}).click();await p.getByLabel('Volumenzunahme',{exact:true}).selectOption('clear');await p.getByLabel('Oberfläche',{exact:true}).selectOption('bubbles');
 await p.getByRole('button',{name:'Check speichern',exact:true}).click();await p.getByText('Check lokal gespeichert.',{exact:true}).waitFor();await noOverflow(p);
 await p.getByText('Warum diese Einschätzung?',{exact:true}).click();await capture(p,`monitor-${theme}-${width}.png`);
 const after=await storage(p);for(const [key,value]of Object.entries(before))assert.deepEqual(after[key],value);assert(after['forno:maturity:v1']);
 const active=after['forno:maturity:v1'].plans[0];assert.equal(active.conditions.doughC,22);assert.equal(active.temperatures[0].celsius,6);assert.equal(active.checks[0].skipped,false);assert.equal(active.checks[0].volume,'clear');
 await p.evaluate(()=>navigator.serviceWorker.ready);await p.reload({waitUntil:'networkidle'});await context.setOffline(true);await p.reload({waitUntil:'networkidle'});await p.getByRole('heading',{name:'Reife-Monitor',exact:true}).waitFor();assert.deepEqual(await storage(p),after);
 await nav(p,'Teig');await p.getByText('TM5-Rezeptansicht (optional)',{exact:true}).click();await p.getByText('22 °C',{exact:true}).first().waitFor();assert.deepEqual(await storage(p),after);
 assert.deepEqual(errors,[]);report.checks.push(`${width}px ${theme}: optional 8-phase TM5 card, single shared temperature, Back discard protection, System/manual themes retain draft, corrections/skipped checks, unchanged P1/P2/P3/archive, offline restore, no overflow or page errors`);
 await context.close();console.log(`PASS ${width}px ${theme}`);
}
fs.writeFileSync(path.join(output,'browser-report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
